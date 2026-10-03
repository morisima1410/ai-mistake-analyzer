/**
 * History page client logic for AI Mistake Analyzer.
 */

document.addEventListener("DOMContentLoaded", async () => {
  setupMobileMenu();

  // Authentication Guard
  const user = await requireAuth();
  if (!user) return;

  const historyTableBody = document.getElementById("historyTableBody");
  const historyTableContainer = document.getElementById("historyTableContainer");
  const loadingHistory = document.getElementById("loadingHistory");
  const emptyHistory = document.getElementById("emptyHistory");
  const clearHistoryBtn = document.getElementById("clearHistoryBtn");
  const statusAlert = document.getElementById("statusAlert");
  const alertMessage = document.getElementById("alertMessage");

  // Modal elements
  const detailModal = document.getElementById("detailModal");
  const closeModalBtn = document.getElementById("closeModalBtn");
  const modalStatus = document.getElementById("modalStatus");
  const modalTypeBadge = document.getElementById("modalTypeBadge");
  const modalConfidenceBadge = document.getElementById("modalConfidenceBadge");
  const modalDifficultyBadge = document.getElementById("modalDifficultyBadge");
  const modalQuestion = document.getElementById("modalQuestion");
  const modalAnswer = document.getElementById("modalAnswer");
  const modalCorrect = document.getElementById("modalCorrect");
  const modalWhyWrongSection = document.getElementById("modalWhyWrongSection");
  const modalWhyWrong = document.getElementById("modalWhyWrong");
  const modalExplanation = document.getElementById("modalExplanation");
  const modalTip = document.getElementById("modalTip");
  const modalPractice = document.getElementById("modalPractice");
  const modalTimestamp = document.getElementById("modalTimestamp");

  let historyData = [];

  loadHistory();

  if (closeModalBtn) {
    closeModalBtn.addEventListener("click", closeModal);
  }

  window.addEventListener("click", (e) => {
    if (e.target === detailModal) closeModal();
  });

  window.addEventListener("keydown", (e) => {
    if (e.key === "Escape" && detailModal.classList.contains("active")) {
      closeModal();
    }
  });

  if (clearHistoryBtn) {
    clearHistoryBtn.addEventListener("click", async () => {
      const confirmed = window.confirm("Are you sure you want to clear all your mistake history? This cannot be undone.");
      if (confirmed) {
        await clearAllHistory();
      }
    });
  }

  async function loadHistory() {
    loadingHistory.style.display = "flex";
    emptyHistory.style.display = "none";
    historyTableContainer.style.display = "none";

    try {
      const response = await fetch("/api/history", {
        headers: getAuthHeaders(),
      });
      if (!response.ok) throw new Error("Failed to load history.");

      const result = await response.json();
      historyData = Array.isArray(result)
        ? result
        : (result && Array.isArray(result.data) ? result.data : []);
      renderHistory(historyData);
    } catch (err) {
      console.error(err);
      showAlert("Could not retrieve mistake history.", true);
      emptyHistory.style.display = "block";
    } finally {
      loadingHistory.style.display = "none";
    }
  }

  function renderHistory(items) {
    historyTableBody.innerHTML = "";

    const list = Array.isArray(items)
      ? items
      : (items && Array.isArray(items.data) ? items.data : []);

    if (!list || list.length === 0) {
      emptyHistory.style.display = "block";
      historyTableContainer.style.display = "none";
      clearHistoryBtn.style.display = "none";
      return;
    }

    emptyHistory.style.display = "none";
    historyTableContainer.style.display = "block";
    clearHistoryBtn.style.display = "inline-flex";

    list.forEach((item) => {
      const tr = document.createElement("tr");

      const isCorrect = Boolean(item.is_correct);
      const resultBadge = isCorrect
        ? `<span class="badge badge-success">Correct</span>`
        : `<span class="badge badge-danger">Incorrect</span>`;

      const truncatedQ = item.question.length > 45
        ? item.question.substring(0, 45) + "..."
        : item.question;

      const dateStr = item.created_at ? item.created_at.substring(0, 10) : "Recent";

      tr.innerHTML = `
        <td style="font-weight: 600; color: var(--text);" title="${escapeHtml(item.question)}">${escapeHtml(truncatedQ)}</td>
        <td><span class="badge badge-info">${escapeHtml(item.subject)}</span></td>
        <td><span class="badge ${isCorrect ? 'badge-success' : 'badge-warning'}">${escapeHtml(item.mistake_type)}</span></td>
        <td>${resultBadge}</td>
        <td style="color: var(--text-dim); font-size: 0.85rem;">${dateStr}</td>
        <td style="text-align: right;">
          <div class="history-actions" style="justify-content: flex-end;">
            <button class="btn btn-outline btn-sm view-btn" data-id="${item.id}">View Analysis</button>
            <button class="btn btn-danger btn-sm delete-btn" data-id="${item.id}">Delete</button>
          </div>
        </td>
      `;

      tr.querySelector(".view-btn").addEventListener("click", () => openDetails(item.id));
      tr.querySelector(".delete-btn").addEventListener("click", () => deleteItem(item.id));

      historyTableBody.appendChild(tr);
    });
  }

  function openDetails(id) {
    const item = historyData.find((x) => x.id === id);
    if (!item) return;

    const isCorrect = Boolean(item.is_correct);
    if (isCorrect) {
      modalStatus.innerHTML = `<span class="status-correct">✅ Correct Answer</span>`;
      modalTypeBadge.textContent = "No Mistake";
      modalTypeBadge.className = "badge badge-success";
      modalWhyWrongSection.style.display = "none";
    } else {
      modalStatus.innerHTML = `<span class="status-wrong">❌ Mistake Diagnosed</span>`;
      modalTypeBadge.textContent = item.mistake_type;
      modalTypeBadge.className = "badge badge-danger";
      modalWhyWrongSection.style.display = "block";
      modalWhyWrong.textContent = item.why_wrong || "Incorrect response.";
    }

    modalConfidenceBadge.textContent = `${Math.round((item.confidence || 0) * 100)}% Confidence`;
    modalDifficultyBadge.textContent = `Difficulty: ${item.difficulty || "Medium"}`;
    const diff = (item.difficulty || "Medium").toLowerCase();
    modalDifficultyBadge.className = `badge badge-difficulty-${diff}`;

    modalQuestion.textContent = item.question;
    modalAnswer.textContent = item.student_answer;
    modalCorrect.textContent = item.correct_answer;
    modalExplanation.textContent = item.explanation;
    modalTip.textContent = item.learning_tip;
    modalPractice.textContent = item.practice_question;
    modalTimestamp.textContent = `Analyzed on: ${item.created_at || "Recent"}`;

    detailModal.classList.add("active");
  }

  function closeModal() {
    detailModal.classList.remove("active");
  }

  async function deleteItem(id) {
    const confirmed = window.confirm("Are you sure you want to delete this analysis entry?");
    if (!confirmed) return;

    try {
      const response = await fetch(`/api/history/${id}`, {
        method: "DELETE",
        headers: getAuthHeaders(),
      });
      if (!response.ok) throw new Error("Failed to delete entry.");

      historyData = historyData.filter((x) => x.id !== id);
      renderHistory(historyData);
      showAlert("Analysis deleted successfully.");
    } catch (err) {
      console.error(err);
      showAlert("Could not delete record.", true);
    }
  }

  async function clearAllHistory() {
    try {
      const response = await fetch("/api/history", {
        method: "DELETE",
        headers: getAuthHeaders(),
      });
      if (!response.ok) throw new Error("Failed to clear history.");

      historyData = [];
      renderHistory(historyData);
      showAlert("All your history has been cleared.");
    } catch (err) {
      console.error(err);
      showAlert("Could not clear history.", true);
    }
  }

  function showAlert(msg, isError = false) {
    alertMessage.textContent = msg;
    statusAlert.className = isError ? "alert alert-danger" : "alert alert-success";
    statusAlert.style.display = "flex";
    setTimeout(() => {
      statusAlert.style.display = "none";
    }, 3500);
  }

  function escapeHtml(str) {
    if (!str) return "";
    return str
      .replace(/&/g, "&amp;")
      .replace(/</g, "&lt;")
      .replace(/>/g, "&gt;")
      .replace(/"/g, "&quot;")
      .replace(/'/g, "&#039;");
  }
});
