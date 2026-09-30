/**
 * AI Mistake Analyzer - Main Analyzer Client (Vanilla JS)
 */

document.addEventListener("DOMContentLoaded", () => {
  const form = document.getElementById("analyzeForm");
  const questionInput = document.getElementById("questionInput");
  const answerInput = document.getElementById("answerInput");
  const subjectSelect = document.getElementById("subjectSelect");
  const analyzeBtn = document.getElementById("analyzeBtn");

  const loadingIndicator = document.getElementById("loadingIndicator");
  const errorAlert = document.getElementById("errorAlert");
  const errorMessage = document.getElementById("errorMessage");

  const resultCard = document.getElementById("resultCard");
  const resultStatus = document.getElementById("resultStatus");
  const badgeMistakeType = document.getElementById("badgeMistakeType");
  const badgeConfidence = document.getElementById("badgeConfidence");
  const badgeDifficulty = document.getElementById("badgeDifficulty");
  const badgeMlHint = document.getElementById("badgeMlHint");

  const resultCorrectAnswer = document.getElementById("resultCorrectAnswer");
  const resultWhyWrong = document.getElementById("resultWhyWrong");
  const sectionWhyWrongBox = document.getElementById("sectionWhyWrongBox");
  const resultExplanation = document.getElementById("resultExplanation");
  const resultLearningTip = document.getElementById("resultLearningTip");
  const resultPracticeQuestion = document.getElementById("resultPracticeQuestion");
  const tryPracticeBtn = document.getElementById("tryPracticeBtn");

  const presetMath = document.getElementById("presetMath");
  const presetScience = document.getElementById("presetScience");
  const presetCode = document.getElementById("presetCode");

  let currentPracticeQuestion = "";

  if (presetMath) {
    presetMath.addEventListener("click", () => {
      questionInput.value = "What is 5 × 6?";
      answerInput.value = "35";
      subjectSelect.value = "Mathematics";
      clearError();
    });
  }

  if (presetScience) {
    presetScience.addEventListener("click", () => {
      questionInput.value = "In a vacuum, do heavy objects fall faster than light objects?";
      answerInput.value = "Yes, because heavier things are pulled down with more gravity force.";
      subjectSelect.value = "Science";
      clearError();
    });
  }

  if (presetCode) {
    presetCode.addEventListener("click", () => {
      questionInput.value = "Write a Python for loop that prints numbers from 0 to 4.";
      answerInput.value = "for i in range(5)\n    print(i)";
      subjectSelect.value = "Programming";
      clearError();
    });
  }

  if (tryPracticeBtn) {
    tryPracticeBtn.addEventListener("click", () => {
      if (currentPracticeQuestion) {
        questionInput.value = currentPracticeQuestion;
        answerInput.value = "";
        questionInput.scrollIntoView({ behavior: "smooth" });
        answerInput.focus();
      }
    });
  }

  if (form) {
    form.addEventListener("submit", async (e) => {
      e.preventDefault();
      await analyzeMistake();
    });
  }

  async function analyzeMistake() {
    clearError();

    const question = questionInput.value.trim();
    const studentAnswer = answerInput.value.trim();
    const subject = subjectSelect.value;

    if (!question) {
      showError("Please enter a question to analyze.");
      questionInput.focus();
      return;
    }
    if (!studentAnswer) {
      showError("Please enter your answer.");
      answerInput.focus();
      return;
    }
    if (!subject) {
      showError("Please select a subject area.");
      subjectSelect.focus();
      return;
    }

    showLoading(true);
    resultCard.style.display = "none";

    try {
      const response = await fetch("/api/analyze", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          question: question,
          student_answer: studentAnswer,
          subject: subject,
        }),
      });

      if (!response.ok) {
        let errText = "Something went wrong while analyzing your answer. Please try again.";
        try {
          const errData = await response.json();
          if (errData && errData.detail) {
            errText = errData.detail;
          }
        } catch (_) {}
        throw new Error(errText);
      }

      const data = await response.json();
      displayResult(data);
    } catch (err) {
      showError(err.message || "Something went wrong while analyzing your answer. Please try again.");
    } finally {
      showLoading(false);
    }
  }

  function displayResult(data) {
    const isCorrect = Boolean(data.is_correct);

    if (isCorrect) {
      resultCard.classList.add("is-correct");
      resultStatus.innerHTML = `
        <span class="status-correct">✅</span>
        <span class="status-correct">Correct Answer!</span>
      `;
      badgeMistakeType.textContent = "No Mistake";
      badgeMistakeType.className = "badge badge-success";
      sectionWhyWrongBox.style.display = "none";
    } else {
      resultCard.classList.remove("is-correct");
      resultStatus.innerHTML = `
        <span class="status-wrong">❌</span>
        <span class="status-wrong">Mistake Found</span>
      `;
      badgeMistakeType.textContent = data.mistake_type || "Mistake";
      badgeMistakeType.className = "badge badge-danger";
      sectionWhyWrongBox.style.display = "block";
      resultWhyWrong.textContent = data.why_wrong || "The answer does not match the expected solution.";
    }

    const confidencePct = Math.round((data.confidence || 0) * 100);
    badgeConfidence.textContent = `Confidence: ${confidencePct}%`;

    const diff = (data.difficulty || "Medium").toLowerCase();
    badgeDifficulty.textContent = `Difficulty: ${data.difficulty || "Medium"}`;
    badgeDifficulty.className = `badge badge-difficulty-${diff}`;

    if (data.ml_mistake_suggestion) {
      badgeMlHint.style.display = "inline-flex";
      const mlConf = Math.round((data.ml_confidence || 0) * 100);
      badgeMlHint.textContent = `ML Classifier: ${data.ml_mistake_suggestion} (${mlConf}%)`;
    } else {
      badgeMlHint.style.display = "none";
    }

    resultCorrectAnswer.textContent = data.correct_answer || "N/A";
    resultExplanation.textContent = data.explanation || "";
    resultLearningTip.textContent = data.learning_tip || "";
    resultPracticeQuestion.textContent = data.practice_question || "";
    currentPracticeQuestion = data.practice_question || "";

    resultCard.style.display = "block";
    resultCard.scrollIntoView({ behavior: "smooth", block: "start" });
  }

  function showLoading(isLoading) {
    if (isLoading) {
      loadingIndicator.style.display = "flex";
      analyzeBtn.disabled = true;
    } else {
      loadingIndicator.style.display = "none";
      analyzeBtn.disabled = false;
    }
  }

  function showError(msg) {
    errorMessage.textContent = msg;
    errorAlert.style.display = "flex";
    errorAlert.scrollIntoView({ behavior: "smooth", block: "center" });
  }

  function clearError() {
    errorAlert.style.display = "none";
    errorMessage.textContent = "";
  }
});
