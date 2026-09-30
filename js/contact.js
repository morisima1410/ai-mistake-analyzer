/**
 * Contact page client logic for AI Mistake Analyzer.
 */

document.addEventListener("DOMContentLoaded", async () => {
  setupMobileMenu();

  // Authentication Guard
  const user = await requireAuth();
  if (!user) return;

  const contactForm = document.getElementById("contactForm");
  const nameInput = document.getElementById("contactNameInput");
  const emailInput = document.getElementById("contactEmailInput");
  const messageInput = document.getElementById("contactMessageInput");
  const sendBtn = document.getElementById("sendContactBtn");

  const successAlert = document.getElementById("contactSuccessAlert");
  const successMsg = document.getElementById("contactSuccessMsg");
  const errorAlert = document.getElementById("contactErrorAlert");
  const errorMsg = document.getElementById("contactErrorMsg");

  // Pre-fill user data
  if (user.full_name) nameInput.value = user.full_name;
  if (user.email) emailInput.value = user.email;

  contactForm.addEventListener("submit", async (e) => {
    e.preventDefault();
    errorAlert.style.display = "none";
    successAlert.style.display = "none";

    const name = nameInput.value.trim();
    const email = emailInput.value.trim();
    const message = messageInput.value.trim();

    if (!name || !email || !message) {
      errorMsg.textContent = "Please fill in all fields.";
      errorAlert.style.display = "flex";
      return;
    }

    sendBtn.disabled = true;
    sendBtn.textContent = "Sending Message...";

    try {
      const response = await fetch("/api/contact", {
        method: "POST",
        headers: getAuthHeaders(),
        body: JSON.stringify({ name, email, message }),
      });

      const data = await response.json();
      if (!response.ok) {
        throw new Error(data.detail || "Failed to send message.");
      }

      successMsg.textContent = data.message || "Your message has been sent successfully.";
      successAlert.style.display = "flex";
      messageInput.value = "";
    } catch (err) {
      errorMsg.textContent = err.message || "An error occurred while sending your message.";
      errorAlert.style.display = "flex";
    } finally {
      sendBtn.disabled = false;
      sendBtn.textContent = "Send Message";
    }
  });
});
