import os
import logging
import json
import re
from typing import Optional, Dict, Any, List
import httpx
from fastapi import HTTPException, status
from app.core.config import settings
from app.schemas.ai import AISummaryResponse, AIReplyResponse

logger = logging.getLogger("strawcrm.ai")


import tempfile
import subprocess
import shutil

class AIService:
    @staticmethod
    def clean_text(text: str) -> str:
        """
        Cleans and sanitizes AI text outputs:
        - Fixes mojibake caused by UTF-8 bytes misdecoded as CP1252 / Latin-1 (e.g. â€™ -> ')
        - Normalizes smart quotes and apostrophes to standard ASCII for email safety
        - Strips any redundant 'Subject: ...' header lines from the body
        """
        if not text:
            return ""

        # Mojibake & smart quote normalizations
        replacements = {
            "â€™": "'",
            "â€˜": "'",
            "â€œ": '"',
            "â€\x9d": '"',
            "â€": '"',
            "â€”": "—",
            "â€“": "–",
            "â€¦": "...",
            "Â": "",
            "\u2019": "'",  # Smart apostrophe to standard ASCII apostrophe
            "\u2018": "'",
            "\u201c": '"',
            "\u201d": '"',
            "\u2014": "—",
            "\u2013": "–",
        }
        for bad, good in replacements.items():
            text = text.replace(bad, good)

        # Remove redundant leading Subject line if present in body
        lines = text.strip().splitlines()
        if lines and re.match(r"^Subject\s*:\s*", lines[0], re.IGNORECASE):
            lines = lines[1:]
            while lines and not lines[0].strip():
                lines = lines[1:]
            text = "\n".join(lines)

        return text.strip()

    @classmethod
    def _execute_gemini_prompt(cls, prompt: str) -> str:
        """
        Executes a prompt against Google Gemini API using Gemini 3.5 Flash Lite
        and Gemini Flash models.
        Uses native curl -4 execution with payload file for fast, reliable IPv4 connectivity on Windows,
        with httpx fallback.
        Raises HTTPException on failure so no dummy data is silently returned.
        """
        api_key = (os.getenv("GEMINI_API_KEY") or settings.GEMINI_API_KEY or "").strip()
        if not api_key:
            raise HTTPException(
                status_code=status.HTTP_503_SERVICE_UNAVAILABLE,
                detail="Gemini API key is not configured. Please set GEMINI_API_KEY in .env",
            )

        # Supported Gemini API models
        models_to_try = [
            "gemini-3.6-flash",
            "gemini-3.5-flash-lite",
            "gemini-3.5-flash",
        ]
        last_error = "Unknown error"

        payload = {
            "contents": [{
                "parts": [{"text": prompt}]
            }]
        }

        # Check if curl.exe is available
        curl_bin = shutil.which("curl.exe") or shutil.which("curl")

        if curl_bin:
            with tempfile.NamedTemporaryFile(mode="w", suffix=".json", delete=False, encoding="utf-8") as f:
                json.dump(payload, f)
                temp_path = f.name
            norm_path = temp_path.replace("\\", "/")

            try:
                for model_name in models_to_try:
                    try:
                        url = f"https://generativelanguage.googleapis.com/v1beta/models/{model_name}:generateContent?key={api_key}"
                        args = [
                            curl_bin, "-4", "-s", "-X", "POST", url,
                            "-H", "Content-Type: application/json",
                            "-H", f"X-goog-api-key: {api_key}",
                            "-d", f"@{norm_path}",
                        ]
                        proc = subprocess.run(
                            args,
                            capture_output=True,
                            text=True,
                            encoding="utf-8",
                            errors="replace",
                            timeout=30,
                        )
                        if proc.returncode == 0 and proc.stdout:
                            try:
                                data = json.loads(proc.stdout)
                            except Exception:
                                logger.warning("[Gemini AI] JSON decode failed for model %s: %s", model_name, proc.stdout[:100])
                                continue

                            if "candidates" in data:
                                candidates = data.get("candidates", [])
                                if candidates:
                                    parts = candidates[0].get("content", {}).get("parts", [])
                                    for part in parts:
                                        if "text" in part and part["text"]:
                                            return cls.clean_text(part["text"])
                            elif "error" in data:
                                err_msg = data.get("error", {}).get("message", proc.stdout[:150])
                                logger.warning("[Gemini AI] Model %s returned error: %s", model_name, err_msg)
                                last_error = f"{model_name}: {err_msg}"
                                continue
                    except subprocess.TimeoutExpired:
                        logger.warning("[Gemini AI] Model %s timed out after 30s", model_name)
                        last_error = f"{model_name} timed out"
                        continue
                    except Exception as e:
                        logger.warning("[Gemini AI] Model %s execution failed: %s", model_name, e)
                        last_error = f"{model_name} failed: {str(e)}"
                        continue
            finally:
                if os.path.exists(temp_path):
                    try:
                        os.remove(temp_path)
                    except Exception:
                        pass
        else:
            # Fallback to httpx
            for model_name in models_to_try:
                try:
                    url = f"https://generativelanguage.googleapis.com/v1beta/models/{model_name}:generateContent?key={api_key}"
                    headers = {
                        "Content-Type": "application/json",
                        "X-goog-api-key": api_key,
                    }
                    with httpx.Client(timeout=30.0) as http_client:
                        resp = http_client.post(url, headers=headers, json=payload)
                        if resp.status_code == 200:
                            data = resp.json()
                            candidates = data.get("candidates", [])
                            if candidates:
                                parts = candidates[0].get("content", {}).get("parts", [])
                                for part in parts:
                                    if "text" in part and part["text"]:
                                        return cls.clean_text(part["text"])
                        else:
                            last_error = f"{model_name} returned status {resp.status_code}"
                except Exception as e:
                    last_error = f"{model_name} error: {e}"

        raise HTTPException(
            status_code=status.HTTP_502_BAD_GATEWAY,
            detail=f"Gemini API Error: {last_error}",
        )

    @classmethod
    def generate_summary(cls, ticket: Dict[str, Any]) -> AISummaryResponse:
        """
        Uses Google Gemini API to summarize ticket issues for internal support staff,
        extract key takeaways, and detect customer sentiment.
        """
        ticket_id = ticket.get("ticket_id", "TKT-000")
        subject = str(ticket.get("subject") or "Support Request").strip()
        description = str(ticket.get("description") or "").strip()
        customer_name = str(ticket.get("customer_name") or "Customer").strip()
        status_val = ticket.get("status", "Open")
        notes = ticket.get("notes", []) or []

        notes_text = "\n".join([f"- {n.get('author_name', 'Agent')}: {n.get('note_text', '')}" for n in notes]) if notes else "None"

        prompt = f"""
You are an internal AI Copilot assisting customer support staff and operations agents.
Summarize the customer's inquiry and provide internal triage metadata for the support agent.

Ticket Details:
- Ticket ID: {ticket_id}
- Customer Name: {customer_name}
- Subject: {subject}
- Customer's Reported Issue / Inquiry: {description}
- Current Status: {status_val}
- Internal Agent Notes: {notes_text}

Task:
Analyze this customer inquiry and return a strict JSON object with these keys:
- "summary": A clear 1-2 sentence executive summary of what the customer is experiencing or asking for.
- "key_points": An array of 2 to 3 concise bullet points highlighting key details for the agent.
- "suggested_priority": "Low", "Normal", "High", or "Urgent" (based on severity/urgency).
- "sentiment": "Frustrated", "Neutral", "Urgent", or "Positive" (the customer's emotional state).

Respond ONLY with valid JSON. Do not include markdown code fence outside the JSON block.
"""
        raw_text = cls._execute_gemini_prompt(prompt)

        # Parse JSON output from Gemini
        try:
            cleaned_text = raw_text
            if "```json" in cleaned_text:
                cleaned_text = cleaned_text.split("```json", 1)[1].split("```", 1)[0].strip()
            elif "```" in cleaned_text:
                cleaned_text = cleaned_text.split("```", 1)[1].split("```", 1)[0].strip()

            parsed = json.loads(cleaned_text)
            return AISummaryResponse(
                ticket_id=ticket_id,
                summary=parsed.get("summary", ""),
                key_points=parsed.get("key_points", []),
                suggested_priority=parsed.get("suggested_priority", "Normal"),
                sentiment=parsed.get("sentiment", "Neutral"),
            )
        except Exception as err:
            logger.error("[Gemini AI] Failed to parse JSON from Gemini response: %s\nRaw: %s", err, raw_text)
            raise HTTPException(
                status_code=status.HTTP_502_BAD_GATEWAY,
                detail=f"Gemini API returned malformed JSON: {raw_text[:200]}",
            )

    @classmethod
    def generate_reply(cls, ticket: Dict[str, Any], instructions: Optional[str] = None, tone: str = "friendly") -> AIReplyResponse:
        """
        Drafts a high-accuracy, diagnostic response email from a support agent to the customer using Google Gemini API.
        Trains the model to provide actionable troubleshooting and solutions rather than generic brush-offs.
        Strictly prioritizes agent's custom instructions over default tone guidelines.
        """
        ticket_id = ticket.get("ticket_id", "TKT-000")
        subject = str(ticket.get("subject") or "Support Request").strip()
        description = str(ticket.get("description") or "").strip()
        customer_name = str(ticket.get("customer_name") or "Customer").strip()
        priority = str(ticket.get("priority") or "Normal").capitalize()
        notes = ticket.get("notes", []) or []
        notes_text = (
            "\n".join([f"- {n.get('author_name', 'Agent')}: {n.get('note_text', '')}" for n in notes])
            if notes
            else "None recorded yet."
        )

        tone_guideline = {
            "friendly": "warm, empathetic, approachable, cheerful, and encouraging",
            "professional": "clear, authoritative, solution-oriented, courteous, and reassuring",
            "apologetic": "deeply empathetic, taking accountability for customer frustration, and immediately resolving the blocker"
        }.get((tone or "friendly").lower(), "helpful, clear, and polite")

        custom_guidance_block = ""
        if instructions and instructions.strip():
            custom_guidance_block = f"""
AGENT'S MANDATORY CUSTOM GUIDANCE:
"{instructions.strip()}"
**CRITICAL PRIORITY**: The agent's custom guidance above MUST BE STRICTLY APPLIED to the response. It overrides default tone guidelines if there is a conflict (for example, if the agent specifies an angry, firm, casual, blunt, or urgent attitude, adopt that style directly).
"""

        prompt = f"""
You are an expert Technical Support Operations Specialist drafting an official email reply to a customer.

Context:
- Customer Name: {customer_name}
- Ticket ID: #{ticket_id.lstrip('#')}
- Customer's Subject: {subject}
- Customer's Reported Problem / Inquiry: {description}
- Ticket Priority: {priority}
- Internal Team Notes: {notes_text}
- Tone Setting: {tone} ({tone_guideline})
{custom_guidance_block}

CORE INSTRUCTIONS FOR AN ACCURATE, HIGH-QUALITY RESPONSE:
1. ACCURATE, CONCRETE PROBLEM-SOLVING (NO EMPTY STALLING):
   - NEVER send a lazy, vague brush-off like "We are looking into your request and will follow up shortly".
   - You must provide concrete, actionable technical guidance or diagnostic steps in the very first email.
   - For issue-based inquiries (such as profile save failures, page refresh errors, login troubles, data sync bugs), explain the likely root causes (e.g. browser cache/stale session conflicts, browser extensions/ad-blockers, input validation rules or character restrictions) and provide clear, numbered troubleshooting steps (1, 2, 3).
   - Provide an immediate fallback resolution: if troubleshooting does not work, offer to manually update or resolve it on their behalf if they reply with the necessary details.

2. PERSONAL & EMPATHETIC COMMUNICATION:
   - Begin with a personalized greeting: "Dear {customer_name}," or "Hi {customer_name},".
   - Validate their experience empathetically (e.g. acknowledge that they already tried refreshing and re-logging in, showing you actually read their message).
   - Sign off cleanly as:
Best regards,
Support Operations Team

3. STRICT ENCODING & FORMATTING SAFETY:
   - Do NOT include any "Subject:" line header in your output. Start directly with the greeting.
   - Do NOT use raw markdown asterisks (like **bold**) in the email body; use clean plain text formatting (e.g. "1. Clear Cache & Cookies: ...").
   - Use standard plain ASCII apostrophes (') and quotation marks (") to prevent character encoding issues (no curly apostrophes or smart quotes).
   - Return ONLY the clean, ready-to-send email body. No conversational intro or markdown meta-comments.
"""
        reply_text = cls._execute_gemini_prompt(prompt)
        if not reply_text:
            raise HTTPException(
                status_code=status.HTTP_502_BAD_GATEWAY,
                detail="Gemini API returned an empty response.",
            )

        cleaned_reply = cls.clean_text(reply_text)
        # Strip any markdown bold asterisks so email to customer is clean professional plain text
        cleaned_reply = re.sub(r"\*\*([^*]+)\*\*", r"\1", cleaned_reply)

        return AIReplyResponse(
            ticket_id=ticket_id,
            suggested_reply=cleaned_reply,
            tone=tone,
        )

    @classmethod
    def execute_custom_query(cls, ticket: Dict[str, Any], query: str) -> Dict[str, Any]:
        """
        Executes a targeted custom question, extraction, or analytical query
        regarding a ticket for the internal support agent.
        """
        ticket_id = ticket.get("ticket_id", "TKT-000")
        subject = str(ticket.get("subject") or "Support Request").strip()
        description = str(ticket.get("description") or "").strip()
        customer_name = str(ticket.get("customer_name") or "Customer").strip()
        status_val = ticket.get("status", "Open")
        notes = ticket.get("notes", []) or []
        notes_text = "\n".join([f"- {n.get('author_name', 'Agent')}: {n.get('note_text', '')}" for n in notes]) if notes else "None"

        prompt = f"""
You are an expert AI Support Copilot assisting an internal Customer Support Agent at StrawCRM / Datastraw.
The agent is asking a specific question or requesting an extraction about this support ticket.

TICKET DATA:
- Ticket ID: #{ticket_id}
- Customer Name: {customer_name}
- Subject: {subject}
- Customer Issue / Description: {description}
- Status: {status_val}
- Internal Agent Notes: {notes_text}

AGENT'S REQUEST / QUERY:
"{query.strip()}"

CRITICAL INSTRUCTIONS:
1. Directly answer the agent's request based on the ticket data above.
2. DO NOT write an email or customer greeting like "Dear Customer" or "Thank you for reaching out" unless the agent explicitly commanded "write an email to customer".
3. If the query asks to "Extract customer key demands", "Extract demands", "Summarize requirements", etc.:
   - Provide a clean, structured bulleted list of exactly what the customer is asking for or demanding.
4. If the query asks for "Troubleshooting steps", "Policy explanation", or a factual question about the ticket:
   - Provide clear, direct, actionable advice or facts for the agent.
5. FORMATTING:
   - Provide clear bullet points or numbered lists.
   - Use standard ASCII apostrophes and quotes.
6. Provide a direct, comprehensive, and helpful answer for the support agent. No filler greetings or conversational fluff.
"""
        answer_text = cls._execute_gemini_prompt(prompt)
        if not answer_text:
            raise HTTPException(
                status_code=status.HTTP_502_BAD_GATEWAY,
                detail="Gemini API returned an empty answer for this query.",
            )

        cleaned_answer = cls.clean_text(answer_text)

        return {
            "ticket_id": ticket_id,
            "query": query.strip(),
            "answer": cleaned_answer,
        }


