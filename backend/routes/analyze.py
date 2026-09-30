"""
Analysis route: receives student question, answer, and subject, performs ML pre-classification,
runs Gemini pedagogical diagnosis, and saves the record attached to the authenticated user.
"""

from fastapi import APIRouter, HTTPException, Depends, status
import sqlite3

from backend.database import get_db
from backend.auth import get_current_user
from backend.schemas import AnalyzeRequest, AnalyzeResponse
from backend.ml_model import ml_classifier
from backend.ai_service import analyze_with_gemini

router = APIRouter(prefix="/api/analyze", tags=["Analyze"])


@router.post("", response_model=AnalyzeResponse)
async def analyze_submission(
    request: AnalyzeRequest,
    current_user: dict = Depends(get_current_user),
    db: sqlite3.Connection = Depends(get_db),
):
    """Diagnose student mistake using ML and Gemini, saving to user history."""
    question = request.question.strip()
    student_answer = request.student_answer.strip()
    subject = request.subject.strip()

    if not question or not student_answer or not subject:
        raise HTTPException(
            status_code=status.HTTP_422_UNPROCESSABLE_ENTITY,
            detail="Question, student answer, and subject must all be non-empty.",
        )

    # 1. Local ML Initial Classification
    ml_result = ml_classifier.predict(question, student_answer)
    ml_suggestion = ml_result.get("suggested_type")
    ml_confidence = ml_result.get("confidence", 0.0)

    # 2. Deep Pedagogical Diagnosis with Gemini
    try:
        diagnosis = analyze_with_gemini(
            question=question,
            student_answer=student_answer,
            subject=subject,
            ml_suggestion=ml_suggestion,
            ml_confidence=ml_confidence,
        )
    except PermissionError:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Invalid or unauthorized Gemini API key.",
        )
    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_503_SERVICE_UNAVAILABLE,
            detail=f"Analysis engine temporarily unavailable: {str(e)}",
        )

    # 3. Save into SQLite attached strictly to current_user['id']
    cursor = db.cursor()
    cursor.execute(
        """
        INSERT INTO mistakes (
            user_id, question, student_answer, subject, is_correct,
            mistake_type, confidence, correct_answer, why_wrong,
            explanation, learning_tip, practice_question, difficulty
        )
        VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
        """,
        (
            current_user["id"],
            question,
            student_answer,
            subject,
            1 if diagnosis["is_correct"] else 0,
            diagnosis["mistake_type"],
            diagnosis["confidence"],
            diagnosis["correct_answer"],
            diagnosis["why_wrong"],
            diagnosis["explanation"],
            diagnosis["learning_tip"],
            diagnosis["practice_question"],
            diagnosis["difficulty"],
        ),
    )
    db.commit()
    record_id = cursor.lastrowid

    # Fetch created_at timestamp
    cursor.execute("SELECT created_at FROM mistakes WHERE id = ?", (record_id,))
    row = cursor.fetchone()
    created_at = str(row["created_at"]) if row else None

    return AnalyzeResponse(
        id=record_id,
        is_correct=diagnosis["is_correct"],
        mistake_type=diagnosis["mistake_type"],
        confidence=diagnosis["confidence"],
        correct_answer=diagnosis["correct_answer"],
        why_wrong=diagnosis["why_wrong"],
        explanation=diagnosis["explanation"],
        learning_tip=diagnosis["learning_tip"],
        practice_question=diagnosis["practice_question"],
        difficulty=diagnosis["difficulty"],
        created_at=created_at,
    )
