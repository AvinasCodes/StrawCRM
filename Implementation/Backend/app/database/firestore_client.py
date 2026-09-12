import logging
import json
import os
import re
import copy
import urllib.request
import urllib.error
from typing import Optional, Dict, Any, List, Union
from datetime import datetime, timezone
from pathlib import Path
from app.core.config import settings

logger = logging.getLogger("strawcrm.firestore")

BASE_URL = f"https://firestore.googleapis.com/v1/projects/{settings.FIREBASE_PROJECT_ID}/databases/(default)/documents"

# File-based durable store path
DATA_DIR = Path(__file__).resolve().parent.parent.parent / "data"
DB_FILE = DATA_DIR / "tickets_db.json"
CUSTOMERS_DB_FILE = DATA_DIR / "customers_db.json"

# Default seed tickets (empty - clean production database)
SEED_TICKETS: List[Dict[str, Any]] = []


_CUST_DB_CACHE: Optional[Dict[str, Dict[str, Any]]] = None
_CUST_DB_MTIME: float = 0.0


def _ensure_customers_db() -> Dict[str, Dict[str, Any]]:
    """Load or initialize the customers JSON store."""
    global _CUST_DB_CACHE, _CUST_DB_MTIME
    DATA_DIR.mkdir(parents=True, exist_ok=True)
    if not CUSTOMERS_DB_FILE.exists():
        _CUST_DB_CACHE = {}
        try:
            CUSTOMERS_DB_FILE.write_text("{}\n", encoding="utf-8")
            _CUST_DB_MTIME = os.path.getmtime(CUSTOMERS_DB_FILE)
        except Exception:
            pass
        return _CUST_DB_CACHE
    try:
        mtime = os.path.getmtime(CUSTOMERS_DB_FILE)
        if _CUST_DB_CACHE is not None and mtime == _CUST_DB_MTIME:
            return _CUST_DB_CACHE
        text = CUSTOMERS_DB_FILE.read_text(encoding="utf-8").strip()
        data = json.loads(text) if text else {}
        _CUST_DB_CACHE = data if isinstance(data, dict) else {}
        _CUST_DB_MTIME = mtime
    except Exception as e:
        logger.warning("Error reading customers DB: %s", e)
    return _CUST_DB_CACHE or {}


def _save_customers_db(data: Dict[str, Dict[str, Any]]) -> None:
    global _CUST_DB_CACHE, _CUST_DB_MTIME
    _CUST_DB_CACHE = data
    try:
        content = json.dumps(data, indent=2, ensure_ascii=False)
        CUSTOMERS_DB_FILE.write_text(content + "\n", encoding="utf-8")
        _CUST_DB_MTIME = os.path.getmtime(CUSTOMERS_DB_FILE)
    except Exception as e:
        logger.error("Failed to save customers DB: %s", e)


def _upsert_customer(ticket: dict) -> None:
    """Create or update the customer record derived from a ticket."""
    cid = str(ticket.get("customer_id") or "").strip()
    email = str(ticket.get("customer_email") or "").strip().lower()
    name = str(ticket.get("customer_name") or "").strip()
    if not cid and not email:
        return
    key = cid or email
    cdb = _ensure_customers_db()
    existing = cdb.get(key, {})
    # Recount tickets for this customer from tickets DB
    tdb = _ensure_db_initialized()
    customer_tickets = [
        t for t in tdb.values()
        if (cid and str(t.get("customer_id", "")).strip() == cid)
        or (email and str(t.get("customer_email", "")).strip().lower() == email)
    ]
    customer_tickets.sort(key=lambda t: str(t.get("created_at", "")), reverse=True)
    latest = customer_tickets[0] if customer_tickets else ticket
    cdb[key] = {
        "customer_id": cid or existing.get("customer_id", ""),
        "customer_name": name or existing.get("customer_name", ""),
        "customer_email": email or existing.get("customer_email", ""),
        "ticket_count": len(customer_tickets),
        "latest_ticket_id": latest.get("ticket_id"),
        "latest_ticket_date": latest.get("created_at"),
        "latest_subject": latest.get("subject"),
        "updated_at": datetime.now(timezone.utc).isoformat(),
    }
    _save_customers_db(cdb)


