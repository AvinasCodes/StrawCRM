import logging
import copy
from typing import List, Optional, Dict, Any, Tuple
from fastapi import HTTPException, status
from app.database.firestore_client import FirestoreClient
from app.schemas.ticket import TicketCreate, TicketUpdate, NoteCreate
from app.services.email_service import EmailService
from app.core.config import settings

logger = logging.getLogger("strawcrm.tickets")


class TicketService:
    @staticmethod
    def resolve_agent_email(ticket: Dict[str, Any]) -> Tuple[Optional[str], Optional[str]]:
        """
        Resolves the assigned support agent's email and name server-side.
        1. Checks ticket's assigned_to_email
        2. If missing, looks up assigned_to_id or assigned_to_name against workspace users directory
        3. Returns (agent_email, agent_name)
        """
        agent_email = (ticket.get("assigned_to_email") or "").strip()
        agent_name = (ticket.get("assigned_to_name") or "Support Agent").strip()
        agent_id = (ticket.get("assigned_to_id") or "").strip()

        if EmailService.is_valid_email(agent_email):
            return agent_email, agent_name

        # Lookup in workspace users database
        try:
            from app.routes.users import _ensure_users_db
            users_map = _ensure_users_db()
            for key_email, u in users_map.items():
                u_email = (u.get("email") or key_email or "").strip()
                u_name = (u.get("name") or "").strip()
                u_id = (u.get("id") or "").strip()

                if agent_id and u_id and u_id.lower() == agent_id.lower() and EmailService.is_valid_email(u_email):
                    return u_email, u_name or agent_name
                if agent_id:
                    clean_id_key = agent_id.lower().replace("agent_", "")
                    if clean_id_key and clean_id_key in u_email.lower() and EmailService.is_valid_email(u_email):
                        return u_email, u_name or agent_name

            # Name-only match: Only resolve if there is a unique matching user with that name
            if agent_name:
                name_matches = [
                    u for u in users_map.values()
                    if (u.get("name") or "").strip().lower() == agent_name.lower()
                    and EmailService.is_valid_email((u.get("email") or "").strip())
                ]
                if len(name_matches) == 1:
                    matched_u = name_matches[0]
                    return (matched_u.get("email") or "").strip(), (matched_u.get("name") or agent_name).strip()
        except Exception as e:
            logger.warning("[TicketService] Failed to look up agent email in users store: %s", e)

        return None, agent_name

    @staticmethod
    def create_ticket(payload: TicketCreate) -> Dict[str, Any]:
        ticket = FirestoreClient.create_ticket(payload.model_dump())
        
        # Dispatch email notifications asynchronously in a background thread
        # This prevents blocking the HTTP response so ticket creation is blazing fast (<50ms)
        agent_email, agent_name = TicketService.resolve_agent_email(ticket)

        if agent_email:
            def _async_create_notify():
                try:
                    sent = EmailService.send_assignment_notification(ticket, agent_email, agent_name)
                    logger.info(
                        "[TicketService] Assignment notification email on create: to=%s (%s), success=%s, ticket=#%s",
                        agent_email, agent_name, sent, ticket.get("ticket_id")
                    )
                except Exception as e:
                    logger.warning("[TicketService] Failed to send assignment email on create: %s", e)

                # Check if created with High/Urgent priority -> alert agent
                priority_val = (ticket.get("priority") or "").lower()
                if priority_val in ("high", "urgent"):
                    try:
                        EmailService.send_urgent_priority_notification(ticket, agent_email, agent_name)
                    except Exception as e:
                        logger.warning("[TicketService] Failed to send urgent priority email on create: %s", e)

            import threading
            threading.Thread(target=_async_create_notify, daemon=True).start()

        return ticket

    @staticmethod
    def list_tickets(
        search: Optional[str] = None,
        status_filter: Optional[str] = None,
        customer_id: Optional[str] = None,
    ) -> List[Dict[str, Any]]:
        return FirestoreClient.list_tickets(search=search, status_filter=status_filter, customer_id=customer_id)

    @staticmethod
    def list_customers(search: Optional[str] = None) -> List[Dict[str, Any]]:
        return FirestoreClient.list_customers(search=search)

    @staticmethod
    def get_customer(customer_id: str) -> Dict[str, Any]:
        customer = FirestoreClient.get_customer(customer_id)
        if not customer:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail=f"Customer '{customer_id}' not found.",
            )
        return customer

    @staticmethod
    def get_ticket(ticket_id: str) -> Dict[str, Any]:
        ticket = FirestoreClient.get_ticket(ticket_id)
        if not ticket:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail=f"Ticket '{ticket_id}' not found.",
            )
        return ticket

    @staticmethod
    def update_ticket(ticket_id: str, payload: TicketUpdate) -> Dict[str, Any]:
        # Snapshot previous state BEFORE applying mutations (deepcopy prevents shared-reference bug)
        existing_raw = FirestoreClient.get_ticket(ticket_id)
        prev_ticket = copy.deepcopy(existing_raw) if existing_raw else {}
        prev_agent_email = (prev_ticket.get("assigned_to_email") or "").strip().lower()
        prev_agent_name = (prev_ticket.get("assigned_to_name") or "").strip().lower()
        prev_agent_id = (prev_ticket.get("assigned_to_id") or "").strip().lower()
        prev_agent = prev_agent_email or prev_agent_name or prev_agent_id
        prev_priority = (prev_ticket.get("priority") or "normal").strip().lower()

        ticket = FirestoreClient.update_ticket(
            ticket_id,
            status=payload.status,
            note=payload.notes,
            author_name=payload.author_name,
            author_email=payload.author_email,
            assigned_to_name=payload.assigned_to_name,
            assigned_to_email=payload.assigned_to_email,
            assigned_to_id=payload.assigned_to_id,
            priority=payload.priority,
            attachments=[a.model_dump() for a in payload.attachments] if payload.attachments is not None else None,
        )
        if not ticket:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail=f"Ticket '{ticket_id}' not found.",
            )

        agent_email, agent_name = TicketService.resolve_agent_email(ticket)

        # 1. Assignment notification trigger
        curr_agent_email = (ticket.get("assigned_to_email") or "").strip().lower()
        curr_agent_name = (ticket.get("assigned_to_name") or "").strip().lower()
        curr_agent_id = (ticket.get("assigned_to_id") or "").strip().lower()
        curr_agent = curr_agent_email or curr_agent_name or curr_agent_id

        # True if assignee changed OR if caller explicitly sent non-empty assignment fields
        explicit_assignment = (
            payload.assigned_to_name is not None
            or payload.assigned_to_email is not None
            or payload.assigned_to_id is not None
        ) and bool(curr_agent)

        is_assignment_change = bool(curr_agent) and (curr_agent != prev_agent or explicit_assignment)

        if (is_assignment_change or (curr_priority in ("high", "urgent") and curr_priority != prev_priority)) and agent_email:
            def _async_update_notify():
                if is_assignment_change:
                    try:
                        sent = EmailService.send_assignment_notification(ticket, agent_email, agent_name)
                        logger.info(
                            "[TicketService] Assignment notification email sent: to=%s (%s), success=%s, ticket=#%s",
                            agent_email, agent_name, sent, ticket.get("ticket_id")
                        )
                    except Exception as e:
                        logger.error("[TicketService] Assignment email trigger error: %s", e)

                if curr_priority in ("high", "urgent") and curr_priority != prev_priority:
                    try:
                        sent = EmailService.send_urgent_priority_notification(ticket, agent_email, agent_name)
                        logger.info(
                            "[TicketService] Urgent priority email sent: to=%s, success=%s, ticket=#%s",
                            agent_email, sent, ticket.get("ticket_id")
                        )
                    except Exception as e:
                        logger.error("[TicketService] Urgent priority email trigger error: %s", e)

            import threading
            threading.Thread(target=_async_update_notify, daemon=True).start()

        return ticket

    @staticmethod
    def add_note(
        ticket_id: str,
        note_text: str,
        author_name: Optional[str] = "Support Agent",
        author_email: Optional[str] = None,
        client_mutation_id: Optional[str] = None,
    ) -> Dict[str, Any]:
        ticket = FirestoreClient.get_ticket(ticket_id)
        if not ticket:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail=f"Ticket '{ticket_id}' not found.",
            )
        updated = FirestoreClient.update_ticket(
            ticket_id,
            note=note_text,
            author_name=author_name,
            author_email=author_email,
            note_id=client_mutation_id,
        )
        return updated

    @staticmethod
    def get_dashboard_summary(date_range: Optional[str] = "7d") -> Dict[str, Any]:
        all_tickets = FirestoreClient.list_tickets()
        total = len(all_tickets)
        open_count = sum(1 for t in all_tickets if str(t.get("status", "")).lower() == "open")
        in_progress = sum(1 for t in all_tickets if str(t.get("status", "")).lower() == "in progress")
        closed_count = sum(1 for t in all_tickets if str(t.get("status", "")).lower() == "closed")

        metrics_obj = {
            "total": total,
            "open": open_count,
            "in_progress": in_progress,
            "closed": closed_count,
            "resolution_rate": round((closed_count / total * 100), 1) if total > 0 else 0.0,
        }

        summary_obj = {
            "total": total,
            "open": open_count,
            "in_progress": in_progress,
            "closed": closed_count,
            "changes": {"open": 0, "in_progress": 0, "closed": 0},
        }

        return {
            "metrics": metrics_obj,
            "summary": summary_obj,
            "recent_tickets": all_tickets[:10],
            "range": date_range or "7d",
            "date_range": date_range or "7d",
        }

    @staticmethod
    def delete_ticket(ticket_id: str) -> Dict[str, Any]:
        success = FirestoreClient.delete_ticket(ticket_id)
        if not success:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail=f"Ticket '{ticket_id}' not found.",
            )
        return {"success": True, "ticket_id": ticket_id, "message": "Ticket deleted successfully"}

    @staticmethod
    def delete_tickets_bulk(ticket_ids: List[str]) -> Dict[str, Any]:
        deleted = FirestoreClient.delete_tickets_bulk(ticket_ids)
        return {
            "success": True,
            "deleted_count": len(deleted),
            "deleted_ticket_ids": deleted,
            "message": f"Successfully deleted {len(deleted)} ticket(s)",
        }

    @staticmethod
    def delete_customer(customer_id: str) -> Dict[str, Any]:
        result = FirestoreClient.delete_customer(customer_id)
        return result

    @staticmethod
    def send_ticket_email(
        ticket_id: str,
        subject: str,
        message: str,
        ticket_data: Optional[Dict[str, Any]] = None,
        recipient_email: Optional[str] = None,
        recipient_name: Optional[str] = None,
    ) -> Dict[str, Any]:
        """
        Sends an email response directly to the CUSTOMER's email address.
        """
        ticket = None
        try:
            ticket = FirestoreClient.get_ticket(ticket_id)
        except Exception:
            pass

        if not ticket and ticket_data and isinstance(ticket_data, dict):
            ticket = dict(ticket_data)
        elif ticket and ticket_data and isinstance(ticket_data, dict):
            # Combine ticket data to ensure customer fields are present
            merged = dict(ticket)
            for k in ["assigned_to_email", "assigned_to_name", "assigned_to_id", "priority", "status", "subject", "customer_name", "customer_email"]:
                if ticket_data.get(k):
                    merged[k] = ticket_data[k]
            ticket = merged

        if not ticket:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail=f"Ticket '{ticket_id}' not found.",
            )

        # Target customer email address (custom override or ticket customer_email)
        target_email = (recipient_email or ticket.get("customer_email") or "").strip()
        target_name = (recipient_name or ticket.get("customer_name") or "Valued Customer").strip()

        if not target_email or not EmailService.is_valid_email(target_email):
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail=f"Ticket '{ticket_id}' does not have a valid customer email address ({target_email or 'none provided'}).",
            )

        success = EmailService.send_response_to_customer(
            ticket=ticket,
            customer_email=target_email,
            customer_name=target_name,
            subject=subject,
            message=message,
        )

        if not success:
            raise HTTPException(
                status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
                detail="Unable to send email to customer via SMTP. Please check server SMTP configuration.",
            )

        return {
            "success": True,
            "recipient": target_email,
            "message": f"Email successfully sent to customer {target_name} ({target_email}).",
            "ticket_id": ticket_id,
        }



