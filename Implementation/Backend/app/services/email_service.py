import os
import smtplib
import logging
import re
from email.mime.multipart import MIMEMultipart
from email.mime.text import MIMEText
from typing import Optional, Dict, Any
from app.core.config import settings

logger = logging.getLogger("strawcrm.email")

EMAIL_REGEX = re.compile(r"^[a-zA-Z0-9_.+-]+@[a-zA-Z0-9-]+\.[a-zA-Z0-9-.]+$")


class EmailService:
    @staticmethod
    def is_valid_email(email: Optional[str]) -> bool:
        if not email or not isinstance(email, str):
            return False
        return bool(EMAIL_REGEX.match(email.strip()))

    @classmethod
    def _build_html_wrapper(
        cls,
        title: str,
        badge_text: str,
        badge_bg: str,
        ticket: Dict[str, Any],
        content_html: str,
        action_button_text: str = "View Ticket in StrawCRM",
    ) -> str:
        ticket_id = ticket.get("ticket_id") or "TKT-000"
        clean_id = ticket_id.lstrip("#")
        subject = ticket.get("subject") or "Support Request"
        customer_name = ticket.get("customer_name") or "Customer"
        customer_email = ticket.get("customer_email") or "Not provided"
        priority = (ticket.get("priority") or "Normal").capitalize()
        status_val = (ticket.get("status") or "Open").capitalize()
        assigned_name = ticket.get("assigned_to_name") or "Support Staff"
        frontend_url = settings.FRONTEND_URL.rstrip("/")
        ticket_link = f"{frontend_url}/tickets"

        priority_colors = {
            "urgent": ("#991b1b", "#fef2f2", "#fecaca"),
            "high": ("#c2410c", "#fff7ed", "#fed7aa"),
            "normal": ("#1d4ed8", "#eff6ff", "#bfdbfe"),
            "medium": ("#1d4ed8", "#eff6ff", "#bfdbfe"),
            "low": ("#15803d", "#f0fdf4", "#bbf7d0"),
        }
        p_text_col, p_bg_col, p_border_col = priority_colors.get(
            priority.lower(), ("#1d4ed8", "#eff6ff", "#bfdbfe")
        )

        return f"""<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <meta http-equiv="X-UA-Compatible" content="IE=edge">
  <title>{title}</title>
  <style type="text/css">
    body, table, td, a {{ -webkit-text-size-adjust: 100%; -ms-text-size-adjust: 100%; }}
    table, td {{ mso-table-lspace: 0pt; mso-table-rspace: 0pt; }}
    img {{ -ms-interpolation-mode: bicubic; border: 0; outline: none; text-decoration: none; }}
    body {{ margin: 0 !important; padding: 0 !important; width: 100% !important; background-color: #EEF4FA; }}
    @media only screen and (max-width: 520px) {{
      .wrapper-td {{ padding: 12px 6px !important; }}
      .main-card {{ border-radius: 12px !important; }}
      .header-cell {{ padding: 16px 16px !important; }}
      .content-cell {{ padding: 16px 16px !important; }}
      .overview-box {{ padding: 14px !important; }}
      .btn-cell a {{ padding: 12px 20px !important; font-size: 13px !important; }}
    }}
  </style>
</head>
<body style="margin: 0; padding: 0; background-color: #EEF4FA; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif; -webkit-font-smoothing: antialiased; color: #1e293b;">
  <!-- Full-width Outer Table -->
  <table width="100%" border="0" cellspacing="0" cellpadding="0" style="background-color: #EEF4FA; margin: 0; padding: 0;">
    <tr>
      <td class="wrapper-td" align="center" style="padding: 24px 12px;">
        
        <!-- Max 580px Main Email Container -->
        <table class="main-card" width="100%" border="0" cellspacing="0" cellpadding="0" style="max-width: 580px; width: 100%; background-color: #ffffff; border-radius: 16px; overflow: hidden; box-shadow: 0 4px 20px rgba(15, 23, 42, 0.08); border: 1px solid #e2e8f0;">
          
          <!-- Header Banner -->
          <tr>
            <td class="header-cell" style="background: linear-gradient(135deg, #071330 0%, #0c2356 60%, #0B63F6 100%); padding: 20px 24px; text-align: left;">
              <table width="100%" border="0" cellspacing="0" cellpadding="0">
                <tr>
                  <td align="left" valign="middle">
                    <div style="font-size: 20px; font-weight: 900; color: #ffffff; letter-spacing: -0.5px; line-height: 1.2;">
                      Straw<span style="color: #38bdf8;">CRM</span>
                    </div>
                    <div style="font-size: 10px; color: #94a3b8; font-weight: 700; margin-top: 3px; letter-spacing: 0.5px; text-transform: uppercase;">
                      Support Operations
                    </div>
                  </td>
                  <td align="right" valign="middle">
                    <span style="display: inline-block; background-color: {badge_bg}; color: {badge_text}; font-size: 10px; font-weight: 800; padding: 5px 12px; border-radius: 9999px; text-transform: uppercase; letter-spacing: 0.5px; white-space: nowrap; box-shadow: 0 2px 6px rgba(0,0,0,0.15);">
                      {title}
                    </span>
                  </td>
                </tr>
              </table>
            </td>
          </tr>

          <!-- Ticket Overview Summary Card -->
          <tr>
            <td class="content-cell" style="padding: 20px 24px 8px 24px;">
              <div class="overview-box" style="background-color: #f8fafc; border: 1px solid #e2e8f0; border-radius: 12px; padding: 16px 18px;">
                
                <!-- Ticket ID & Subject Title -->
                <div style="margin-bottom: 12px;">
                  <span style="display: inline-block; font-family: monospace; font-size: 11px; font-weight: 800; color: #0284c7; background-color: #e0f2fe; padding: 3px 8px; border-radius: 6px; border: 1px solid #bae6fd; margin-right: 6px; vertical-align: middle;">
                    #{clean_id}
                  </span>
                  <span style="font-size: 15px; font-weight: 800; color: #0f172a; vertical-align: middle; line-height: 1.4;">
                    {subject}
                  </span>
                </div>

                <!-- Status, Priority, & Assignee Badges (Never wrap text internally) -->
                <div style="margin-bottom: 12px; line-height: 2.2;">
                  <span style="display: inline-block; white-space: nowrap; background-color: {p_bg_col}; color: {p_text_col}; border: 1px solid {p_border_col}; font-size: 11px; font-weight: 700; padding: 3px 9px; border-radius: 6px; margin-right: 6px;">
                    Priority: {priority}
                  </span>
                  <span style="display: inline-block; white-space: nowrap; background-color: #f1f5f9; color: #334155; border: 1px solid #e2e8f0; font-size: 11px; font-weight: 700; padding: 3px 9px; border-radius: 6px; margin-right: 6px;">
                    Status: {status_val}
                  </span>
                  <span style="display: inline-block; white-space: nowrap; background-color: #ecfdf5; color: #065f46; border: 1px solid #a7f3d0; font-size: 11px; font-weight: 700; padding: 3px 9px; border-radius: 6px;">
                    Assignee: {assigned_name}
                  </span>
                </div>

                <!-- Customer Details -->
                <div style="border-top: 1px solid #e2e8f0; padding-top: 10px; font-size: 12px; color: #64748b; line-height: 1.6;">
                  <span style="display: inline-block; margin-right: 12px;"><strong>Customer:</strong> {customer_name}</span>
                  <span style="display: inline-block;"><strong>Email:</strong> <span style="color: #0284c7;">{customer_email}</span></span>
                </div>

              </div>
            </td>
          </tr>

          <!-- Notification Main Content -->
          <tr>
            <td class="content-cell" style="padding: 12px 24px 24px 24px; font-size: 14px; line-height: 1.65; color: #334155;">
              {content_html}
            </td>
          </tr>

          <!-- Action Button -->
          <tr>
            <td align="center" style="padding: 0 24px 28px 24px;">
              <table border="0" cellspacing="0" cellpadding="0" style="margin: 0 auto;">
                <tr>
                  <td align="center" style="border-radius: 10px; background: linear-gradient(135deg, #0B63F6 0%, #011E79 100%); box-shadow: 0 4px 14px rgba(11, 99, 246, 0.3);">
                    <a href="{ticket_link}" target="_blank" style="font-size: 13px; font-weight: 800; color: #ffffff; text-decoration: none; padding: 13px 30px; display: inline-block; border-radius: 10px; letter-spacing: 0.2px;">
                      {action_button_text} &rarr;
                    </a>
                  </td>
                </tr>
              </table>
            </td>
          </tr>

          <!-- Footer -->
          <tr>
            <td style="background-color: #f8fafc; border-top: 1px solid #e2e8f0; padding: 16px 24px; text-align: center; font-size: 11px; color: #94a3b8; line-height: 1.5;">
              This is an automated operational notification sent to the assigned support agent.<br>
              <strong>StrawCRM</strong> &bull; Datastraw Support Operations
            </td>
          </tr>

        </table>
      </td>
    </tr>
  </table>
</body>
</html>"""

    @classmethod
    def send_email(
        cls,
        to_email: str,
        subject: str,
        body_text: str,
        body_html: str,
    ) -> bool:
        """
        Sends an email using Python's standard library smtplib over TLS (Port 587) or SSL (Port 465).
        Falls back gracefully with logging if SMTP credentials are dummy/unconfigured in local dev.
        """
        if not cls.is_valid_email(to_email):
            logger.warning("[EmailService] Invalid recipient email address: '%s'", to_email)
            return False

        smtp_host = (os.getenv("SMTP_HOST") or settings.SMTP_HOST or "smtp.gmail.com").strip()
        smtp_port = int(os.getenv("SMTP_PORT") or settings.SMTP_PORT or 587)
        smtp_user = (os.getenv("SMTP_USER") or settings.SMTP_USER or "").strip()
        smtp_pass = (os.getenv("SMTP_PASSWORD") or settings.SMTP_PASSWORD or "").strip()
        from_name = settings.SMTP_FROM_NAME or "StrawCRM Notifications"
        from_addr = smtp_user or "notifications@strawcrm.com"

        from email.utils import formataddr

        msg = MIMEMultipart("alternative")
        msg["Subject"] = subject
        msg["From"] = formataddr((from_name, from_addr))
        msg["To"] = to_email

        msg.attach(MIMEText(body_text, "plain", "utf-8"))
        msg.attach(MIMEText(body_html, "html", "utf-8"))

        # If SMTP credentials are dummy/unconfigured in development, log and simulate delivery
        if not smtp_user or not smtp_pass or smtp_pass.startswith("<") or smtp_user.startswith("<"):
            logger.info(
                "[EmailService (DEV SIMULATION)] Successfully generated email notification:\n"
                "  To (Assigned Agent): %s\n"
                "  Subject: %s\n"
                "  Host: %s:%d\n"
                "  (To send live emails to real inboxes, set SMTP_USER and SMTP_PASSWORD in .env)",
                to_email, subject, smtp_host, smtp_port
            )
            return True

        try:
            if smtp_port == 465:
                with smtplib.SMTP_SSL(smtp_host, smtp_port, timeout=15) as server:
                    server.login(smtp_user, smtp_pass)
                    server.sendmail(smtp_user, [to_email], msg.as_string())
            else:
                with smtplib.SMTP(smtp_host, smtp_port, timeout=15) as server:
                    server.ehlo()
                    server.starttls()
                    server.ehlo()
                    server.login(smtp_user, smtp_pass)
                    server.sendmail(smtp_user, [to_email], msg.as_string())

            logger.info("[EmailService] Live email successfully dispatched to %s via SMTP (%s)", to_email, smtp_host)
            return True
        except Exception as err:
            logger.error("[EmailService] Failed to send email via SMTP to %s: %s", to_email, err)
            return False


    @classmethod
    def send_assignment_notification(cls, ticket: Dict[str, Any], agent_email: str, agent_name: str) -> bool:
        """
        Sends assignment notification email to the assigned support agent.
        """
        agent_email = (agent_email or "").strip()
        agent_name = (agent_name or "Support Agent").strip()
        if not cls.is_valid_email(agent_email):
            logger.warning("[EmailService] Invalid recipient email address for assignment: '%s'", agent_email)
            return False

        logger.info("[EmailService] Dispatching assignment notification email to agent '%s' <%s>...", agent_name, agent_email)
        ticket_id = (ticket.get("ticket_id") or "TKT-001").lstrip("#")
        subject_line = f"[StrawCRM] Ticket #{ticket_id} Assigned to You: {ticket.get('subject', 'Support Request')}"
        
        description = (ticket.get("description") or "No description provided.").strip()
        customer_name = ticket.get("customer_name") or "Customer"

        content_html = f"""
        <div style="font-size: 15px; font-weight: 700; color: #0f172a; margin-bottom: 6px;">
          Hi {agent_name},
        </div>
        <div style="color: #475569; font-size: 14px; line-height: 1.6; margin-bottom: 16px;">
          A customer support ticket has been assigned to you for investigation and triage.
        </div>
        
        <div style="background-color: #f8fafc; border: 1px solid #e2e8f0; border-left: 4px solid #0B63F6; padding: 14px 16px; border-radius: 8px; margin: 16px 0;">
          <div style="font-size: 11px; font-weight: 800; text-transform: uppercase; letter-spacing: 0.5px; color: #64748b; margin-bottom: 6px;">
            Customer Inquiry
          </div>
          <div style="font-size: 13px; color: #1e293b; line-height: 1.6; white-space: pre-wrap;">{description}</div>
        </div>

        <div style="font-size: 12px; color: #64748b; margin-top: 14px; line-height: 1.5;">
          Please review the ticket and provide a customer response within your team's SLA window.
        </div>
        """

        body_text = f"""[StrawCRM] Ticket #{ticket_id} Assigned to You

Hi {agent_name},

Ticket #{ticket_id} ({ticket.get('subject', '')}) has been assigned to you.

Customer: {customer_name}
Priority: {ticket.get('priority', 'Normal')}
Status: {ticket.get('status', 'Open')}

Description:
{description}

View ticket: {settings.FRONTEND_URL}/tickets
"""

        body_html = cls._build_html_wrapper(
            title="Ticket Assigned",
            badge_text="#0B63F6",
            badge_bg="#eff6ff",
            ticket=ticket,
            content_html=content_html,
            action_button_text="Open Ticket in StrawCRM",
        )

        return cls.send_email(agent_email, subject_line, body_text, body_html)

    @classmethod
    def send_urgent_priority_notification(cls, ticket: Dict[str, Any], agent_email: str, agent_name: str) -> bool:
        """
        Sends urgent priority escalation email to the assigned support agent.
        """
        if not cls.is_valid_email(agent_email):
            return False

        ticket_id = (ticket.get("ticket_id") or "TKT-001").lstrip("#")
        priority = (ticket.get("priority") or "High").upper()
        subject_line = f"[StrawCRM] ⚠️ Urgent {priority} Priority Ticket #{ticket_id}: {ticket.get('subject', 'Support Request')}"
        
        description = (ticket.get("description") or "No description provided.").strip()

        content_html = f"""
        <div style="font-size: 15px; font-weight: 700; color: #0f172a; margin-bottom: 6px;">
          Hi {agent_name},
        </div>
        <div style="color: #dc2626; font-size: 14px; font-weight: 700; line-height: 1.6; margin-bottom: 16px;">
          ⚠️ Urgent Action Required: Ticket #{ticket_id} has been escalated to {priority} Priority.
        </div>
        
        <div style="background-color: #fef2f2; border: 1px solid #fecaca; border-left: 4px solid #dc2626; padding: 14px 16px; border-radius: 8px; margin: 16px 0;">
          <div style="font-size: 11px; font-weight: 800; text-transform: uppercase; letter-spacing: 0.5px; color: #991b1b; margin-bottom: 6px;">
            Issue Summary
          </div>
          <div style="font-size: 13px; color: #7f1d1d; line-height: 1.6; white-space: pre-wrap;">{description}</div>
        </div>

        <div style="font-size: 12px; color: #64748b; margin-top: 14px; line-height: 1.5;">
          Immediate review and triage is requested to maintain SLA commitments.
        </div>
        """

        body_text = f"""[StrawCRM] URGENT {priority} TICKET #{ticket_id}

Hi {agent_name},

Ticket #{ticket_id} has been escalated to {priority} Priority and requires your immediate attention.

Subject: {ticket.get('subject', '')}
Customer: {ticket.get('customer_name', 'Customer')}
Current Status: {ticket.get('status', 'Open')}

Description:
{description}

View ticket immediately: {settings.FRONTEND_URL}/tickets
"""

        body_html = cls._build_html_wrapper(
            title="Urgent Priority",
            badge_text="#ffffff",
            badge_bg="#dc2626",
            ticket=ticket,
            content_html=content_html,
            action_button_text="Review Urgent Ticket Now",
        )

        return cls.send_email(agent_email, subject_line, body_text, body_html)

    @classmethod
    def send_ai_draft_to_agent(
        cls,
        ticket: Dict[str, Any],
        agent_email: str,
        agent_name: str,
        subject: str,
        message: str,
    ) -> bool:
        """
        Sends AI-generated or agent-reviewed reply copy directly to the assigned support agent's inbox.
        """
        if not cls.is_valid_email(agent_email):
            return False

        ticket_id = (ticket.get("ticket_id") or "TKT-001").lstrip("#")
        subject_line = subject or f"[StrawCRM] Suggested Response Copy for Ticket #{ticket_id}"

        content_html = f"""
        <p style="margin-top: 0;">Hi <strong>{agent_name}</strong>,</p>
        <p>Here is the AI-assisted response draft for ticket <strong>#{ticket_id}</strong> (Customer: {ticket.get('customer_name', 'Customer')}):</p>
        
        <div style="background-color: #f8fafc; border: 1px solid #cbd5e1; border-radius: 8px; padding: 16px; margin: 16px 0; font-size: 13px; color: #0f172a; white-space: pre-wrap; font-family: sans-serif; line-height: 1.6;">{message}</div>

        <p style="font-size: 12px; color: #64748b; margin-bottom: 0;">
          This copy has been sent to your support inbox for reference, editing, or direct customer communication.
        </p>
        """

        body_text = f"""{subject_line}

Hi {agent_name},

Suggested response copy for Ticket #{ticket_id} (Customer: {ticket.get('customer_name', 'Customer')}):

--------------------------------------------------
{message}
--------------------------------------------------

View ticket: {settings.FRONTEND_URL}/tickets
"""

        body_html = cls._build_html_wrapper(
            title="AI Response Copy",
            badge_text="#0B63F6",
            badge_bg="#eff6ff",
            ticket=ticket,
            content_html=content_html,
            action_button_text="Open Ticket in StrawCRM",
        )

        return cls.send_email(agent_email, subject_line, body_text, body_html)

    @classmethod
    def send_response_to_customer(
        cls,
        ticket: Dict[str, Any],
        customer_email: str,
        customer_name: str,
        subject: str,
        message: str,
    ) -> bool:
        """
        Sends an official support response email directly to the customer's email address.
        """
        customer_email = (customer_email or "").strip()
        if not cls.is_valid_email(customer_email):
            logger.warning("[EmailService] Invalid customer email address for response: '%s'", customer_email)
            return False

        ticket_id = (ticket.get("ticket_id") or "TKT-001").lstrip("#")
        subject_line = subject or f"[StrawCRM] Response on Ticket #{ticket_id}: {ticket.get('subject', '')}"
        formatted_message = message.strip()

        content_html = f"""
        <div style="font-size: 14px; color: #1e293b; line-height: 1.7; white-space: pre-wrap; font-family: sans-serif;">{formatted_message}</div>
        
        <div style="margin-top: 24px; padding-top: 16px; border-top: 1px solid #e2e8f0; font-size: 12px; color: #64748b; line-height: 1.5;">
          You are receiving this update regarding support request <strong>#{ticket_id}</strong>.
          You can reply directly to this email to provide further information to our team.
        </div>
        """

        body_text = f"""{subject_line}

{formatted_message}

---
Ticket #{ticket_id} | StrawCRM Support Operations
"""

        body_html = cls._build_html_wrapper(
            title="Support Response",
            badge_text="#0B63F6",
            badge_bg="#eff6ff",
            ticket=ticket,
            content_html=content_html,
            action_button_text="View Support Ticket",
        )

        logger.info(
            "[EmailService] Dispatching customer response email to '%s' <%s> for Ticket #%s...",
            customer_name, customer_email, ticket_id
        )
        return cls.send_email(customer_email, subject_line, body_text, body_html)

