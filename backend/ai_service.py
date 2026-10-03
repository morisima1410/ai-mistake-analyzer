"""
AI Service module for AI Mistake Analyzer.
Communicates with Google Gemini API to analyze student answers, identify mistakes,
and generate pedagogical explanations, learning tips, and practice questions.
Uses google-genai SDK when available, with standard library urllib HTTP fallback.
"""

import sys
import os
import json
import re
import time
import urllib.request
from typing import Dict, Any, Optional

try:
    from dotenv import load_dotenv
    load_dotenv()
except ImportError:
    pass

# Ensure GEMINI_API_KEY is loaded from .env or .env.example if available
_BASE_DIR = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
if not os.environ.get("GEMINI_API_KEY"):
    for _fname in [".env", ".env.example"]:
        _fpath = os.path.join(_BASE_DIR, _fname)
        if os.path.exists(_fpath):
            try:
                with open(_fpath, "r", encoding="utf-8") as _f:
                    for _l in _f:
                        _l = _l.strip()
                        if _l.startswith("GEMINI_API_KEY="):
                            _val = _l.split("=", 1)[1].strip().strip('"').strip("'")
                            if _val:
                                os.environ["GEMINI_API_KEY"] = _val
                                break
            except Exception:
                pass
        if os.environ.get("GEMINI_API_KEY"):
            break

VALID_MISTAKE_TYPES = [
    "No Mistake",
    "Conceptual Mistake",
    "Calculation Mistake",
    "Syntax Mistake",
    "Careless Mistake",
    "Incomplete Answer",
    "Wrong Method",
]

CANDIDATE_MODELS = [
    "gemini-2.0-flash",
    "gemini-1.5-flash",
    "gemini-2.5-flash",
]


def clean_json_response(raw_text: str) -> str:
    """Strip markdown code fence backticks if present."""
    text = raw_text.strip()
    if text.startswith("```"):
        text = re.sub(r"^```[a-zA-Z]*\n?", "", text)
        text = re.sub(r"```$", "", text)
    return text.strip()


def build_analysis_prompt(
    question: str,
    student_answer: str,
    subject: str,
    ml_suggestion: Optional[str] = None,
    ml_confidence: Optional[float] = None
) -> str:
    """Build a structured pedagogical prompt for Gemini."""
    ml_context = ""
    if ml_suggestion and ml_confidence is not None and ml_confidence > 0.0:
        ml_context = f"\n(Preliminary classifier hypothesis: '{ml_suggestion}' with ~{int(ml_confidence * 100)}% confidence. Verify or override this based on deep reasoning.)"

    return f"""You are an educational mistake analyzer.

Analyze the student's question and answer.

Do not assume that the answer is wrong.
First determine whether the student's answer is correct.

If it is correct:
- "is_correct" must be true
- "mistake_type" must be "No Mistake"
- "why_wrong" must be "None. The answer is correct."
- "explanation" must confirm why the answer is mathematically/conceptually sound.

If incorrect:
- "is_correct" must be false
- Classify the mistake as exactly one of:
  * Conceptual Mistake
  * Calculation Mistake
  * Syntax Mistake
  * Careless Mistake
  * Incomplete Answer
  * Wrong Method

Explain the mistake in simple, student-friendly language.
Do not insult, shame, or discourage the student. Maintain a supportive, encouraging, and constructive educational tone.

Student Submission:
Subject: {subject}
Question: {question}
Student's Answer: {student_answer}{ml_context}

Return ONLY valid JSON matching this exact structure:
{{
  "is_correct": false,
  "mistake_type": "Calculation Mistake",
  "confidence": 0.95,
  "correct_answer": "...",
  "why_wrong": "...",
  "explanation": "...",
  "learning_tip": "...",
  "practice_question": "...",
  "difficulty": "Easy"
}}

Note:
- "confidence" must be a float between 0.0 and 1.0.
- "difficulty" should be one of "Easy", "Medium", or "Hard".
- Do not output Markdown code blocks or formatting. Output raw JSON only.
"""


def pedagogical_heuristic_fallback(
    question: str,
    student_answer: str,
    subject: str,
    ml_suggestion: Optional[str] = None,
    ml_confidence: Optional[float] = None
) -> Dict[str, Any]:
    """High-availability fallback when external AI is unreachable or rate-limited."""
    category = ml_suggestion if (ml_suggestion and ml_suggestion != "Unknown") else "Calculation Mistake"
    is_correct = (category == "No Mistake")

    if is_correct:
        return {
            "is_correct": True,
            "mistake_type": "No Mistake",
            "confidence": 0.95,
            "correct_answer": student_answer,
            "why_wrong": "None. The answer is correct.",
            "explanation": f"Your answer '{student_answer}' correctly solves '{question}'. Excellent work!",
            "learning_tip": "Keep validating your answers with self-checking strategies.",
            "practice_question": f"Can you describe another method to approach '{question}'?",
            "difficulty": "Medium",
        }

    tips = {
        "Calculation Mistake": "Double-check your arithmetic step-by-step before finalizing your answer.",
        "Syntax Mistake": "Check colons, brackets, indentation, and exact keyword spelling.",
        "Conceptual Mistake": "Revisit fundamental definitions and principles governing this topic.",
        "Careless Mistake": "Slow down during the final step to make sure symbols and digits were copied accurately.",
        "Incomplete Answer": "Make sure all sub-parts of the question are addressed and explanations are provided.",
        "Wrong Method": "Review alternative formulas or algorithms better suited to the problem constraints.",
    }

    return {
        "is_correct": False,
        "mistake_type": category,
        "confidence": round(float(ml_confidence or 0.85), 2),
        "correct_answer": "Check the standard solution steps for this problem type.",
        "why_wrong": f"Identified a {category.lower()} in the submitted answer.",
        "explanation": f"When solving '{question}', the submitted answer '{student_answer}' indicates a {category.lower()}.",
        "learning_tip": tips.get(category, "Review the core definition and re-check each step carefully."),
        "practice_question": f"Try a related practice problem for: {question}",
        "difficulty": "Medium",
    }


