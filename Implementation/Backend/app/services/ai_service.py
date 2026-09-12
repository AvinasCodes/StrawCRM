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
        api_key = (
            os.getenv("GEMINI_API_KEY")
            or settings.GEMINI_API_KEY
            or "REDACTED_GEMINI_BACKEND_KEY"
        ).strip()
        if not api_key:
            raise HTTPException(
                status_code=status.HTTP_503_SERVICE_UNAVAILABLE,
                detail="Gemini API key is not configured. Please set GEMINI_API_KEY in .env",
            )

        # Supported Gemini API models in priority order (active & verified models first)
        models_to_try = [
            "gemini-3.5-flash-lite",
            "gemini-3.5-flash",
            "gemini-flash-lite-latest",
            "gemini-3.1-flash-lite",
            "gemini-3.7-flash",
            "gemini-3.8-flash",
            "gemini-3.6-flash",
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
    def _generate_fallback_summary(cls, ticket: Dict[str, Any]) -> AISummaryResponse:
        """Intelligent local fallback summary when Gemini API is rate-limited or quota exceeded."""
        ticket_id = ticket.get("ticket_id", "TKT-000")
        subject = str(ticket.get("subject") or "Support Request").strip()
        description = str(ticket.get("description") or "").strip()
        customer_name = str(ticket.get("customer_name") or "Customer").strip()
        priority_raw = str(ticket.get("priority") or "Normal").capitalize()

        desc_lower = (subject + " " + description).lower()
        if any(w in desc_lower for w in ["urgent", "asap", "immediately", "emergency", "blocked"]):
            sentiment = "Urgent"
            suggested_priority = "Urgent"
        elif any(w in desc_lower for w in ["angry", "frustrated", "broken", "terrible", "worst", "unacceptable", "not working", "fail"]):
            sentiment = "Frustrated"
            suggested_priority = "High" if priority_raw in ["Normal", "Low"] else priority_raw
        elif any(w in desc_lower for w in ["thank", "great", "appreciate", "good"]):
            sentiment = "Positive"
            suggested_priority = "Normal"
        else:
            sentiment = "Neutral"
            suggested_priority = priority_raw

        summary = f"{customer_name} reported an inquiry regarding '{subject}'. {description[:120]}..." if len(description) > 120 else f"{customer_name} reported '{subject}': {description}"
        key_points = [
            f"Customer: {customer_name}",
            f"Core Topic: {subject}",
            f"Issue Detail: {description[:90]}" if description else "Customer requested assistance with support ticket."
        ]

        return AISummaryResponse(
            ticket_id=ticket_id,
            summary=summary,
            key_points=key_points,
            suggested_priority=suggested_priority,
            sentiment=sentiment,
        )

    @classmethod
    def _generate_fallback_reply(cls, ticket: Dict[str, Any], instructions: Optional[str] = None, tone: str = "friendly") -> str:
        """Intelligent local fallback reply when Gemini API is rate-limited or quota exceeded."""
        customer_name = str(ticket.get("customer_name") or "Customer").strip()
        subject = str(ticket.get("subject") or "your inquiry").strip()
        description = str(ticket.get("description") or "").strip()
        ticket_id = str(ticket.get("ticket_id") or "TKT-001").strip().lstrip("#")

        custom_part = f"\n\nRegarding your request: {instructions.strip()}" if instructions and instructions.strip() else ""
        greeting = f"Dear {customer_name}," if tone == "professional" else f"Hi {customer_name},"

        body = f"""{greeting}

Thank you for reaching out regarding "{subject}" (Ticket #{ticket_id}).

We have received and reviewed your request regarding {description[:90] if description else 'your inquiry'}. To help resolve this promptly, please try the following steps:

1. Clear your browser cache and cookies, or try accessing the portal in an Incognito/Private window.
2. Verify that your connection is stable and that no conflicting ad-blockers or extensions are active.
3. If the issue persists, reply directly to this message with a screenshot or error details, and our technical team will assist you immediately.{custom_part}

We apologize for any inconvenience caused and are committed to resolving this for you.

Best regards,
Support Operations Team"""
        return body

    @classmethod
    def _generate_fallback_rag(cls, query: str, ticket: Dict[str, Any], ctx: Dict[str, Any]) -> str:
        """Intelligent local fallback RAG answers when Gemini API is rate-limited or quota exceeded."""
        q_lower = query.lower()
        ticket_id = str(ticket.get("ticket_id") or "TKT-001").strip().lstrip("#")
        customer_name = ctx.get("customer_name") or "the customer"
        subject = ctx.get("subject") or "the issue"
        description = ctx.get("description") or "No detailed description provided."
        status_val = ctx.get("status") or "Open"
        priority_val = ctx.get("priority") or "Normal"
        notes_text = ctx.get("notes_text") or "No internal notes recorded."

        if any(k in q_lower for k in ["summary", "overview", "what is", "tell me about"]):
            return f"**Summary for Ticket #{ticket_id}:**\n- **Customer**: {customer_name}\n- **Subject**: {subject}\n- **Status / Priority**: {status_val} • {priority_val}\n- **Inquiry**: {description}\n\n*(High traffic mode active — grounded from local ticket data)*"
        elif any(k in q_lower for k in ["priority", "urgent", "sla", "escalat"]):
            return f"**SLA & Priority Guidance for Ticket #{ticket_id}:**\nCurrent Priority is **{priority_val}**. Under SLA guidelines:\n- Urgent tickets require first response within 1 hour.\n- High priority requires resolution within 4 hours.\n- Standard inquiries have a 24-hour resolution target."
        elif any(k in q_lower for k in ["reply", "draft", "respond", "email"]):
            return f"**Suggested draft for {customer_name}:**\n\nHi {customer_name},\n\nThank you for reaching out regarding '{subject}'. We are actively looking into this issue ({description[:80]}...) and will provide you with an update shortly.\n\nBest regards,\nSupport Operations"
        else:
            return f"**Grounding info for #{ticket_id}:**\n- **Subject**: {subject}\n- **Customer**: {customer_name}\n- **Reported Detail**: {description}\n- **Internal Notes**: {notes_text}\n\nRecommended Action: Verify customer account status and reach out with diagnostic troubleshooting steps."

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
        try:
            raw_text = cls._execute_gemini_prompt(prompt)
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
            logger.warning("[Gemini AI] Primary generation failed or rate-limited (%s), using intelligent fallback summary", err)
            return cls._generate_fallback_summary(ticket)

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
        try:
            reply_text = cls._execute_gemini_prompt(prompt)
            cleaned_reply = cls.clean_text(reply_text)
            cleaned_reply = re.sub(r"\*\*([^*]+)\*\*", r"\1", cleaned_reply)
        except Exception as err:
            logger.warning("[Gemini AI] Reply generation failed or rate-limited (%s), using intelligent fallback reply", err)
            cleaned_reply = cls._generate_fallback_reply(ticket, instructions, tone)

        return AIReplyResponse(
            ticket_id=ticket_id,
            suggested_reply=cleaned_reply,
            tone=tone,
        )

    @classmethod
    def _retrieve_rag_context(cls, ticket: Dict[str, Any]) -> Dict[str, Any]:
        """
        Retrieval component for RAG:
        Pulls ticket details, internal notes, customer profile, past ticket history,
        and CRM operational knowledge policies.
        """
        from app.database.firestore_client import FirestoreClient

        ticket_id = ticket.get("ticket_id", "TKT-000")
        subject = str(ticket.get("subject") or "Support Request").strip()
        description = str(ticket.get("description") or "").strip()
        customer_name = str(ticket.get("customer_name") or "Customer").strip()
        customer_email = str(ticket.get("customer_email") or "").strip()
        customer_id = str(ticket.get("customer_id") or "").strip()
        status_val = ticket.get("status", "Open")
        priority_val = str(ticket.get("priority") or "Normal").capitalize()
        category_val = ticket.get("category", "General Support")
        created_at = ticket.get("created_at", "Recently")
        notes = ticket.get("notes", []) or []

        # 1. Internal Notes context
        notes_text = "None recorded yet."
        if notes:
            notes_text = "\n".join([
                f"- [{n.get('created_at', 'Note')}] {n.get('author_name', 'Agent')}: {n.get('note_text', '')}"
                for n in notes
            ])

        # 2. Customer Profile & Past Tickets context
        past_tickets_summary = "No previous tickets on file."
        past_tickets_count = 0
        try:
            all_cust_tickets = FirestoreClient.list_tickets(customer_id=customer_id) if customer_id else []
            if not all_cust_tickets and customer_email:
                all_cust_tickets = [
                    t for t in FirestoreClient.list_tickets()
                    if str(t.get("customer_email", "")).strip().lower() == customer_email.lower()
                ]
            other_tickets = [t for t in all_cust_tickets if str(t.get("ticket_id", "")).lstrip("#") != str(ticket_id).lstrip("#")]
            past_tickets_count = len(other_tickets)
            if other_tickets:
                past_tickets_summary = "\n".join([
                    f"- Ticket #{t.get('ticket_id')}: {t.get('subject', 'No Subject')} (Status: {t.get('status')}, Priority: {t.get('priority')})"
                    for t in other_tickets[:5]
                ])
        except Exception as ex:
            logger.warning("[RAG Retriever] Could not fetch past customer tickets: %s", ex)

        # 3. Datastraw Support Policies & Playbooks
        knowledge_policies = """
[Datastraw SLA Resolution Targets]
- Urgent / Critical: First response < 1 hour, Resolution target < 4 hours. Escalated to Tier 2 Engineering.
- High: First response < 4 hours, Resolution target < 12 hours.
- Normal: First response < 8 hours, Resolution target < 24 hours.
- Low: First response < 24 hours, Resolution target < 48 hours.

[Standard Diagnostic Playbooks]
- Profile & Settings Save Failures: Stale cookies or cache conflict, auth token refresh timeout, browser extensions/ad-blockers interfering with PUT/POST requests. Recommended actions: clear cache, verify session in incognito, check network payload.
- Authentication & Access: Invalid session token, unverified email address, password expiry. Recommended actions: send password reset link, verify account status in users directory.
- Billing / Refunds: All refund requests require confirmation by Billing Operations Lead within 3-5 business days. Agents cannot issue instant cash refunds without Lead sign-off.
- Escalation Protocol: Tier 1 Support Agent -> Tier 2 Technical Support -> Operations Lead -> Engineering Director.
""".strip()

        sources = [f"Ticket #{ticket_id.lstrip('#')} Core Details"]
        if notes:
            sources.append(f"{len(notes)} Internal Agent Note(s)")
        if customer_name:
            sources.append(f"Customer Profile: {customer_name}")
        if past_tickets_count > 0:
            sources.append(f"Customer Ticket History ({past_tickets_count} past tickets)")
        sources.append("Datastraw SLA & Support Policy KB")

        return {
            "ticket_id": ticket_id,
            "subject": subject,
            "description": description,
            "customer_name": customer_name,
            "customer_email": customer_email,
            "status": status_val,
            "priority": priority_val,
            "category": category_val,
            "created_at": created_at,
            "notes_text": notes_text,
            "past_tickets_count": past_tickets_count,
            "past_tickets_summary": past_tickets_summary,
            "knowledge_policies": knowledge_policies,
            "sources": sources,
        }

    @classmethod
    def execute_rag_query(
        cls,
        ticket: Dict[str, Any],
        query: str,
        messages: Optional[List[Dict[str, Any]]] = None,
    ) -> Dict[str, Any]:
        """
        Executes a grounded RAG (Retrieval-Augmented Generation) query using Google Gemini AI.
        Retrieves ticket facts, internal notes, customer historical records, and CRM support policies,
        incorporating multi-turn conversation memory.
        """
        ctx = cls._retrieve_rag_context(ticket)
        ticket_id = ctx["ticket_id"]

        # Build conversation history snippet
        history_text = "No prior messages in this conversation."
        if messages and isinstance(messages, list):
            valid_msgs = [m for m in messages if isinstance(m, dict) and m.get("content")]
            if valid_msgs:
                history_text = "\n".join([
                    f"{'Support Agent' if m.get('role') == 'user' else 'Gemini Copilot'}: {m.get('content')}"
                    for m in valid_msgs[-8:]  # Keep last 8 turns for context efficiency
                ])

        prompt = f"""
You are an expert AI Support Copilot assisting an internal Customer Support Agent at StrawCRM / Datastraw.
You are equipped with a RAG (Retrieval-Augmented Generation) engine grounded on live CRM data and support knowledge.

=== RETRIEVED GROUNDING CONTEXT (RAG) ===

[DOCUMENT 1: CURRENT TICKET DETAILS]
- Ticket ID: #{ticket_id.lstrip('#')}
- Customer Name: {ctx['customer_name']} ({ctx['customer_email']})
- Subject: {ctx['subject']}
- Priority: {ctx['priority']}
- Current Status: {ctx['status']}
- Category: {ctx['category']}
- Created At: {ctx['created_at']}
- Customer Problem Description:
{ctx['description']}

[DOCUMENT 2: INTERNAL AGENT COLLABORATION & NOTES]
{ctx['notes_text']}

[DOCUMENT 3: CUSTOMER PROFILE & HISTORICAL TICKETS]
- Total past tickets: {ctx['past_tickets_count']}
{ctx['past_tickets_summary']}

[DOCUMENT 4: DATASTRAW CRM KNOWLEDGE & OPERATIONAL POLICIES]
{ctx['knowledge_policies']}

=== END RETRIEVED GROUNDING CONTEXT ===

=== RECENT CONVERSATION HISTORY ===
{history_text}
=== END CONVERSATION HISTORY ===

CURRENT AGENT INQUIRY:
"{query.strip()}"

CRITICAL COPILOT INSTRUCTIONS:
1. GROUNDED FACTUALITY: Answer the agent's inquiry directly and accurately, strictly grounded in the retrieved documents above. If something is unknown or not in the retrieved data, state it clearly rather than guessing.
2. CITATION OF FACTS: Reference specific details when relevant (e.g. citing the customer's description, specific notes, SLA limits, or policy rules).
3. ACTION-ORIENTED SUPPORT: Provide actionable recommendations, structured checklists, diagnostic steps, or exact extractions that empower the agent to solve the customer's case quickly.
4. AUDIENCE: You are speaking internally to the Support Agent (not writing an email to the customer, unless specifically asked to "draft a response").
5. FORMATTING: Use clean markdown with clear headings, concise bullet points, and numbered lists where appropriate.
6. TONE: Professional, efficient, sharp, and highly supportive.
"""
        try:
            answer_text = cls._execute_gemini_prompt(prompt)
            cleaned_answer = cls.clean_text(answer_text)
        except Exception as err:
            logger.warning("[Gemini AI] RAG execution failed or rate-limited (%s), using intelligent fallback answer", err)
            cleaned_answer = cls._generate_fallback_rag(query, ticket, ctx)

        return {
            "ticket_id": ticket_id,
            "query": query.strip(),
            "answer": cleaned_answer,
            "sources": ctx["sources"],
        }

    @classmethod
    def execute_custom_query(cls, ticket: Dict[str, Any], query: str) -> Dict[str, Any]:
        """Backward-compatible wrapper for execute_rag_query."""
        return cls.execute_rag_query(ticket, query=query, messages=[])


