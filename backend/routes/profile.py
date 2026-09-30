"""
Profile route for viewing user details and updating full name.
"""

from fastapi import APIRouter, HTTPException, Depends, status
import sqlite3

from backend.database import get_db
from backend.auth import get_current_user
from backend.schemas import UserResponse, UpdateProfileRequest

router = APIRouter(prefix="/api/profile", tags=["Profile"])


@router.get("", response_model=UserResponse)
def get_profile(current_user: dict = Depends(get_current_user)):
    """Return user profile data."""
    return UserResponse(
        id=current_user["id"],
        full_name=current_user["full_name"],
        email=current_user["email"],
        created_at=current_user["created_at"],
    )


@router.put("", response_model=UserResponse)
def update_profile(
    request: UpdateProfileRequest,
    current_user: dict = Depends(get_current_user),
    db: sqlite3.Connection = Depends(get_db),
):
    """Update user's full name."""
    new_name = request.full_name.strip()
    if not new_name:
        raise HTTPException(
            status_code=status.HTTP_422_UNPROCESSABLE_ENTITY,
            detail="Full name cannot be empty.",
        )

    cursor = db.cursor()
    cursor.execute(
        "UPDATE users SET full_name = ? WHERE id = ?",
        (new_name, current_user["id"]),
    )
    db.commit()

    return UserResponse(
        id=current_user["id"],
        full_name=new_name,
        email=current_user["email"],
        created_at=current_user["created_at"],
    )
