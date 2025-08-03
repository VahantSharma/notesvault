document.addEventListener("DOMContentLoaded", function () {
  // Get real user data from auth service
  const currentUser = window.authService.getCurrentUser();

  if (!currentUser) {
    // Redirect to login if not authenticated
    window.location.href = "login.html";
    return;
  }

  // Use real user data
  const studentData = {
    name: currentUser.name || "Not specified",
    email: currentUser.email || "Not specified",
    college: currentUser.college || "Not specified",
    branch: currentUser.branch || "Not specified",
    year: currentUser.year || "Not specified",
    notes: currentUser.notes || {
      lectures: [],
      pyqs: [],
    },
  };

  // Populate student details
  const profileSection = document.querySelector(".profile");
  profileSection.innerHTML = `
    <h2>👤 Student Details</h2>
    <div class="profile-content">
      <p><strong>Name:</strong> ${studentData.name}</p>
      <p><strong>Email:</strong> ${studentData.email}</p>
      <p><strong>College:</strong> ${studentData.college}</p>
      <p><strong>Branch:</strong> ${studentData.branch}</p>
      <p><strong>Year:</strong> ${studentData.year}</p>
      <button class="edit-profile-btn" onclick="showEditProfileForm()">✏️ Edit Profile</button>
    </div>
    <div class="edit-profile-form" id="editProfileForm" style="display: none;">
      <h3>Edit Profile</h3>
      <form id="profileForm">
        <div class="form-group">
          <label for="collegeName">College:</label>
          <input type="text" id="collegeName" value="${
            studentData.college
          }" placeholder="Enter your college name">
        </div>
        <div class="form-group">
          <label for="branchName">Branch:</label>
          <input type="text" id="branchName" value="${
            studentData.branch
          }" placeholder="Enter your branch">
        </div>
        <div class="form-group">
          <label for="yearName">Year:</label>
          <select id="yearName">
            <option value="">Select Year</option>
            <option value="1st Year" ${
              studentData.year === "1st Year" ? "selected" : ""
            }>1st Year</option>
            <option value="2nd Year" ${
              studentData.year === "2nd Year" ? "selected" : ""
            }>2nd Year</option>
            <option value="3rd Year" ${
              studentData.year === "3rd Year" ? "selected" : ""
            }>3rd Year</option>
            <option value="4th Year" ${
              studentData.year === "4th Year" ? "selected" : ""
            }>4th Year</option>
          </select>
        </div>
        <div class="form-actions">
          <button type="submit" class="save-btn">Save Changes</button>
          <button type="button" class="cancel-btn" onclick="hideEditProfileForm()">Cancel</button>
        </div>
      </form>
    </div>
  `;

  // Populate saved notes
  const notesSection = document.querySelector(".notes-section");
  notesSection.innerHTML = `
    <h2>💾 Saved Notes</h2>
    <div class="note-card">
      <h3>Lecture Notes</h3>
      <ul>${
        studentData.notes.lectures.length > 0
          ? studentData.notes.lectures
              .map((note) => `<li>${note}</li>`)
              .join("")
          : "<li>No lecture notes saved yet</li>"
      }</ul>
      <button onclick="window.location.href='upload.html'">➕ Add Notes</button>
    </div>
    <div class="note-card">
      <h3>Previous Year Questions (PYQs)</h3>
      <ul>${
        studentData.notes.pyqs.length > 0
          ? studentData.notes.pyqs.map((note) => `<li>${note}</li>`).join("")
          : "<li>No PYQs saved yet</li>"
      }</ul>
      <button onclick="window.location.href='upload.html'">➕ Add PYQs</button>
    </div>
    <div class="account-actions">
      <button class="edit-password-btn" onclick="showChangePasswordForm()">🔒 Change Password</button>
      <button class="logout-btn" onclick="logoutUser()">🚪 Logout</button>
      <button class="delete-account-btn" onclick="showDeleteAccountForm()">🗑️ Delete Account</button>
    </div>
    
    <div class="change-password-form" id="changePasswordForm" style="display: none;">
      <h3>Change Password</h3>
      <form id="passwordForm">
        <div class="form-group">
          <label for="currentPassword">Current Password:</label>
          <input type="password" id="currentPassword" required placeholder="Enter current password">
        </div>
        <div class="form-group">
          <label for="newPassword">New Password:</label>
          <input type="password" id="newPassword" required placeholder="Enter new password">
        </div>
        <div class="form-group">
          <label for="confirmNewPassword">Confirm New Password:</label>
          <input type="password" id="confirmNewPassword" required placeholder="Confirm new password">
        </div>
        <div class="form-actions">
          <button type="submit" class="save-btn">Change Password</button>
          <button type="button" class="cancel-btn" onclick="hideChangePasswordForm()">Cancel</button>
        </div>
      </form>
    </div>
  `;

  // Add form event listeners
  document.addEventListener("submit", async function (e) {
    if (e.target.id === "profileForm") {
      e.preventDefault();
      await updateProfile();
    } else if (e.target.id === "passwordForm") {
      e.preventDefault();
      await changePassword();
    }
  });
});

