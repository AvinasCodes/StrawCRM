from fastapi import APIRouter, Depends
from typing import Dict, Any
from app.core.security import get_current_user

router = APIRouter(prefix="/api/auth", tags=["Authentication"])


@router.get("/me")
async def get_current_user_profile(user: Dict[str, Any] = Depends(get_current_user)):
    """
    Returns the authenticated user's profile verified via Supabase JWT.
    Enforces authorization on private API layer.
    """
    return {
        "id": user.get("sub"),
        "email": user.get("email"),
        "role": user.get("role", "authenticated"),
        "authenticated": True,
    }


@router.get("/verify")
async def verify_session(user: Dict[str, Any] = Depends(get_current_user)):
    """Verify session token validity"""
    return {"valid": True, "user_id": user.get("sub")}