def _get_or_assign_customer_id(ticket: dict, db: Dict[str, Any]) -> str:
    """Find existing customer_id for matching customer, or generate next CUST-xxx."""
    if ticket.get("customer_id"):
        return str(ticket["customer_id"]).strip()

    email = str(ticket.get("customer_email", "")).strip().lower()
    name = str(ticket.get("customer_name", "")).strip().lower()

    # Search existing tickets for this customer to reuse their customer_id
    for t in db.values():
        t_email = str(t.get("customer_email", "")).strip().lower()
        t_name = str(t.get("customer_name", "")).strip().lower()
        if (email and t_email == email) or (name and t_name == name):
            if t.get("customer_id"):
                return str(t["customer_id"]).strip()

    # Otherwise generate a new CUST-xxx
    max_cust_num = 0
    for t in db.values():
        cid = str(t.get("customer_id", ""))
        nums = re.findall(r"(\d+)", cid)
        if nums:
            val = int(nums[-1])
            if val > max_cust_num:
                max_cust_num = val
    return f"CUST-{max_cust_num + 1:03d}"


_DB_CACHE: Optional[Dict[str, Dict[str, Any]]] = None
_DB_MTIME: float = 0.0


def _ensure_db_initialized() -> Dict[str, Dict[str, Any]]:
    """Ensure data directory and JSON DB exist, using in-memory cache for speed."""
    global _DB_CACHE, _DB_MTIME
    DATA_DIR.mkdir(parents=True, exist_ok=True)
    if not DB_FILE.exists():
        _DB_CACHE = {}
        try:
            with open(DB_FILE, "w", encoding="utf-8") as f:
                f.write("{}\n")
            _DB_MTIME = os.path.getmtime(DB_FILE)
        except Exception as e:
            logger.warning("Could not write initial DB file: %s", e)
        return _DB_CACHE

    try:
        current_mtime = os.path.getmtime(DB_FILE)
        if _DB_CACHE is not None and current_mtime == _DB_MTIME:
            return _DB_CACHE

        with open(DB_FILE, "r", encoding="utf-8") as f:
            text = f.read().strip()
            if not text:
                _DB_CACHE = {}
                return _DB_CACHE
            data = json.loads(text)
            if isinstance(data, dict):
                _DB_CACHE = data
                _DB_MTIME = current_mtime
                return _DB_CACHE
    except Exception as e:
        logger.warning("Error reading DB file: %s", e)

    return _DB_CACHE or {}


def _save_db(data: Dict[str, Dict[str, Any]]) -> None:
    """Save dictionary to DB file safely and update memory cache."""
    global _DB_CACHE, _DB_MTIME
    _DB_CACHE = data
    try:
        DATA_DIR.mkdir(parents=True, exist_ok=True)
        content = json.dumps(data, indent=2, ensure_ascii=False)
        with open(DB_FILE, "w", encoding="utf-8") as f:
            f.write(content + "\n")
            f.flush()
        _DB_MTIME = os.path.getmtime(DB_FILE)
    except Exception as e:
        logger.error("Failed to save tickets database: %s", e)


