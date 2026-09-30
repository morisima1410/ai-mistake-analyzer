"""
Authentication routes for registration, login, logout, and checking current user session.
"""

from fastapi import APIRouter, HTTPException, Depends, Response, status
import sqlite3

from backend.database import get_db
from backend.schemas import RegisterRequest, LoginRequest, UserResponse
from backend.auth import hash_password, verify_password, create_session, delete_session, get_current_user

router = APIRouter(prefix="/api/auth", tags=["Authentication"])


@router.post("/register", status_code=status.HTTP_201_CREATED)
def register(request: RegisterRequest, db: sqlite3.Connection = Depends(get_db)):
    """Register a new user, hash password, store in SQLite."""
    cursor = db.cursor()
    cursor.execute("SELECT id FROM users WHERE email = ?", (request.email.lower(),))
    if cursor.fetchone():
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="An account with this email already exists.",
        )

    pwd_hash = hash_password(request.password)
    try:
        cursor.execute(
            "INSERT INTO users (full_name, email, password_hash) VALUES (?, ?, ?)",
            (request.full_name.strip(), request.email.lower(), pwd_hash),
        )
        db.commit()
    except sqlite3.IntegrityError:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="An account with this email already exists.",
        )

    return {"message": "Account created successfully. Please login."}


@router.post("/login")
def login(request: LoginRequest, response: Response, db: sqlite3.Connection = Depends(get_db)):
    """Authenticate user credentials, establish session."""
    cursor = db.cursor()
    cursor.execute(
        "SELECT id, full_name, email, password_hash FROM users WHERE email = ?",
        (request.email.lower(),),
    )
    user = cursor.fetchone()

    # Generic error message to prevent account enumeration
    if not user or not verify_password(request.password, user["password_hash"]):
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Invalid email or password.",
        )

    token = create_session(user["id"], db)

    # Set httpOnly cookie and return token in JSON
    response.set_cookie(
        key="session_token",
        value=token,
        httponly=True,
        samesite="lax",
        max_age=60 * 60 * 24 * 7,  # 7 days
    )

    return {
        "message": "Login successful",
        "token": token,
        "user": {
            "id": user["id"],
            "full_name": user["full_name"],
            "email": user["email"],
        },
    }


@router.post("/logout")
def logout(response: Response, current_user: dict = Depends(get_current_user), db: sqlite3.Connection = Depends(get_db)):
    """Destroy session in database and clear cookie."""
    token = current_user.get("session_token")
    if token:
        delete_session(token, db)

    response.delete_cookie(key="session_token")
    return {"message": "Logged out successfully."}


@router.get("/me", response_model=UserResponse)
def get_me(current_user: dict = Depends(get_current_user)):
    """Return currently authenticated user data."""
    return UserResponse(
        id=current_user["id"],
        full_name=current_user["full_name"],
        email=current_user["email"],
        created_at=current_user["created_at"],
    )
