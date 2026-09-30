"""
Contact route for saving messages to SQLite contact_messages table.
"""

from fastapi import APIRouter, HTTPException, Depends, status
import sqlite3

from backend.database import get_db
from backend.schemas import ContactRequest

router = APIRouter(prefix="/api/contact", tags=["Contact"])


@router.post("", status_code=status.HTTP_201_CREATED)
def submit_contact_message(request: ContactRequest, db: sqlite3.Connection = Depends(get_db)):
    """Store contact submission in contact_messages table."""
    name = request.name.strip()
    email = request.email.strip().lower()
    message = request.message.strip()

    if not name or not email or not message:
        raise HTTPException(
            status_code=status.HTTP_422_UNPROCESSABLE_ENTITY,
            detail="Name, email, and message are all required.",
        )

    cursor = db.cursor()
    cursor.execute(
        "INSERT INTO contact_messages (name, email, message) VALUES (?, ?, ?)",
        (name, email, message),
    )
    db.commit()

    return {"message": "Your message has been sent successfully."}
