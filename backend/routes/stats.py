"""
API Route for summary statistics and mistake breakdowns.
"""

from fastapi import APIRouter, Depends
import sqlite3

from backend.schemas import StatsResponse
from backend.database import get_db

router = APIRouter(prefix="/api", tags=["Statistics"])


@router.get("/stats", response_model=StatsResponse)
def get_statistics(db: sqlite3.Connection = Depends(get_db)):
    """
    Calculate and return aggregate analytics:
    - Total questions analyzed
    - Number of correct answers
    - Total mistakes made
    - Accuracy percentage
    - Breakdown counts by mistake type
    """
    cursor = db.cursor()

    cursor.execute("SELECT COUNT(*) AS total FROM mistakes")
    total_row = cursor.fetchone()
    total = total_row["total"] if total_row else 0

    cursor.execute("SELECT COUNT(*) AS correct_count FROM mistakes WHERE is_correct = 1")
    correct_row = cursor.fetchone()
    correct = correct_row["correct_count"] if correct_row else 0

    mistakes = total - correct
    accuracy = round((correct / total * 100), 1) if total > 0 else 0.0

    cursor.execute(
        """
        SELECT mistake_type, COUNT(*) AS count
        FROM mistakes
        WHERE is_correct = 0
        GROUP BY mistake_type
        ORDER BY count DESC
        """
    )
    breakdown_rows = cursor.fetchall()
    mistake_breakdown = {row["mistake_type"]: row["count"] for row in breakdown_rows}

    return StatsResponse(
        total=total,
        correct=correct,
        mistakes=mistakes,
        accuracy=accuracy,
        mistake_breakdown=mistake_breakdown,
    )
