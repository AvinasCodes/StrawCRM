import json
import logging
import time
from pathlib import Path
from typing import List, Dict, Any, Optional
from fastapi import APIRouter, Query
from pydantic import BaseModel

logger = logging.getLogger("strawcrm.users")

router = APIRouter(prefix="/api/users", tags=["Users"])

DATA_DIR = Path(__file__).resolve().parent.parent.parent / "data"
USERS_FILE = DATA_DIR / "users_db.json"

# Legitimate default authenticatable agents for initial system state
DEFAULT_AUTHENTICATED_AGENTS: List[Dict[str, Any]] = [
    {
        "id": "agent_avinash",
        "name": "Avinash Singh",
        "email": "heyavinashs@gmail.com",
        "role": "Lead Administrator",
        "department": "Platform Operations",
        "avatar": "AS",
        "color": "from-blue-600 to-cyan-600",
        "status": "Online",
        "last_seen_ts": time.time(),
    },
    {
        "id": "agent_aaryan",
        "name": "Aaryan Singh",
        "email": "agent@datastraw.in",
        "role": "Operations Lead",
        "department": "Incident Response",
        "avatar": "AS",
        "color": "from-purple-600 to-indigo-600",
        "status": "Offline",
        "last_seen_ts": 0,
    },
]


def _ensure_users_db() -> Dict[str, Dict[str, Any]]:
    """Ensure data/users_db.json exists and returns dict of users keyed by lowercase email."""
    DATA_DIR.mkdir(parents=True, exist_ok=True)
    if not USERS_FILE.exists():
        initial_map = {u["email"].lower(): u for u in DEFAULT_AUTHENTICATED_AGENTS}
        try:
            with open(USERS_FILE, "w", encoding="utf-8") as f:
                json.dump(initial_map, f, indent=2)
        except Exception as e:
            logger.warning("Could not write initial users_db.json: %s", e)
        return initial_map

    try:
        with open(USERS_FILE, "r", encoding="utf-8") as f:
            text = f.read().strip()
            if not text:
                return {}
            data = json.loads(text)
            if isinstance(data, dict):
                # Clean up any legacy dummy customer entries
                clean = {}
                for k, v in data.items():
                    email = str(v.get("email") or k).strip().lower()
                    # Filter out dummy ticket client contacts
                    if v.get("role") == "Client Contact" or v.get("department") == "External Client":
                        continue
                    if "@fintechflow.com" in email or "@lagostech.ng" in email:
                        continue
                    clean[email] = v
                return clean
    except Exception as e:
        logger.warning("Error reading users_db.json: %s", e)

    return {}


def _save_users_db(users_map: Dict[str, Dict[str, Any]]):
    """Save users dictionary to users_db.json."""
    try:
        with open(USERS_FILE, "w", encoding="utf-8") as f:
            json.dump(users_map, f, indent=2)
    except Exception as e:
        logger.warning("Error saving users_db.json: %s", e)


class HeartbeatPayload(BaseModel):
    id: Optional[str] = None
    name: Optional[str] = None
    email: str
    avatar: Optional[str] = None
    role: Optional[str] = None
    department: Optional[str] = "Platform Operations"
    color: Optional[str] = "from-brand-electric to-blue-600"
    status: Optional[str] = "Online"


class RoleUpdatePayload(BaseModel):
    email: str
    role: str


@router.get("")
async def list_users(
    status: Optional[str] = None,
    search: Optional[str] = None,
):
    """
    Fetch all authenticated agents across the CRM platform.
    Returns ONLY authenticated users who have logged into StrawCRM.
    Computes real-time presence: any agent active within the last 120 seconds is Online.
    """
    users_map = _ensure_users_db()
    current_time = time.time()

    user_list = []
    for email, user in users_map.items():
        last_seen = float(user.get("last_seen_ts") or 0)
        saved_status = user.get("status", "Offline")

        # An agent is Online if seen within last 180s and not explicitly set to Offline
        is_online = (current_time - last_seen < 180) and (saved_status != "Offline")

        # Format user object for client consumption
        user_copy = dict(user)
        user_copy["status"] = "Online" if is_online else "Offline"
        user_list.append(user_copy)

    # Search filter
    if isinstance(search, str) and search.strip():
        q = search.strip().lower()
        user_list = [
            u for u in user_list
            if q in (u.get("name") or "").lower()
            or q in (u.get("email") or "").lower()
            or q in (u.get("role") or "").lower()
        ]

    # Status filter
    if isinstance(status, str) and status.strip().lower() in ["online", "offline"]:
        target_status = status.strip().title()
        user_list = [u for u in user_list if u.get("status") == target_status]

    # Sort: Online agents first, then alphabetically by name
    user_list.sort(key=lambda u: (0 if u.get("status") == "Online" else 1, (u.get("name") or "").lower()))

    online_count = sum(1 for u in user_list if u.get("status") == "Online")
    offline_count = sum(1 for u in user_list if u.get("status") == "Offline")

    return {
        "total": len(user_list),
        "online_count": online_count,
        "offline_count": offline_count,
        "users": user_list,
    }


@router.post("/heartbeat")
async def user_heartbeat(payload: HeartbeatPayload):
    """
    Register or update real-time presence for an authenticated user.
    """
    users_map = _ensure_users_db()
    email = payload.email.strip().lower()
    now = time.time()

    current_user = users_map.get(email, {})
    updated = {
        "id": payload.id or current_user.get("id") or f"agent_{email.split('@')[0]}",
        "name": payload.name or current_user.get("name") or email.split("@")[0].title(),
        "email": payload.email,
        "avatar": payload.avatar or current_user.get("avatar") or email[:2].upper(),
        "role": payload.role or current_user.get("role") or "Support Agent",
        "department": payload.department or current_user.get("department") or "Platform Operations",
        "color": payload.color or current_user.get("color") or "from-blue-600 to-cyan-600",
        "status": payload.status or "Online",
        "last_seen_ts": now if payload.status != "Offline" else 0,
    }

    users_map[email] = updated
    _save_users_db(users_map)

    return {"success": True, "user": updated}


@router.post("/role")
async def update_agent_role(payload: RoleUpdatePayload):
    """
    Update an agent's assigned role.
    """
    users_map = _ensure_users_db()
    email = payload.email.strip().lower()

    if email in users_map:
        users_map[email]["role"] = payload.role.strip()
        _save_users_db(users_map)
        return {"success": True, "user": users_map[email]}

    return {"success": False, "detail": "User not found"}
