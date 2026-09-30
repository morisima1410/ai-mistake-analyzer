"""
Pydantic schemas for request and response validation.
"""

from typing import Dict, List, Optional
from pydantic import BaseModel, Field, EmailStr, field_validator


# User Authentication Schemas
class RegisterRequest(BaseModel):
    full_name: str = Field(..., min_length=2, max_length=100)
    email: EmailStr
    password: str = Field(..., min_length=6, max_length=128)
    confirm_password: str = Field(..., min_length=6, max_length=128)

    @field_validator("full_name")
    @classmethod
    def validate_name(cls, v: str) -> str:
        trimmed = v.strip()
        if not trimmed:
            raise ValueError("Full Name is required")
        return trimmed

    @field_validator("confirm_password")
    @classmethod
    def passwords_match(cls, v: str, info) -> str:
        if "password" in info.data and v != info.data["password"]:
            raise ValueError("Passwords do not match")
        return v


class LoginRequest(BaseModel):
    email: EmailStr
    password: str = Field(..., min_length=1)


class UserResponse(BaseModel):
    id: int
    full_name: str
    email: str
    created_at: str


class UpdateProfileRequest(BaseModel):
    full_name: str = Field(..., min_length=2, max_length=100)

    @field_validator("full_name")
    @classmethod
    def validate_name(cls, v: str) -> str:
        trimmed = v.strip()
        if not trimmed:
            raise ValueError("Full Name cannot be empty")
        return trimmed


# Mistake Analyzer Schemas
class AnalyzeRequest(BaseModel):
    question: str = Field(..., min_length=1)
    student_answer: str = Field(..., min_length=1)
    subject: str = Field(..., min_length=1)

    @field_validator("question", "student_answer", "subject")
    @classmethod
    def not_empty(cls, v: str) -> str:
        trimmed = v.strip()
        if not trimmed:
            raise ValueError("Field cannot be empty")
        return trimmed


class AnalyzeResponse(BaseModel):
    id: Optional[int] = None
    is_correct: bool
    mistake_type: str
    confidence: float
    correct_answer: str
    why_wrong: str
    explanation: str
    learning_tip: str
    practice_question: str
    difficulty: str
    created_at: Optional[str] = None


# Dashboard Schemas
class RecentMistakeItem(BaseModel):
    id: int
    question: str
    student_answer: str
    subject: str
    is_correct: bool
    mistake_type: str
    confidence: float
    created_at: str


class DashboardResponse(BaseModel):
    user_name: str
    total_questions: int
    correct_answers: int
    mistakes: int
    accuracy: float
    mistake_breakdown: Dict[str, int]
    recent_mistakes: List[RecentMistakeItem]


# Contact Message Schemas
class ContactRequest(BaseModel):
    name: str = Field(..., min_length=2, max_length=100)
    email: EmailStr
    message: str = Field(..., min_length=5, max_length=2000)

    @field_validator("name", "message")
    @classmethod
    def validate_content(cls, v: str) -> str:
        trimmed = v.strip()
        if not trimmed:
            raise ValueError("Field cannot be empty")
        return trimmed
