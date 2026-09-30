"""
CLI API Bridge for AI Mistake Analyzer.
Allows the development server to execute the exact Python backend, SQLite,
authentication, scikit-learn ML, and Gemini pipelines.
"""

import sys
import os
import json
import sqlite3

# Ensure workspace root is in sys.path
BASE_DIR = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
if BASE_DIR not in sys.path:
    sys.path.insert(0, BASE_DIR)

from backend.database import get_db_connection, init_db
from backend.auth import hash_password, verify_password, create_session, delete_session
from backend.ml_model import ml_classifier
from backend.ai_service import analyze_with_gemini


def get_user_from_token(token: str, conn: sqlite3.Connection):
    if not token:
        return None
    cursor = conn.cursor()
    cursor.execute(
        """
        SELECT u.id, u.full_name, u.email, u.created_at
        FROM users u
        INNER JOIN sessions s ON u.id = s.user_id
        WHERE s.token = ?
        """,
        (token,),
    )
    row = cursor.fetchone()
    if row:
        return {
            "id": row["id"],
            "full_name": row["full_name"],
            "email": row["email"],
            "created_at": str(row["created_at"]),
        }
    return None


def main():
    init_db()
    if len(sys.argv) < 2:
        print(json.dumps({"error": "No payload provided"}))
        sys.exit(1)

    raw_input = sys.argv[1]
    try:
        req = json.loads(raw_input)
    except Exception as e:
        print(json.dumps({"error": f"Invalid JSON payload: {e}"}))
        sys.exit(1)

    action = req.get("action")
    token = req.get("token")
    conn = get_db_connection()
    cursor = conn.cursor()

    try:
        # 1. Register
        if action == "register":
            full_name = (req.get("full_name") or "").strip()
            email = (req.get("email") or "").strip().lower()
            password = req.get("password") or ""
            confirm_password = req.get("confirm_password") or ""

            if not full_name or not email or not password:
                print(json.dumps({"status": 400, "detail": "All fields are required."}))
                return
            if password != confirm_password:
                print(json.dumps({"status": 400, "detail": "Passwords do not match."}))
                return
            if len(password) < 6:
                print(json.dumps({"status": 400, "detail": "Password must be at least 6 characters."}))
                return

            cursor.execute("SELECT id FROM users WHERE email = ?", (email,))
            if cursor.fetchone():
                print(json.dumps({"status": 400, "detail": "An account with this email already exists."}))
                return

            pwd_hash = hash_password(password)
            cursor.execute(
                "INSERT INTO users (full_name, email, password_hash) VALUES (?, ?, ?)",
                (full_name, email, pwd_hash),
            )
            conn.commit()
            print(json.dumps({"status": 201, "message": "Account created successfully. Please login."}))
            return

        # 2. Login
        elif action == "login":
            email = (req.get("email") or "").strip().lower()
            password = req.get("password") or ""

            cursor.execute("SELECT id, full_name, email, password_hash FROM users WHERE email = ?", (email,))
            user = cursor.fetchone()

            if not user or not verify_password(password, user["password_hash"]):
                print(json.dumps({"status": 401, "detail": "Invalid email or password."}))
                return

            new_token = create_session(user["id"], conn)
            print(json.dumps({
                "status": 200,
                "message": "Login successful",
                "token": new_token,
                "user": {
                    "id": user["id"],
                    "full_name": user["full_name"],
                    "email": user["email"],
                }
            }))
            return

        # 3. Logout
        elif action == "logout":
            if token:
                delete_session(token, conn)
            print(json.dumps({"status": 200, "message": "Logged out successfully."}))
            return

        # 4. Me (Check Auth)
        elif action == "me":
            user = get_user_from_token(token, conn)
            if not user:
                print(json.dumps({"status": 401, "detail": "Authentication required. Please login."}))
                return
            print(json.dumps({"status": 200, **user}))
            return

        # 5. Dashboard
        elif action == "dashboard":
            user = get_user_from_token(token, conn)
            if not user:
                print(json.dumps({"status": 401, "detail": "Authentication required. Please login."}))
                return
            user_id = user["id"]

            cursor.execute("SELECT COUNT(*) AS total FROM mistakes WHERE user_id = ?", (user_id,))
            total = cursor.fetchone()["total"]

            cursor.execute("SELECT COUNT(*) AS correct FROM mistakes WHERE user_id = ? AND is_correct = 1", (user_id,))
            correct = cursor.fetchone()["correct"]

            mistakes = total - correct
            accuracy = round((correct / total * 100), 1) if total > 0 else 0.0

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
                {
                    "id": r["id"],
                    "question": r["question"],
                    "student_answer": r["student_answer"],
                    "subject": r["subject"],
                    "is_correct": bool(r["is_correct"]),
                    "mistake_type": r["mistake_type"],
                    "confidence": float(r["confidence"]),
                    "created_at": str(r["created_at"]),
                }
                for r in recent_rows
            ]

            print(json.dumps({
                "status": 200,
                "user_name": user["full_name"],
                "total_questions": total,
                "correct_answers": correct,
                "mistakes": mistakes,
                "accuracy": accuracy,
                "mistake_breakdown": mistake_breakdown,
                "recent_mistakes": recent_mistakes,
            }))
            return

        # 6. Analyze
        elif action == "analyze":
            user = get_user_from_token(token, conn)
            if not user:
                print(json.dumps({"status": 401, "detail": "Authentication required. Please login."}))
                return

            question = (req.get("question") or "").strip()
            student_answer = (req.get("student_answer") or "").strip()
            subject = (req.get("subject") or "").strip()

            if not question or not student_answer or not subject:
                print(json.dumps({"status": 422, "detail": "Question, student answer, and subject must all be non-empty."}))
                return

            # ML Classifier
            ml_result = ml_classifier.predict(question, student_answer)
            ml_suggestion = ml_result.get("suggested_type")
            ml_confidence = ml_result.get("confidence", 0.0)

            # Gemini Call
            diagnosis = analyze_with_gemini(
                question=question,
                student_answer=student_answer,
                subject=subject,
                ml_suggestion=ml_suggestion,
                ml_confidence=ml_confidence,
            )

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
                    user["id"],
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
            conn.commit()
            record_id = cursor.lastrowid

            cursor.execute("SELECT created_at FROM mistakes WHERE id = ?", (record_id,))
            created_at = str(cursor.fetchone()["created_at"])

            print(json.dumps({
                "status": 200,
                "id": record_id,
                "is_correct": diagnosis["is_correct"],
                "mistake_type": diagnosis["mistake_type"],
                "confidence": diagnosis["confidence"],
                "correct_answer": diagnosis["correct_answer"],
                "why_wrong": diagnosis["why_wrong"],
                "explanation": diagnosis["explanation"],
                "learning_tip": diagnosis["learning_tip"],
                "practice_question": diagnosis["practice_question"],
                "difficulty": diagnosis["difficulty"],
                "created_at": created_at,
            }))
            return

        # 7. History
        elif action == "history":
            user = get_user_from_token(token, conn)
            if not user:
                print(json.dumps({"status": 401, "detail": "Authentication required. Please login."}))
                return

            cursor.execute(
                """
                SELECT id, question, student_answer, subject, is_correct,
                       mistake_type, confidence, correct_answer, why_wrong,
                       explanation, learning_tip, practice_question, difficulty, created_at
                FROM mistakes
                WHERE user_id = ?
                ORDER BY id DESC
                """,
                (user["id"],),
            )
            rows = cursor.fetchall()
            results = [
                {
                    "id": r["id"],
                    "question": r["question"],
                    "student_answer": r["student_answer"],
                    "subject": r["subject"],
                    "is_correct": bool(r["is_correct"]),
                    "mistake_type": r["mistake_type"],
                    "confidence": float(r["confidence"]),
                    "correct_answer": r["correct_answer"],
                    "why_wrong": r["why_wrong"],
                    "explanation": r["explanation"],
                    "learning_tip": r["learning_tip"],
                    "practice_question": r["practice_question"],
                    "difficulty": r["difficulty"],
                    "created_at": str(r["created_at"]),
                }
                for r in rows
            ]
            print(json.dumps({"status": 200, "data": results}))
            return

        # 8. Delete History Item
        elif action == "delete_history_item":
            user = get_user_from_token(token, conn)
            if not user:
                print(json.dumps({"status": 401, "detail": "Authentication required. Please login."}))
                return

            item_id = req.get("item_id")
            cursor.execute("DELETE FROM mistakes WHERE id = ? AND user_id = ?", (item_id, user["id"]))
            conn.commit()
            print(json.dumps({"status": 200, "message": "Analysis deleted successfully."}))
            return

        # 9. Clear All History
        elif action == "clear_history":
            user = get_user_from_token(token, conn)
            if not user:
                print(json.dumps({"status": 401, "detail": "Authentication required. Please login."}))
                return

            cursor.execute("DELETE FROM mistakes WHERE user_id = ?", (user["id"],))
            conn.commit()
            print(json.dumps({"status": 200, "message": "All your history has been cleared successfully."}))
            return

        # 10. Profile Update
        elif action == "profile":
            user = get_user_from_token(token, conn)
            if not user:
                print(json.dumps({"status": 401, "detail": "Authentication required. Please login."}))
                return

            method = req.get("method", "GET")
            if method == "PUT":
                new_name = (req.get("full_name") or "").strip()
                if not new_name:
                    print(json.dumps({"status": 422, "detail": "Full name cannot be empty."}))
                    return
                cursor.execute("UPDATE users SET full_name = ? WHERE id = ?", (new_name, user["id"]))
                conn.commit()
                user["full_name"] = new_name

            print(json.dumps({"status": 200, **user}))
            return

        # 11. Contact
        elif action == "contact":
            name = (req.get("name") or "").strip()
            email = (req.get("email") or "").strip()
            message = (req.get("message") or "").strip()

            if not name or not email or not message:
                print(json.dumps({"status": 422, "detail": "All fields are required."}))
                return

            cursor.execute(
                "INSERT INTO contact_messages (name, email, message) VALUES (?, ?, ?)",
                (name, email, message),
            )
            conn.commit()
            print(json.dumps({"status": 201, "message": "Your message has been sent successfully."}))
            return

        else:
            print(json.dumps({"status": 404, "detail": "Unknown action"}))

    finally:
        conn.close()


if __name__ == "__main__":
    main()