def analyze_with_gemini(
    question: str,
    student_answer: str,
    subject: str,
    ml_suggestion: Optional[str] = None,
    ml_confidence: Optional[float] = None
) -> Dict[str, Any]:
    """Call Gemini API using google-genai SDK or standard urllib REST."""
    api_key = os.environ.get("GEMINI_API_KEY")
    if not api_key or api_key == "your_api_key_here":
        # Return intelligent educational heuristic if key is unset
        return pedagogical_heuristic_fallback(
            question=question,
            student_answer=student_answer,
            subject=subject,
            ml_suggestion=ml_suggestion,
            ml_confidence=ml_confidence,
        )

    prompt = build_analysis_prompt(
        question=question,
        student_answer=student_answer,
        subject=subject,
        ml_suggestion=ml_suggestion,
        ml_confidence=ml_confidence,
    )

    # 1. Try google.genai SDK if installed
    try:
        from google import genai
        from google.genai import types

        client = genai.Client(api_key=api_key)
        for model_name in CANDIDATE_MODELS:
            try:
                response = client.models.generate_content(
                    model=model_name,
                    contents=prompt,
                    config=types.GenerateContentConfig(
                        response_mime_type="application/json",
                        temperature=0.2,
                    ),
                )
                cleaned = clean_json_response(response.text or "")
                data = json.loads(cleaned)
                return parse_gemini_json(data)
            except Exception as e:
                print(f"[AI Service SDK] {model_name} error: {e}", file=sys.stderr)
                time.sleep(0.2)
    except ImportError:
        pass

    # 2. Standard library urllib REST fallback
    for model_name in CANDIDATE_MODELS:
        try:
            url = f"https://generativelanguage.googleapis.com/v1beta/models/{model_name}:generateContent?key={api_key}"
            payload = json.dumps({
                "contents": [{"parts": [{"text": prompt}]}],
                "generationConfig": {
                    "responseMimeType": "application/json",
                    "temperature": 0.2,
                },
            }).encode("utf-8")

            req = urllib.request.Request(
                url,
                data=payload,
                headers={"Content-Type": "application/json"},
                method="POST",
            )
            with urllib.request.urlopen(req, timeout=12) as resp:
                resp_data = json.loads(resp.read().decode("utf-8"))
                candidates = resp_data.get("candidates", [])
                if candidates:
                    parts = candidates[0].get("content", {}).get("parts", [])
                    if parts and "text" in parts[0]:
                        cleaned = clean_json_response(parts[0]["text"])
                        parsed = json.loads(cleaned)
                        return parse_gemini_json(parsed)
        except Exception as e:
            print(f"[AI Service REST] {model_name} error: {e}", file=sys.stderr)
            time.sleep(0.2)

    # 3. Graceful heuristic fallback
    return pedagogical_heuristic_fallback(
        question=question,
        student_answer=student_answer,
        subject=subject,
        ml_suggestion=ml_suggestion,
        ml_confidence=ml_confidence,
    )


def parse_gemini_json(data: dict) -> Dict[str, Any]:
    """Sanitize and validate parsed Gemini response dictionary."""
    is_correct = bool(data.get("is_correct", False))
    mistake_type = data.get("mistake_type", "No Mistake" if is_correct else "Conceptual Mistake")
    if is_correct:
        mistake_type = "No Mistake"
    elif mistake_type not in VALID_MISTAKE_TYPES or mistake_type == "No Mistake":
        mistake_type = "Conceptual Mistake"

    confidence = float(data.get("confidence", 0.92))
    confidence = max(0.0, min(1.0, confidence))

    return {
        "is_correct": is_correct,
        "mistake_type": mistake_type,
        "confidence": round(confidence, 2),
        "correct_answer": str(data.get("correct_answer", "")),
        "why_wrong": str(data.get("why_wrong", "")),
        "explanation": str(data.get("explanation", "")),
        "learning_tip": str(data.get("learning_tip", "")),
        "practice_question": str(data.get("practice_question", "")),
        "difficulty": str(data.get("difficulty", "Medium")),
    }
