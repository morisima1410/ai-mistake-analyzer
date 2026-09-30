"""
Data models and entities for the SQLite database.
"""

from dataclasses import dataclass
from typing import Optional
import sqlite3


@dataclass
class MistakeModel:
    id: Optional[int]
    question: str
    student_answer: str
    subject: str
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

    @classmethod
    def from_row(cls, row: sqlite3.Row) -> "MistakeModel":
        """Convert a SQLite row into a MistakeModel."""
        return cls(
            id=row["id"],
            question=row["question"],
            student_answer=row["student_answer"],
            subject=row["subject"],
            is_correct=bool(row["is_correct"]),
            mistake_type=row["mistake_type"],
            confidence=float(row["confidence"]),
            correct_answer=row["correct_answer"],
            why_wrong=row["why_wrong"],
            explanation=row["explanation"],
            learning_tip=row["learning_tip"],
            practice_question=row["practice_question"],
            difficulty=row["difficulty"],
            created_at=str(row["created_at"]) if "created_at" in row.keys() else None,
        )

    def to_dict(self) -> dict:
        """Convert the model into a dictionary."""
        return {
            "id": self.id,
            "question": self.question,
            "student_answer": self.student_answer,
            "subject": self.subject,
            "is_correct": self.is_correct,
            "mistake_type": self.mistake_type,
            "confidence": self.confidence,
            "correct_answer": self.correct_answer,
            "why_wrong": self.why_wrong,
            "explanation": self.explanation,
            "learning_tip": self.learning_tip,
            "practice_question": self.practice_question,
            "difficulty": self.difficulty,
            "created_at": self.created_at,
        }