// Profile management functions
function showEditProfileForm() {
  document.getElementById("editProfileForm").style.display = "block";
  document.querySelector(".edit-profile-btn").style.display = "none";
}

function hideEditProfileForm() {
  document.getElementById("editProfileForm").style.display = "none";
  document.querySelector(".edit-profile-btn").style.display = "inline-block";
}

function showChangePasswordForm() {
  document.getElementById("changePasswordForm").style.display = "block";
  document.querySelector(".edit-password-btn").style.display = "none";
}

function hideChangePasswordForm() {
  document.getElementById("changePasswordForm").style.display = "none";
  document.querySelector(".edit-password-btn").style.display = "inline-block";
  // Clear form
  document.getElementById("passwordForm").reset();
}

async function updateProfile() {
  const college = document.getElementById("collegeName").value.trim();
  const branch = document.getElementById("branchName").value.trim();
  const year = document.getElementById("yearName").value;

  try {
    const result = await window.authService.updateProfile({
      college: college,
      branch: branch,
      year: year,
    });

    if (result.success) {
      // Show success message
      showMessage(result.message, "success");

      // Refresh the page to show updated data
      setTimeout(() => {
        window.location.reload();
      }, 1500);
    } else {
      showMessage(result.message, "error");
    }
  } catch (error) {
    console.error("Profile update error:", error);
    showMessage("Failed to update profile. Please try again.", "error");
  }
}

async function changePassword() {
  const currentPassword = document.getElementById("currentPassword").value;
  const newPassword = document.getElementById("newPassword").value;
  const confirmPassword = document.getElementById("confirmNewPassword").value;

  // Validate passwords match
  if (newPassword !== confirmPassword) {
    showMessage("New passwords do not match.", "error");
    return;
  }

  if (newPassword.length < 8) {
    showMessage("New password must be at least 8 characters long.", "error");
    return;
  }

  try {
    const result = await window.authService.changePassword(
      currentPassword,
      newPassword
    );

    if (result.success) {
      showMessage(result.message, "success");
      hideChangePasswordForm();
    } else {
      showMessage(result.message, "error");
    }
  } catch (error) {
    console.error("Password change error:", error);
    showMessage("Failed to change password. Please try again.", "error");
  }
}

function logoutUser() {
  if (confirm("Are you sure you want to logout?")) {
    window.authService.logout();
  }
}

function showDeleteAccountForm() {
  const password = prompt(
    "Please enter your password to confirm account deletion:"
  );
  if (password) {
    deleteUserAccount(password);
  }
}

async function deleteUserAccount(password) {
  try {
    const result = await window.authService.deleteAccount(password);

    if (result.success) {
      alert(result.message);
      // User will be automatically redirected by the auth service
    } else {
      alert(result.message);
    }
  } catch (error) {
    console.error("Account deletion error:", error);
    alert("Failed to delete account. Please try again.");
  }
}

function showMessage(message, type = "success") {
  // Create or update message element
  let messageEl = document.getElementById("messageBox");
  if (!messageEl) {
    messageEl = document.createElement("div");
    messageEl.id = "messageBox";
    messageEl.className = "message-box";
    document.body.appendChild(messageEl);
  }

  messageEl.textContent = message;
  messageEl.className = `message-box show ${type}`;
  messageEl.style.backgroundColor = type === "error" ? "#f44336" : "#4caf50";

  setTimeout(() => {
    messageEl.classList.remove("show");
  }, 3000);
}
