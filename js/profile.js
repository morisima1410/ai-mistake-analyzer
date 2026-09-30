/**
 * Profile page client logic for AI Mistake Analyzer.
 */

document.addEventListener("DOMContentLoaded", async () => {
  setupMobileMenu();

  // Authentication Guard
  const user = await requireAuth();
  if (!user) return;

  const profileForm = document.getElementById("profileForm");
  const nameInput = document.getElementById("profileNameInput");
  const emailInput = document.getElementById("profileEmailInput");
  const createdAtDisplay = document.getElementById("profileCreatedAt");
  const avatarUserName = document.getElementById("avatarUserName");
  const saveBtn = document.getElementById("saveProfileBtn");

  const successAlert = document.getElementById("profileSuccessAlert");
  const successMsg = document.getElementById("profileSuccessMsg");
  const errorAlert = document.getElementById("profileErrorAlert");
  const errorMsg = document.getElementById("profileErrorMsg");

  // Populate existing data
  const initialName = user.full_name || "User";
  nameInput.value = initialName;
  emailInput.value = user.email || "";
  createdAtDisplay.textContent = user.created_at || "Recent";
  if (avatarUserName) {
    avatarUserName.textContent = initialName;
  }

  function showStatus(isError, msg) {
    if (isError) {
      errorMsg.textContent = msg;
      errorAlert.style.display = "flex";
      successAlert.style.display = "none";
      errorAlert.scrollIntoView({ behavior: "smooth", block: "center" });
    } else {
      successMsg.textContent = msg;
      successAlert.style.display = "flex";
      errorAlert.style.display = "none";
      successAlert.scrollIntoView({ behavior: "smooth", block: "center" });
      setTimeout(() => {
        successAlert.style.display = "none";
      }, 4000);
    }
  }

  profileForm.addEventListener("submit", async (e) => {
    e.preventDefault();
    errorAlert.style.display = "none";
    successAlert.style.display = "none";

    const newName = nameInput.value.trim();
    if (!newName) {
      showStatus(true, "Full name cannot be empty.");
      nameInput.focus();
      return;
    }

    saveBtn.disabled = true;
    saveBtn.textContent = "Saving...";

    try {
      const response = await fetch("/api/profile", {
        method: "PUT",
        headers: getAuthHeaders(),
        body: JSON.stringify({ full_name: newName }),
      });

      const data = await response.json();
      if (!response.ok) {
        throw new Error(data.detail || "Failed to update profile.");
      }

      // Update both display name and form input immediately
      const updatedName = data.full_name || newName;
      nameInput.value = updatedName;
      if (avatarUserName) {
        avatarUserName.textContent = updatedName;
      }

      showStatus(false, "Changes saved successfully.");
    } catch (err) {
      showStatus(true, err.message || "An error occurred while saving profile.");
    } finally {
      saveBtn.disabled = false;
      saveBtn.textContent = "Save Changes";
    }
  });
});
