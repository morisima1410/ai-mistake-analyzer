"""
Dashboard route providing user-specific learning statistics, mistake breakdowns, and recent mistakes.
"""

from fastapi import APIRouter, Depends
import sqlite3

from backend.database import get_db
from backend.auth import get_current_user
from backend.schemas import DashboardResponse, RecentMistakeItem

router = APIRouter(prefix="/api/dashboard", tags=["Dashboard"])


@router.get("", response_model=DashboardResponse)
def get_dashboard_data(
    current_user: dict = Depends(get_current_user),
    db: sqlite3.Connection = Depends(get_db),
):
    """Fetch user-specific learning analytics and recent mistakes."""
    user_id = current_user["id"]
    cursor = db.cursor()

    # User total questions
    cursor.execute("SELECT COUNT(*) AS total FROM mistakes WHERE user_id = ?", (user_id,))
    total = cursor.fetchone()["total"]

    # User correct answers
    cursor.execute("SELECT COUNT(*) AS correct FROM mistakes WHERE user_id = ? AND is_correct = 1", (user_id,))
    correct = cursor.fetchone()["correct"]

    mistakes = total - correct
    accuracy = round((correct / total * 100), 1) if total > 0 else 0.0

    # User mistake breakdown
    cursor.execute(
        """
        SELECT mistake_type, COUNT(*) AS count
        FROM mistakes
        WHERE user_id = ? AND is_correct = 0
        GROUP BY mistake_type
        ORDER BY count DESC
        """,
        (user_id,),
    )
    breakdown_rows = cursor.fetchall()
    mistake_breakdown = {row["mistake_type"]: row["count"] for row in breakdown_rows}

    # User recent mistakes (last 5)
    cursor.execute(
        """
        SELECT id, question, student_answer, subject, is_correct, mistake_type, confidence, created_at
        FROM mistakes
        WHERE user_id = ?
        ORDER BY id DESC
        LIMIT 5
        """,
        (user_id,),
    )
    recent_rows = cursor.fetchall()
    recent_mistakes = [
        RecentMistakeItem(
            id=r["id"],
            question=r["question"],
            student_answer=r["student_answer"],
            subject=r["subject"],
            is_correct=bool(r["is_correct"]),
            mistake_type=r["mistake_type"],
            confidence=float(r["confidence"]),
            created_at=str(r["created_at"]),
        )
        for r in recent_rows
    ]

    return DashboardResponse(
        user_name=current_user["full_name"],
        total_questions=total,
        correct_answers=correct,
        mistakes=mistakes,
        accuracy=accuracy,
        mistake_breakdown=mistake_breakdown,
        recent_mistakes=recent_mistakes,
    )