class FirestoreClient:
    @staticmethod
    def get_ticket(ticket_id: str) -> Optional[Dict[str, Any]]:
        """
        Fetch ticket by ID with robust multi-ID matching.
        Works across all users and ID types:
          - Ticket ID: 'TKT-001', 'tkt-001', '#TKT-001', numeric '1' -> 'TKT-001'
          - Customer ID: 'CUST-001', 'cust-001', '#CUST-001', numeric customer id
          - Customer email or name
        """
        if not ticket_id:
            return None

        db = _ensure_db_initialized()
        raw_id = str(ticket_id).strip()
        clean_id = raw_id.lstrip("#").upper()

        # 1. Direct match on ticket_id key
        if clean_id in db:
            return copy.deepcopy(db[clean_id])

        # 2. Case-insensitive / normalized matching on ticket_id
        for k, t in db.items():
            k_norm = str(k).strip().lstrip("#").upper()
            if k_norm == clean_id:
                return copy.deepcopy(t)

        # If clean_id specifically begins with TKT, it's a ticket ID search that failed
        if clean_id.startswith("TKT"):
            return None

        # 3. Match on customer_id (e.g. CUST-001, CUST-002, or CUST-1)
        if clean_id.startswith("CUST"):
            for t in db.values():
                t_cid = str(t.get("customer_id", "")).strip().lstrip("#").upper()
                if t_cid == clean_id:
                    return copy.deepcopy(t)
            digits = re.findall(r"\d+", clean_id)
            if digits:
                formatted_cust = f"CUST-{int(digits[0]):03d}"
                for t in db.values():
                    if str(t.get("customer_id", "")).strip().lstrip("#").upper() == formatted_cust:
                        return copy.deepcopy(t)
            return None

        # 4. Pure numeric match (e.g. '1' -> checks TKT-001 first, then CUST-001)
        if clean_id.isdigit():
            num = int(clean_id)
            formatted_tkt = f"TKT-{num:03d}"
            if formatted_tkt in db:
                return copy.deepcopy(db[formatted_tkt])
            formatted_cust = f"CUST-{num:03d}"
            for t in db.values():
                if str(t.get("customer_id", "")).strip().lstrip("#").upper() == formatted_cust:
                    return copy.deepcopy(t)

        # 5. Match by customer email
        email_query = raw_id.lower()
        for t in db.values():
            if str(t.get("customer_email", "")).lower() == email_query:
                return copy.deepcopy(t)

        # 6. Match by customer name
        name_query = raw_id.lower()
        for t in db.values():
            if str(t.get("customer_name", "")).lower() == name_query:
                return copy.deepcopy(t)

        # 7. Match by raised_by_user_id or user UID
        for t in db.values():
            if str(t.get("raised_by_user_id", "")).strip().lower() == raw_id.lower():
                return copy.deepcopy(t)

        # 8. Match by raised_by_name
        for t in db.values():
            if str(t.get("raised_by_name", "")).strip().lower() == name_query:
                return copy.deepcopy(t)

        # 9. Match by assigned_to fields
        for t in db.values():
            if str(t.get("assigned_to_id", "")).strip().lower() == raw_id.lower():
                return copy.deepcopy(t)
            if str(t.get("assigned_to_email", "")).strip().lower() == email_query:
                return copy.deepcopy(t)
            if str(t.get("assigned_to_name", "")).strip().lower() == name_query:
                return copy.deepcopy(t)

        return None

    @staticmethod
    def list_tickets(
        search: Optional[str] = None,
        status_filter: Optional[str] = None,
        customer_id: Optional[str] = None,
    ) -> List[Dict[str, Any]]:
        """List all tickets matching search, status filter, and optional customer_id."""
        db = _ensure_db_initialized()
        tickets = list(db.values())

        # Normalize attachments & notes & customer_id & raised_by_user_id
        for t in tickets:
            if "attachments" not in t or not isinstance(t["attachments"], list):
                t["attachments"] = []
            if "notes" not in t or not isinstance(t["notes"], list):
                t["notes"] = []
            if "customer_id" not in t or not t["customer_id"]:
                t["customer_id"] = _get_or_assign_customer_id(t, db)
            if "raised_by_name" not in t or not t["raised_by_name"]:
                t["raised_by_name"] = str(t.get("customer_name", "Support User")).strip()
            if "raised_by_user_id" not in t or not t["raised_by_user_id"]:
                name_slug = str(t.get("customer_name", "user")).strip().lower().replace(" ", "_")
                t["raised_by_user_id"] = f"usr_{name_slug}" if name_slug else str(t.get("customer_id", "usr_user"))

        # Filter by customer_id if specified
        if customer_id and customer_id.strip():
            cid_clean = customer_id.strip().lstrip("#").upper()
            digits = re.findall(r"\d+", cid_clean)
            formatted_cids = [cid_clean]
            if digits:
                formatted_cids.append(f"CUST-{int(digits[0]):03d}")
            tickets = [
                t for t in tickets
                if str(t.get("customer_id", "")).strip().lstrip("#").upper() in formatted_cids
                or str(t.get("customer_email", "")).lower() == customer_id.strip().lower()
            ]

        # Status filter
        if status_filter and status_filter.lower() != "all":
            sf = status_filter.lower().strip()
            tickets = [t for t in tickets if (t.get("status") or "").lower().strip() == sf]

        # Search filter (matches ticket_id, customer_id, raised_by_user_id, raised_by_name, customer_name, customer_email, subject, description, assigned_to)
        if search and search.strip():
            q = search.lower().strip()
            tickets = [
                t for t in tickets
                if q in str(t.get("ticket_id", "")).lower()
                or q in str(t.get("customer_id", "")).lower()
                or q in str(t.get("raised_by_name", "")).lower()
                or q in str(t.get("raised_by_user_id", "")).lower()
                or q in str(t.get("customer_name", "")).lower()
                or q in str(t.get("customer_email", "")).lower()
                or q in str(t.get("subject", "")).lower()
                or q in str(t.get("description", "")).lower()
                or q in str(t.get("assigned_to_name", "")).lower()
                or q in str(t.get("assigned_to_email", "")).lower()
                or q in str(t.get("assigned_to_id", "")).lower()
            ]

        # Sort descending by created_at
        tickets.sort(key=lambda t: str(t.get("created_at", "")), reverse=True)

        # Prepare lightweight ticket items for listing (strip heavy base64 data payloads)
        clean_tickets = []
        for t in tickets:
            t_copy = dict(t)
            if t_copy.get("attachments"):
                t_copy["attachments"] = [
                    {k: v for k, v in a.items() if k != "data"}
                    for a in t_copy["attachments"]
                ]
            clean_tickets.append(t_copy)
        return clean_tickets

    @staticmethod
    def list_customers(search: Optional[str] = None) -> List[Dict[str, Any]]:
        """
        Return all unique customers from the dedicated customers_db.
        Falls back to ticket aggregation if customers_db is empty.
        """
        cdb = _ensure_customers_db()

        if cdb:
            # Use dedicated customers store
            customers = list(cdb.values())

            # Enrich with live ticket counts from tickets DB
            tdb = _ensure_db_initialized()
            for c in customers:
                cid = str(c.get("customer_id", "")).strip()
                email = str(c.get("customer_email", "")).strip().lower()
                c_tickets = [
                    t for t in tdb.values()
                    if (cid and str(t.get("customer_id", "")).strip() == cid)
                    or (email and str(t.get("customer_email", "")).strip().lower() == email)
                ]
                c_tickets.sort(key=lambda t: str(t.get("created_at", "")), reverse=True)
                c["ticket_count"] = len(c_tickets)
                c["tickets"] = c_tickets
                if c_tickets:
                    c["latest_ticket_id"] = c_tickets[0].get("ticket_id")
                    c["latest_ticket_date"] = c_tickets[0].get("created_at")
                    c["latest_subject"] = c_tickets[0].get("subject")

            # Only return customers who currently have active tickets
            customers = [c for c in customers if c.get("ticket_count", 0) > 0]
        else:
            # Fallback: aggregate from tickets
            db = _ensure_db_initialized()
            tickets = list(db.values())
            customers_map: Dict[str, Dict[str, Any]] = {}
            for t in tickets:
                cid = str(t.get("customer_id", "")).strip() or _get_or_assign_customer_id(t, db)
                email = str(t.get("customer_email", "")).strip().lower()
                key = cid if cid else email
                if not key:
                    continue
                if key not in customers_map:
                    customers_map[key] = {
                        "customer_id": cid,
                        "customer_name": str(t.get("customer_name", "")).strip(),
                        "customer_email": str(t.get("customer_email", "")).strip(),
                        "ticket_count": 0,
                        "latest_ticket_id": t.get("ticket_id"),
                        "latest_ticket_date": t.get("created_at"),
                        "latest_subject": t.get("subject"),
                        "tickets": [],
                    }
                c = customers_map[key]
                c["ticket_count"] += 1
                c["tickets"].append(t)
                if str(t.get("created_at", "")) > str(c.get("latest_ticket_date", "")):
                    c["latest_ticket_id"] = t.get("ticket_id")
                    c["latest_ticket_date"] = t.get("created_at")
                    c["latest_subject"] = t.get("subject")
            customers = list(customers_map.values())
            # Also seed customers_db for next time
            try:
                seed = {(c.get("customer_id") or c.get("customer_email")): {
                    k: v for k, v in c.items() if k != "tickets"
                } for c in customers}
                _save_customers_db(seed)
            except Exception:
                pass

        if search and search.strip():
            q = search.lower().strip()
            customers = [
                c for c in customers
                if q in str(c.get("customer_id", "")).lower()
                or q in str(c.get("customer_name", "")).lower()
                or q in str(c.get("customer_email", "")).lower()
                or q in str(c.get("latest_subject") or "").lower()
            ]

        customers.sort(key=lambda c: str(c.get("latest_ticket_date", "")), reverse=True)
        return customers

    @staticmethod
    def get_customer(customer_id: str) -> Optional[Dict[str, Any]]:
        """
        Fetch customer by customer_id (e.g. CUST-001, cust-001, 1, #CUST-001, or email/name).
        Returns customer profile with all tickets for that customer.
        """
        if not customer_id:
            return None

        clean_id = str(customer_id).strip().lstrip("#").upper()
        digits = re.findall(r"\d+", clean_id)
        formatted_cids = [clean_id]
        if digits:
            formatted_cids.append(f"CUST-{int(digits[0]):03d}")

        all_customers = FirestoreClient.list_customers()
        for c in all_customers:
            if c["customer_id"].upper() in formatted_cids:
                return c

        q = str(customer_id).strip().lower()
        for c in all_customers:
            if c["customer_email"].lower() == q or c["customer_name"].lower() == q:
                return c

        return None

    @staticmethod
    def create_ticket(payload: dict) -> Dict[str, Any]:
        """Create a new ticket with customer_id, attachments, and auto-generated or provided ID."""
        db = _ensure_db_initialized()
        now_iso = datetime.now(timezone.utc).isoformat()

        # Determine ticket ID
        ticket_id = payload.get("ticket_id")
        if not ticket_id:
            max_num = 0
            for k in db.keys():
                nums = re.findall(r"(\d+)", str(k))
                if nums:
                    val = int(nums[-1])
                    if val > max_num:
                        max_num = val
            ticket_id = f"TKT-{max_num + 1:03d}"

        # Determine customer ID
        customer_id = payload.get("customer_id")
        if not customer_id:
            customer_id = _get_or_assign_customer_id(payload, db)

        # Determine raised_by_name and raised_by_user_id
        customer_name = str(payload.get("customer_name", "Customer")).strip()
        raised_by_name = payload.get("raised_by_name") or customer_name
        raised_by_user_id = payload.get("raised_by_user_id")
        if not raised_by_user_id or raised_by_user_id == "usr_agent_01":
            name_slug = customer_name.lower().replace(" ", "_")
            raised_by_user_id = f"usr_{name_slug}" if name_slug else customer_id

        # Clean attachments
        raw_att = payload.get("attachments") or []
        attachments = []
        if isinstance(raw_att, list):
            for a in raw_att:
                if isinstance(a, dict):
                    att_item = {
                        "name": str(a.get("name", "attachment")),
                        "url": str(a.get("url", "")),
                        "size": int(a.get("size", 0)),
                        "type": str(a.get("type", "application/octet-stream")),
                    }
                    if a.get("id"):
                        att_item["id"] = str(a["id"])
                    if a.get("storage"):
                        att_item["storage"] = str(a["storage"])
                    if a.get("data"):
                        att_item["data"] = str(a["data"])
                    attachments.append(att_item)

        ticket = {
            "ticket_id": ticket_id,
            "customer_id": customer_id,
            "raised_by_name": raised_by_name,
            "raised_by_user_id": raised_by_user_id,
            "customer_name": customer_name,
            "customer_email": str(payload.get("customer_email", "")).strip(),
            "subject": str(payload.get("subject", "")).strip(),
            "description": str(payload.get("description", "")).strip(),
            "status": str(payload.get("status") or "Open").strip(),
            "priority": str(payload.get("priority") or "Normal").strip(),
            "assigned_to_name": str(payload.get("assigned_to_name") or "").strip(),
            "assigned_to_email": str(payload.get("assigned_to_email") or "").strip(),
            "assigned_to_id": str(payload.get("assigned_to_id") or "").strip(),
            "attachments": attachments,
            "created_at": payload.get("created_at") or now_iso,
            "updated_at": now_iso,
            "notes": payload.get("notes") or [],
        }

        # ── Idempotency guard 1: ticket_id already exists → return existing ──
        if ticket_id in db:
            logger.debug("Ticket %s already exists, returning existing record.", ticket_id)
            return db[ticket_id]

        # ── Idempotency guard 2: same subject + email created within last 60s ──
        from datetime import timedelta
        now_dt = datetime.now(timezone.utc)
        subj_lower = str(payload.get("subject", "")).strip().lower()
        email_lower = str(payload.get("customer_email", "")).strip().lower()
        if subj_lower and email_lower:
            for existing in db.values():
                if (
                    str(existing.get("subject", "")).strip().lower() == subj_lower
                    and str(existing.get("customer_email", "")).strip().lower() == email_lower
                ):
                    try:
                        created_dt = datetime.fromisoformat(str(existing.get("created_at", "")).replace("Z", "+00:00"))
                        if (now_dt - created_dt).total_seconds() < 60:
                            logger.debug("Duplicate ticket suppressed: same subject+email within 60s.")
                            return existing
                    except Exception:
                        pass

        db[ticket_id] = ticket
        _save_db(db)

        # Keep customers DB in sync
        try:
            _upsert_customer(ticket)
        except Exception as e:
            logger.warning("_upsert_customer failed: %s", e)

        return {
            "ticket_id": ticket_id,
            "customer_id": ticket["customer_id"],
            "raised_by_user_id": ticket["raised_by_user_id"],
            "raised_by_name": ticket.get("raised_by_name", ""),
            "customer_name": ticket["customer_name"],
            "customer_email": ticket["customer_email"],
            "subject": ticket["subject"],
            "description": ticket["description"],
            "status": ticket["status"],
            "priority": ticket.get("priority", "Normal"),
            "assigned_to_name": ticket.get("assigned_to_name", ""),
            "assigned_to_email": ticket.get("assigned_to_email", ""),
            "assigned_to_id": ticket.get("assigned_to_id", ""),
            "attachments": ticket["attachments"],
            "created_at": ticket["created_at"],
            "updated_at": ticket["updated_at"],
            "notes": ticket["notes"],
        }

    @staticmethod
    def update_ticket(
        ticket_id: str,
        status: Optional[str] = None,
        note: Optional[str] = None,
        author_name: Optional[str] = None,
        attachments: Optional[List[dict]] = None,
        author_email: Optional[str] = None,
        note_id: Optional[Union[str, int]] = None,
        assigned_to_name: Optional[str] = None,
        assigned_to_email: Optional[str] = None,
        assigned_to_id: Optional[str] = None,
        priority: Optional[str] = None,
    ) -> Optional[Dict[str, Any]]:
        """Update ticket status, agent assignments, priority, notes, and attachments."""
        ticket = FirestoreClient.get_ticket(ticket_id)
        if not ticket:
            return None

        db = _ensure_db_initialized()
        now_iso = datetime.now(timezone.utc).isoformat()

        if status:
            ticket["status"] = status.strip()

        if assigned_to_name is not None:
            ticket["assigned_to_name"] = str(assigned_to_name).strip()
        if assigned_to_email is not None:
            ticket["assigned_to_email"] = str(assigned_to_email).strip()
        if assigned_to_id is not None:
            ticket["assigned_to_id"] = str(assigned_to_id).strip()
        if priority is not None:
            ticket["priority"] = str(priority).strip()

        ticket["updated_at"] = now_iso

        if note and str(note).strip():
            clean_text = str(note).strip()
            notes_list = ticket.setdefault("notes", [])
            # Deduplicate by note_id or exact matching text + author
            is_dup = False
            for existing_n in notes_list:
                if note_id and str(existing_n.get("id")) == str(note_id):
                    is_dup = True
                    break
                if (
                    str(existing_n.get("note_text", "")).strip().lower() == clean_text.lower()
                    and str(existing_n.get("author_name", "")).strip().lower() == (author_name or "support agent").strip().lower()
                ):
                    is_dup = True
                    break

            if not is_dup:
                assigned_id = note_id if note_id else len(notes_list) + 1
                notes_list.append({
                    "id": assigned_id,
                    "note_text": clean_text,
                    "author_name": author_name or "Support Agent",
                    "author_email": author_email,
                    "created_at": now_iso,
                })

        if attachments is not None:
            ticket["attachments"] = attachments

        db[ticket["ticket_id"]] = ticket
        _save_db(db)
        return ticket

    @staticmethod
    def delete_ticket(ticket_id: str) -> bool:
        """Delete a single ticket by ticket ID."""
        clean_id = str(ticket_id).strip().lstrip("#").upper()
        db = _ensure_db_initialized()
        target_key = None
        for k in list(db.keys()):
            if k.strip().lstrip("#").upper() == clean_id:
                target_key = k
                break
        if target_key and target_key in db:
            del db[target_key]
            _save_db(db)
            return True
        return False

    @staticmethod
    def delete_tickets_bulk(ticket_ids: List[str]) -> List[str]:
        """Delete multiple tickets by IDs. Returns list of deleted IDs."""
        clean_ids = {str(tid).strip().lstrip("#").upper() for tid in ticket_ids if tid}
        db = _ensure_db_initialized()
        deleted = []
        for k in list(db.keys()):
            if k.strip().lstrip("#").upper() in clean_ids:
                del db[k]
                deleted.append(k)
        if deleted:
            _save_db(db)
        return deleted

    @staticmethod
    def delete_customer(customer_id: str) -> Dict[str, Any]:
        """Delete a customer from customers_db and remove all their associated tickets from tickets_db."""
        if not customer_id:
            return {"success": False, "deleted_tickets_count": 0}

        clean_id = str(customer_id).strip().lstrip("#").upper()
        digits = re.findall(r"\d+", clean_id)
        formatted_cids = {clean_id}
        if digits:
            formatted_cids.add(f"CUST-{int(digits[0]):03d}")

        # 1. Remove from customers DB
        cdb = _ensure_customers_db()
        cust_target_key = None
        cust_email = ""
        for k, c in list(cdb.items()):
            c_cid = str(c.get("customer_id", "")).strip().lstrip("#").upper()
            c_email = str(c.get("customer_email", "")).strip().lower()
            if c_cid in formatted_cids or k.strip().lstrip("#").upper() in formatted_cids or c_email == clean_id.lower():
                cust_target_key = k
                cust_email = c_email
                break

        if cust_target_key and cust_target_key in cdb:
            del cdb[cust_target_key]
            _save_customers_db(cdb)

        # 2. Delete all tickets for this customer from tickets DB
        db = _ensure_db_initialized()
        deleted_tickets = []
        for k, t in list(db.items()):
            t_cid = str(t.get("customer_id", "")).strip().lstrip("#").upper()
            t_email = str(t.get("customer_email", "")).strip().lower()
            if t_cid in formatted_cids or (cust_email and t_email == cust_email) or (clean_id.lower() and t_email == clean_id.lower()):
                del db[k]
                deleted_tickets.append(k)

        if deleted_tickets:
            _save_db(db)

        return {
            "success": True,
            "customer_id": customer_id,
            "deleted_tickets_count": len(deleted_tickets),
            "deleted_ticket_ids": deleted_tickets,
            "message": f"Customer and {len(deleted_tickets)} associated ticket(s) removed successfully.",
        }

