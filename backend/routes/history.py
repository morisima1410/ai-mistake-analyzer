"""
History route: provides viewing, deleting, and clearing user-specific mistake analyses.
"""

from typing import List
from fastapi import APIRouter, HTTPException, Depends, status
import sqlite3

from backend.database import get_db
from backend.auth import get_current_user
from backend.schemas import AnalyzeResponse

router = APIRouter(prefix="/api/history", tags=["History"])


@router.get("", response_model=List[AnalyzeResponse])
def get_user_history(
    current_user: dict = Depends(get_current_user),
    db: sqlite3.Connection = Depends(get_db),
):
    """Retrieve only the logged-in user's analysis history, ordered newest first."""
    cursor = db.cursor()
    cursor.execute(
        """
        SELECT id, question, student_answer, subject, is_correct,
               mistake_type, confidence, correct_answer, why_wrong,
               explanation, learning_tip, practice_question, difficulty, created_at
        FROM mistakes
        WHERE user_id = ?
        ORDER BY id DESC
        """,
        (current_user["id"],),
    )
    rows = cursor.fetchall()
    return [
        AnalyzeResponse(
            id=r["id"],
            is_correct=bool(r["is_correct"]),
            mistake_type=r["mistake_type"],
            confidence=float(r["confidence"]),
            correct_answer=r["correct_answer"],
            why_wrong=r["why_wrong"],
            explanation=r["explanation"],
            learning_tip=r["learning_tip"],
            practice_question=r["practice_question"],
            difficulty=r["difficulty"],
            created_at=str(r["created_at"]),
        )
        for r in rows
    ]


@router.get("/{item_id}", response_model=AnalyzeResponse)
def get_user_history_item(
    item_id: int,
    current_user: dict = Depends(get_current_user),
    db: sqlite3.Connection = Depends(get_db),
):
    """Retrieve a single analysis item belonging to the logged-in user."""
    cursor = db.cursor()
    cursor.execute(
        """
        SELECT id, question, student_answer, subject, is_correct,
               mistake_type, confidence, correct_answer, why_wrong,
               explanation, learning_tip, practice_question, difficulty, created_at
        FROM mistakes
        WHERE id = ? AND user_id = ?
        """,
        (item_id, current_user["id"]),
    )
    r = cursor.fetchone()
    if not r:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Mistake record not found or access denied.",
        )

    return AnalyzeResponse(
        id=r["id"],
        is_correct=bool(r["is_correct"]),
        mistake_type=r["mistake_type"],
        confidence=float(r["confidence"]),
        correct_answer=r["correct_answer"],
        why_wrong=r["why_wrong"],
        explanation=r["explanation"],
        learning_tip=r["learning_tip"],
        practice_question=r["practice_question"],
        difficulty=r["difficulty"],
        created_at=str(r["created_at"]),
    )


@router.delete("/{item_id}")
def delete_user_history_item(
    item_id: int,
    current_user: dict = Depends(get_current_user),
    db: sqlite3.Connection = Depends(get_db),
):
    """Delete a single analysis record belonging to the logged-in user."""
    cursor = db.cursor()
    cursor.execute(
        "DELETE FROM mistakes WHERE id = ? AND user_id = ?",
        (item_id, current_user["id"]),
    )
    if cursor.rowcount == 0:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Record not found or access denied.",
        )
    db.commit()
    return {"message": "Analysis deleted successfully."}


@router.delete("")
def clear_user_history(
    current_user: dict = Depends(get_current_user),
    db: sqlite3.Connection = Depends(get_db),
):
    """Clear all analysis records for the logged-in user."""
    cursor = db.cursor()
    cursor.execute("DELETE FROM mistakes WHERE user_id = ?", (current_user["id"],))
    db.commit()
    return {"message": "All your history has been cleared successfully."}
