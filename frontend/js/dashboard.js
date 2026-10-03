/**
 * Dashboard client logic for AI Mistake Analyzer.
 */

document.addEventListener("DOMContentLoaded", async () => {
  setupMobileMenu();

  // Authentication Guard
  const user = await requireAuth();
  if (!user) return;

  const userNamePlaceholder = document.getElementById("userNamePlaceholder");
  if (userNamePlaceholder && user.full_name) {
    userNamePlaceholder.textContent = user.full_name;
  }

  const loadingDashboard = document.getElementById("loadingDashboard");
  const dashboardContent = document.getElementById("dashboardContent");
  const dashboardError = document.getElementById("dashboardError");
  const dashboardErrorMsg = document.getElementById("dashboardErrorMsg");

  const statTotal = document.getElementById("statTotal");
  const statCorrect = document.getElementById("statCorrect");
  const statMistakes = document.getElementById("statMistakes");
  const statAccuracy = document.getElementById("statAccuracy");

  const breakdownList = document.getElementById("breakdownList");
  const emptyBreakdown = document.getElementById("emptyBreakdown");
  const recentList = document.getElementById("recentList");
  const emptyRecent = document.getElementById("emptyRecent");

  try {
    const res = await fetch("/api/dashboard", {
      headers: getAuthHeaders(),
    });
    if (!res.ok) {
      throw new Error("Failed to load dashboard data.");
    }
    const data = await res.json();
    renderDashboard(data);
  } catch (err) {
    console.error(err);
    if (dashboardErrorMsg) dashboardErrorMsg.textContent = err.message || "Error loading dashboard";
    if (dashboardError) dashboardError.style.display = "flex";
  } finally {
    if (loadingDashboard) loadingDashboard.style.display = "none";
  }

  function renderDashboard(data) {
    dashboardContent.style.display = "block";

    if (data.user_name && userNamePlaceholder) {
      userNamePlaceholder.textContent = data.user_name;
    }

    statTotal.textContent = data.total_questions || 0;
    statCorrect.textContent = data.correct_answers || 0;
    statMistakes.textContent = data.mistakes || 0;
    statAccuracy.textContent = `${(data.accuracy || 0).toFixed(1)}%`;

    // Render Mistake Breakdown
    breakdownList.innerHTML = "";
    const breakdown = (data && typeof data.mistake_breakdown === "object" && data.mistake_breakdown !== null)
      ? data.mistake_breakdown
      : {};
    const entries = Object.entries(breakdown);

    if (entries.length === 0) {
      emptyBreakdown.style.display = "block";
    } else {
      emptyBreakdown.style.display = "none";
      const totalMistakes = data.mistakes || 1;
      const maxCount = Math.max(...entries.map(([_, count]) => count), 1);

      entries.forEach(([type, count]) => {
        const pct = Math.round((count / totalMistakes) * 100);
        const barWidth = Math.max(8, Math.round((count / maxCount) * 100));

        const item = document.createElement("div");
        item.className = "breakdown-item";
        item.innerHTML = `
          <div class="breakdown-header">
            <span style="color: var(--text);">${escapeHtml(type)}</span>
            <span style="color: var(--text-muted); font-size: 0.9rem;">
              <strong>${count}</strong> (${pct}%)
            </span>
          </div>
          <div class="breakdown-bar-bg">
            <div class="breakdown-bar-fill" style="width: 0%;" data-target-width="${barWidth}%"></div>
          </div>
        `;
        breakdownList.appendChild(item);
      });

      setTimeout(() => {
        const fills = breakdownList.querySelectorAll(".breakdown-bar-fill");
        fills.forEach((fill) => {
          fill.style.width = fill.getAttribute("data-target-width");
        });
      }, 50);
    }

    // Render Recent Mistakes
    recentList.innerHTML = "";
    const recent = Array.isArray(data?.recent_mistakes) ? data.recent_mistakes : [];
    if (recent.length === 0) {
      emptyRecent.style.display = "block";
    } else {
      emptyRecent.style.display = "none";
      recent.forEach((item) => {
        const row = document.createElement("div");
        row.className = "recent-item";

        const isCorrect = Boolean(item.is_correct);
        const resultBadge = isCorrect
          ? `<span class="badge badge-success">Correct</span>`
          : `<span class="badge badge-danger">${escapeHtml(item.mistake_type)}</span>`;

        const truncatedQ = item.question.length > 50 ? item.question.substring(0, 50) + "..." : item.question;

        row.innerHTML = `
          <div style="flex: 1; min-width: 0;">
            <div style="font-weight: 600; color: var(--text); white-space: nowrap; overflow: hidden; text-overflow: ellipsis;">
              ${escapeHtml(truncatedQ)}
            </div>
            <div style="font-size: 0.825rem; color: var(--text-dim); margin-top: 0.2rem;">
              Subject: ${escapeHtml(item.subject)} &bull; ${item.created_at || "Recent"}
            </div>
          </div>
          <div>${resultBadge}</div>
        `;
        recentList.appendChild(row);
      });
    }
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
