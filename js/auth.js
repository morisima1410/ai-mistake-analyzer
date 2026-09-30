/**
 * Authentication client logic for AI Mistake Analyzer.
 */

// Helper to get authorization headers
function getAuthHeaders() {
  const token = localStorage.getItem("auth_token");
  const headers = { "Content-Type": "application/json" };
  if (token) {
    headers["Authorization"] = `Bearer ${token}`;
  }
  return headers;
}

// Check authentication for protected pages
async function requireAuth() {
  const token = localStorage.getItem("auth_token");
  if (!token) {
    window.location.replace("/login.html");
    return null;
  }

  try {
    const res = await fetch("/api/auth/me", {
      headers: getAuthHeaders(),
    });
    if (!res.ok) {
      localStorage.removeItem("auth_token");
      window.location.replace("/login.html");
      return null;
    }
    return await res.json();
  } catch (err) {
    console.error("Auth check failed:", err);
    window.location.replace("/login.html");
    return null;
  }
}

// Logout handler
async function handleLogout() {
  try {
    await fetch("/api/auth/logout", {
      method: "POST",
      headers: getAuthHeaders(),
    });
  } catch (e) {
    console.warn("Logout fetch error:", e);
  } finally {
    localStorage.removeItem("auth_token");
    window.location.replace("/login.html");
  }
}

// Mobile menu toggle helper
function setupMobileMenu() {
  const toggle = document.querySelector(".menu-toggle");
  const links = document.querySelector(".nav-links");
  if (toggle && links) {
    toggle.addEventListener("click", () => {
      links.classList.toggle("show");
    });
  }
  const logoutBtn = document.getElementById("logoutBtn");
  if (logoutBtn) {
    logoutBtn.addEventListener("click", (e) => {
      e.preventDefault();
      handleLogout();
    });
  }
}

// Initialize Auth forms (Register / Login)
document.addEventListener("DOMContentLoaded", () => {
  const registerForm = document.getElementById("registerForm");
  const loginForm = document.getElementById("loginForm");
  const authAlert = document.getElementById("authAlert");
  const authAlertMsg = document.getElementById("authAlertMsg");
  const authSuccessAlert = document.getElementById("authSuccessAlert");
  const authSuccessMsg = document.getElementById("authSuccessMsg");

  // Check URL parameters for registration success message
  if (authSuccessAlert && window.location.search.includes("registered=true")) {
    authSuccessAlert.style.display = "flex";
  }

  function showError(msg) {
    if (authAlert && authAlertMsg) {
      authAlertMsg.textContent = msg;
      authAlert.style.display = "flex";
    }
    if (authSuccessAlert) {
      authSuccessAlert.style.display = "none";
    }
  }

  // 1. Registration Handler
  if (registerForm) {
    registerForm.addEventListener("submit", async (e) => {
      e.preventDefault();
      if (authAlert) authAlert.style.display = "none";

      const fullName = document.getElementById("fullNameInput").value.trim();
      const email = document.getElementById("emailInput").value.trim();
      const password = document.getElementById("passwordInput").value;
      const confirmPassword = document.getElementById("confirmPasswordInput").value;

      if (!fullName) {
        showError("Full Name is required.");
        return;
      }
      if (!email || !email.includes("@")) {
        showError("A valid email address is required.");
        return;
      }
      if (!password || password.length < 6) {
        showError("Password must be at least 6 characters long.");
        return;
      }
      if (password !== confirmPassword) {
        showError("Passwords do not match.");
        return;
      }

      const submitBtn = document.getElementById("registerBtn");
      submitBtn.disabled = true;
      submitBtn.textContent = "Creating Account...";

      try {
        const response = await fetch("/api/auth/register", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            full_name: fullName,
            email: email,
            password: password,
            confirm_password: confirmPassword,
          }),
        });

        const data = await response.json();
        if (!response.ok) {
          throw new Error(data.detail || "Registration failed. Please try again.");
        }

        // Redirect to Login with success banner
        window.location.href = "/login.html?registered=true";
      } catch (err) {
        showError(err.message || "An error occurred during registration.");
      } finally {
        submitBtn.disabled = false;
        submitBtn.textContent = "Create Account";
      }
    });
  }

  // 2. Login Handler
  if (loginForm) {
    // If user is already authenticated, send to dashboard
    if (localStorage.getItem("auth_token")) {
      fetch("/api/auth/me", { headers: getAuthHeaders() })
        .then((res) => {
          if (res.ok) window.location.replace("/dashboard.html");
        })
        .catch(() => {});
    }

    loginForm.addEventListener("submit", async (e) => {
      e.preventDefault();
      if (authAlert) authAlert.style.display = "none";

      const email = document.getElementById("emailInput").value.trim();
      const password = document.getElementById("passwordInput").value;

      if (!email || !password) {
        showError("Please enter your email and password.");
        return;
      }

      const submitBtn = document.getElementById("loginBtn");
      submitBtn.disabled = true;
      submitBtn.textContent = "Signing In...";

      try {
        const response = await fetch("/api/auth/login", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ email, password }),
        });

        const data = await response.json();
        if (!response.ok) {
          throw new Error(data.detail || "Invalid email or password.");
        }

        // Store token and redirect to dashboard
        localStorage.setItem("auth_token", data.token);
        window.location.replace("/dashboard.html");
      } catch (err) {
        showError("Invalid email or password.");
      } finally {
        submitBtn.disabled = false;
        submitBtn.textContent = "Login";
      }
    });
  }
});
