/**
 * Analyze page client logic for AI Mistake Analyzer.
 */

document.addEventListener("DOMContentLoaded", async () => {
  setupMobileMenu();

  // Authentication Guard
  const user = await requireAuth();
  if (!user) return;

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

  const sectionCorrectAnswerBox = document.getElementById("sectionCorrectAnswerBox");
  const resultCorrectAnswer = document.getElementById("resultCorrectAnswer");
  const sectionWhyWrongBox = document.getElementById("sectionWhyWrongBox");
  const resultWhyWrong = document.getElementById("resultWhyWrong");
  const resultExplanation = document.getElementById("resultExplanation");
  const resultLearningTip = document.getElementById("resultLearningTip");
  const resultPracticeQuestion = document.getElementById("resultPracticeQuestion");

  function showError(msg) {
    if (errorMessage) errorMessage.textContent = msg;
    if (errorAlert) {
      errorAlert.style.display = "flex";
      errorAlert.scrollIntoView({ behavior: "smooth", block: "center" });
    }
  }

  function clearError() {
    if (errorAlert) errorAlert.style.display = "none";
  }

  if (form) {
    form.addEventListener("submit", async (e) => {
      e.preventDefault();
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

      // Show loading
      analyzeBtn.disabled = true;
      analyzeBtn.textContent = "Analyzing...";
      loadingIndicator.style.display = "flex";
      resultCard.style.display = "none";

      try {
        const response = await fetch("/api/analyze", {
          method: "POST",
          headers: getAuthHeaders(),
          body: JSON.stringify({
            question: question,
            student_answer: studentAnswer,
            subject: subject,
          }),
        });

        if (!response.ok) {
          let errText = "Failed to analyze mistake. Please try again.";
          try {
            const errData = await response.json();
            if (errData && errData.detail) errText = errData.detail;
          } catch (_) {}
          throw new Error(errText);
        }

        const data = await response.json();
        displayResult(data);
      } catch (err) {
        showError(err.message || "An unexpected error occurred while analyzing.");
      } finally {
        analyzeBtn.disabled = false;
        analyzeBtn.textContent = "✨ Analyze Mistake";
        loadingIndicator.style.display = "none";
      }
    });
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

    const confPct = Math.round((data.confidence || 0) * 100);
    badgeConfidence.textContent = `${confPct}% Confidence`;

    const diff = (data.difficulty || "Medium").toLowerCase();
    badgeDifficulty.textContent = `Difficulty: ${data.difficulty || "Medium"}`;
    badgeDifficulty.className = `badge badge-difficulty-${diff}`;

    resultCorrectAnswer.textContent = data.correct_answer || "N/A";
    resultExplanation.textContent = data.explanation || "";
    resultLearningTip.textContent = data.learning_tip || "";
    resultPracticeQuestion.textContent = data.practice_question || "";

    resultCard.style.display = "block";
    resultCard.scrollIntoView({ behavior: "smooth", block: "start" });
  }
});
