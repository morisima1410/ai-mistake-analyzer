"""
Machine Learning Component for AI Mistake Analyzer.
Uses scikit-learn (TF-IDF Vectorizer + Logistic Regression) as a fast, local initial classifier
to detect the likely category of error based on the question and student answer.
"""

import os
import csv
from typing import Dict, Any, Optional

DATA_PATH = os.path.join(os.path.dirname(__file__), "..", "data", "training_data.csv")


class MistakeClassifier:
    """TF-IDF + Logistic Regression mistake type classifier."""

    def __init__(self, data_path: str = DATA_PATH):
        self.data_path = data_path
        self.vectorizer = None
        self.model = None
        self.is_trained: bool = False
        self.labels: list = []

    def train(self) -> bool:
        """Train the TF-IDF and Logistic Regression model on the dataset."""
        try:
            from sklearn.feature_extraction.text import TfidfVectorizer
            from sklearn.linear_model import LogisticRegression
            import numpy as np
        except ImportError:
            print("[ML Model] scikit-learn not available in current environment.")
            return False

        texts = []
        labels = []

        if not os.path.exists(self.data_path):
            texts = [
                "5 * 6 = 35", "10 / 2 = 6", "15 + 23 = 40",
                "Speed of light is infinite", "Heavy objects fall faster in vacuum",
                "print('hello'", "if x == 5", "NameError: var not found",
                "forgot to carry 1", "misread plus as minus",
                "did not finish proof", "only wrote answer without work",
                "used addition instead of multiplication", "applied wrong formula"
            ]
            labels = [
                "Calculation Mistake", "Calculation Mistake", "Calculation Mistake",
                "Conceptual Mistake", "Conceptual Mistake",
                "Syntax Mistake", "Syntax Mistake", "Syntax Mistake",
                "Careless Mistake", "Careless Mistake",
                "Incomplete Answer", "Incomplete Answer",
                "Wrong Method", "Wrong Method"
            ]
        else:
            try:
                with open(self.data_path, mode="r", encoding="utf-8") as f:
                    reader = csv.DictReader(f)
                    for row in reader:
                        text = row.get("text", "").strip()
                        label = row.get("label", "").strip()
                        if text and label:
                            texts.append(text)
                            labels.append(label)
            except Exception as e:
                print(f"[ML Model] Error reading training dataset: {e}")
                return False

        if not texts or len(set(labels)) < 2:
            print("[ML Model] Insufficient classes to train model.")
            return False

        try:
            self.vectorizer = TfidfVectorizer(
                ngram_range=(1, 2),
                lowercase=True,
                stop_words="english",
                min_df=1
            )
            X = self.vectorizer.fit_transform(texts)
            self.model = LogisticRegression(max_iter=1000, random_state=42)
            self.model.fit(X, labels)
            self.labels = list(self.model.classes_)
            self.is_trained = True
            print(f"[ML Model] Trained successfully on {len(texts)} samples with {len(self.labels)} classes.")
            return True
        except Exception as e:
            print(f"[ML Model] Training failed: {e}")
            self.is_trained = False
            return False

    def predict(self, question: str, student_answer: str) -> Dict[str, Any]:
        """
        Predict likely mistake type and confidence score.
        Returns:
            dict with 'suggested_type' (str) and 'confidence' (float 0.0 - 1.0).
        """
        if not self.is_trained or self.model is None or self.vectorizer is None:
            success = self.train()
            if not success or self.model is None or self.vectorizer is None:
                # Fast keyword fallback heuristic
                lower_q = (question + " " + student_answer).lower()
                if any(k in lower_q for k in ["syntax", "indent", "print(", "def ", "console.log", "variable", "nameerror"]):
                    return {"suggested_type": "Syntax Mistake", "confidence": 0.75}
                if any(k in lower_q for k in ["+", "-", "*", "/", "=", "times", "multiply", "divide", "add", "calculate"]):
                    return {"suggested_type": "Calculation Mistake", "confidence": 0.70}
                return {"suggested_type": "Conceptual Mistake", "confidence": 0.60}

        combined_text = f"{question} {student_answer}".strip()
        try:
            import numpy as np
            X_input = self.vectorizer.transform([combined_text])
            probabilities = self.model.predict_proba(X_input)[0]
            max_idx = int(np.argmax(probabilities))
            predicted_label = self.labels[max_idx]
            confidence = float(probabilities[max_idx])

            return {
                "suggested_type": predicted_label,
                "confidence": round(confidence, 2)
            }
        except Exception as e:
            print(f"[ML Model] Prediction error: {e}")
            return {
                "suggested_type": "Conceptual Mistake",
                "confidence": 0.50
            }


# Global singleton instance for application use
ml_classifier = MistakeClassifier()
