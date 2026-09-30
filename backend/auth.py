"""
Authentication and security helpers for AI Mistake Analyzer.
Implements PBKDF2-HMAC-SHA256 password hashing and session verification.
"""

import hashlib
import secrets
import sqlite3
from typing import Optional
from backend.database import get_db

try:
    from fastapi import Request, HTTPException, status, Depends
except ImportError:
    Request = None
    HTTPException = Exception
    status = None
    Depends = lambda x: x


def hash_password(password: str) -> str:
    """Hash password using PBKDF2-HMAC-SHA256 with a unique cryptographic salt."""
    salt = secrets.token_hex(16)
    key = hashlib.pbkdf2_hmac("sha256", password.encode("utf-8"), salt.encode("utf-8"), 100000)
    return f"{salt}${key.hex()}"


def verify_password(plain_password: str, stored_hash: str) -> bool:
    """Verify plain password against stored salt$hash string."""
    try:
        salt, key_hex = stored_hash.split("$", 1)
        expected_key = hashlib.pbkdf2_hmac("sha256", plain_password.encode("utf-8"), salt.encode("utf-8"), 100000)
        return secrets.compare_digest(key_hex, expected_key.hex())
    except Exception:
        return False


def create_session(user_id: int, db: sqlite3.Connection) -> str:
    """Generate and store a new secure session token."""
    token = secrets.token_urlsafe(32)
    cursor = db.cursor()
    cursor.execute("INSERT INTO sessions (token, user_id) VALUES (?, ?)", (token, user_id))
    db.commit()
    return token


def delete_session(token: str, db: sqlite3.Connection) -> None:
    """Remove a session token from the database upon logout."""
    cursor = db.cursor()
    cursor.execute("DELETE FROM sessions WHERE token = ?", (token,))
    db.commit()


def get_current_user(request: Request, db: sqlite3.Connection = Depends(get_db)) -> dict:
    """
    Extract token from Authorization Bearer header or cookie and retrieve user.
    Raises 401 if unauthenticated.
    """
    token = None
    auth_header = request.headers.get("Authorization")
    if auth_header and auth_header.startswith("Bearer "):
        token = auth_header[7:].strip()
    elif "session_token" in request.cookies:
        token = request.cookies.get("session_token")

    if not token:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Authentication required. Please login.",
        )

    cursor = db.cursor()
    cursor.execute(
        """
        SELECT u.id, u.full_name, u.email, u.created_at
        FROM users u
        INNER JOIN sessions s ON u.id = s.user_id
        WHERE s.token = ?
        """,
        (token,),
    )
    user_row = cursor.fetchone()
    if not user_row:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Invalid or expired session. Please login.",
        )

    return {
        "id": user_row["id"],
        "full_name": user_row["full_name"],
        "email": user_row["email"],
        "created_at": str(user_row["created_at"]),
        "session_token": token,
    }
