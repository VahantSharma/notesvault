/**
 * NotesVault Authentication Service
 * Handles user registration, login, session management, and security
 * Uses Web Crypto API for secure password hashing and localStorage for persistence
 */

class AuthService {
  constructor() {
    this.sessionKey = "notesvault_session";
    this.usersKey = "notesvault_users";
    this.sessionTimeout = 24 * 60 * 60 * 1000; // 24 hours in milliseconds
    this.init();
  }

  /**
   * Initialize the authentication service
   */
  init() {
    // Check if session exists and is valid
    this.validateSession();
  }

  /**
   * Generate a random salt for password hashing
   * @returns {Promise<string>} Base64 encoded salt
   */
  async generateSalt() {
    const salt = window.crypto.getRandomValues(new Uint8Array(16));
    return btoa(String.fromCharCode(...salt));
  }

  /**
   * Hash password with salt using Web Crypto API
   * @param {string} password - Plain text password
   * @param {string} salt - Base64 encoded salt
   * @returns {Promise<string>} Base64 encoded hash
   */
  async hashPassword(password, salt) {
    const encoder = new TextEncoder();
    const data = encoder.encode(password + salt);
    const hashBuffer = await window.crypto.subtle.digest("SHA-256", data);
    const hashArray = new Uint8Array(hashBuffer);
    return btoa(String.fromCharCode(...hashArray));
  }

  /**
   * Validate email format
   * @param {string} email - Email to validate
   * @returns {boolean} True if valid
   */
  validateEmail(email) {
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    return emailRegex.test(email);
  }

  /**
   * Validate password strength
   * @param {string} password - Password to validate
   * @returns {object} Validation result with isValid and message
   */
  validatePassword(password) {
    if (password.length < 8) {
      return {
        isValid: false,
        message: "Password must be at least 8 characters long",
      };
    }
    if (!/(?=.*[a-z])(?=.*[A-Z])(?=.*\d)/.test(password)) {
      return {
        isValid: false,
        message:
          "Password must contain at least one uppercase letter, one lowercase letter, and one number",
      };
    }
    return { isValid: true, message: "Password is valid" };
  }

  /**
   * Sanitize user input
   * @param {string} input - Input to sanitize
   * @returns {string} Sanitized input
   */
  sanitizeInput(input) {
    return input.trim().replace(/[<>'"]/g, "");
  }

  /**
   * Get all users from localStorage
   * @returns {Array} Array of user objects
   */
  getUsers() {
    const users = localStorage.getItem(this.usersKey);
    return users ? JSON.parse(users) : [];
  }

  /**
   * Save users to localStorage
   * @param {Array} users - Array of user objects
   */
  saveUsers(users) {
    localStorage.setItem(this.usersKey, JSON.stringify(users));
  }

  /**
   * Check if user with email already exists
   * @param {string} email - Email to check
   * @returns {boolean} True if user exists
   */
  userExists(email) {
    const users = this.getUsers();
    return users.some((user) => user.email === email);
  }

  /**
   * Register a new user
   * @param {object} userData - User data {name, email, password}
   * @returns {Promise<object>} Registration result
   */
  async register(userData) {
    try {
      const { name, email, password } = userData;

      // Validate inputs
      if (!name || !email || !password) {
        return { success: false, message: "All fields are required" };
      }

      // Sanitize inputs
      const sanitizedName = this.sanitizeInput(name);
      const sanitizedEmail = this.sanitizeInput(email).toLowerCase();

      // Validate email
      if (!this.validateEmail(sanitizedEmail)) {
        return {
          success: false,
          message: "Please enter a valid email address",
        };
      }

      // Validate password
      const passwordValidation = this.validatePassword(password);
      if (!passwordValidation.isValid) {
        return { success: false, message: passwordValidation.message };
      }

      // Check if user already exists
      if (this.userExists(sanitizedEmail)) {
        return {
          success: false,
          message: "An account with this email already exists",
        };
      }

      // Generate salt and hash password
      const salt = await this.generateSalt();
      const hashedPassword = await this.hashPassword(password, salt);

      // Create user object
      const newUser = {
        id: Date.now().toString(),
        name: sanitizedName,
        email: sanitizedEmail,
        passwordHash: hashedPassword,
        salt: salt,
        createdAt: new Date().toISOString(),
        college: "",
        branch: "",
        year: "",
        notes: {
          lectures: [],
          pyqs: [],
        },
      };

      // Save user
      const users = this.getUsers();
      users.push(newUser);
      this.saveUsers(users);

      return { success: true, message: "Account created successfully!" };
    } catch (error) {
      console.error("Registration error:", error);
      return {
        success: false,
        message: "Registration failed. Please try again.",
      };
    }
  }

  /**
   * Login user
   * @param {string} email - User email
   * @param {string} password - User password
   * @param {boolean} remember - Remember user session
   * @returns {Promise<object>} Login result
   */
  async login(email, password, remember = false) {
    try {
      // Validate inputs
      if (!email || !password) {
        return { success: false, message: "Email and password are required" };
      }

      const sanitizedEmail = this.sanitizeInput(email).toLowerCase();

      // Find user
      const users = this.getUsers();
      const user = users.find((u) => u.email === sanitizedEmail);

      if (!user) {
        return { success: false, message: "Invalid email or password" };
      }

      // Verify password
      const hashedPassword = await this.hashPassword(password, user.salt);
      if (hashedPassword !== user.passwordHash) {
        return { success: false, message: "Invalid email or password" };
      }

      // Create session
      const session = {
        userId: user.id,
        email: user.email,
        name: user.name,
        loginTime: Date.now(),
        remember: remember,
      };

      // Save session
      localStorage.setItem(this.sessionKey, JSON.stringify(session));

      return {
        success: true,
        message: "Login successful!",
        user: {
          id: user.id,
          name: user.name,
          email: user.email,
          college: user.college,
          branch: user.branch,
          year: user.year,
        },
      };
    } catch (error) {
      console.error("Login error:", error);
      return { success: false, message: "Login failed. Please try again." };
    }
  }

  /**
   * Get current logged-in user
   * @returns {object|null} User object or null if not logged in
   */
  getCurrentUser() {
    const session = this.getSession();
    if (!session) return null;

    const users = this.getUsers();
    const user = users.find((u) => u.id === session.userId);

    if (!user) {
      this.logout();
      return null;
    }

    return {
      id: user.id,
      name: user.name,
      email: user.email,
      college: user.college,
      branch: user.branch,
      year: user.year,
      createdAt: user.createdAt,
      notes: user.notes,
    };
  }

  /**
   * Get current session
   * @returns {object|null} Session object or null
   */
  getSession() {
    const sessionData = localStorage.getItem(this.sessionKey);
    return sessionData ? JSON.parse(sessionData) : null;
  }

  /**
   * Check if user is logged in
   * @returns {boolean} True if logged in
   */
  isLoggedIn() {
    return this.getCurrentUser() !== null;
  }

  /**
   * Validate current session
   */
  validateSession() {
    const session = this.getSession();
    if (!session) return;

    // Check if session has expired (only if not remember me)
    if (!session.remember) {
      const now = Date.now();
      const sessionAge = now - session.loginTime;

      if (sessionAge > this.sessionTimeout) {
        this.logout();
        return;
      }
    }

    // Update last activity time
    session.lastActivity = Date.now();
    localStorage.setItem(this.sessionKey, JSON.stringify(session));
  }

  /**
   * Update user profile
   * @param {object} profileData - Profile data to update
   * @returns {object} Update result
   */
  async updateProfile(profileData) {
    try {
      const currentUser = this.getCurrentUser();
      if (!currentUser) {
        return { success: false, message: "Not logged in" };
      }

      const users = this.getUsers();
      const userIndex = users.findIndex((u) => u.id === currentUser.id);

      if (userIndex === -1) {
        return { success: false, message: "User not found" };
      }

      // Update allowed fields
      const allowedFields = ["name", "college", "branch", "year"];
      allowedFields.forEach((field) => {
        if (profileData[field] !== undefined) {
          users[userIndex][field] = this.sanitizeInput(profileData[field]);
        }
      });

      users[userIndex].updatedAt = new Date().toISOString();
      this.saveUsers(users);

      return { success: true, message: "Profile updated successfully!" };
    } catch (error) {
      console.error("Profile update error:", error);
      return { success: false, message: "Failed to update profile" };
    }
  }

  /**
   * Change user password
   * @param {string} currentPassword - Current password
   * @param {string} newPassword - New password
   * @returns {Promise<object>} Change result
   */
  async changePassword(currentPassword, newPassword) {
    try {
      const currentUser = this.getCurrentUser();
      if (!currentUser) {
        return { success: false, message: "Not logged in" };
      }

      const users = this.getUsers();
      const user = users.find((u) => u.id === currentUser.id);

      if (!user) {
        return { success: false, message: "User not found" };
      }

      // Verify current password
      const hashedCurrentPassword = await this.hashPassword(
        currentPassword,
        user.salt
      );
      if (hashedCurrentPassword !== user.passwordHash) {
        return { success: false, message: "Current password is incorrect" };
      }

      // Validate new password
      const passwordValidation = this.validatePassword(newPassword);
      if (!passwordValidation.isValid) {
        return { success: false, message: passwordValidation.message };
      }

      // Generate new salt and hash new password
      const newSalt = await this.generateSalt();
      const newHashedPassword = await this.hashPassword(newPassword, newSalt);

      // Update password
      user.passwordHash = newHashedPassword;
      user.salt = newSalt;
      user.updatedAt = new Date().toISOString();

      this.saveUsers(users);

      return { success: true, message: "Password changed successfully!" };
    } catch (error) {
      console.error("Password change error:", error);
      return { success: false, message: "Failed to change password" };
    }
  }

  /**
   * Logout user
   */
  logout() {
    localStorage.removeItem(this.sessionKey);

    // Redirect to home page
    if (
      window.location.pathname !== "/index.html" &&
      !window.location.pathname.endsWith("/")
    ) {
      window.location.href = "../index.html";
    }
  }

  /**
   * Delete user account
   * @param {string} password - User password for confirmation
   * @returns {Promise<object>} Delete result
   */
  async deleteAccount(password) {
    try {
      const currentUser = this.getCurrentUser();
      if (!currentUser) {
        return { success: false, message: "Not logged in" };
      }

      const users = this.getUsers();
      const user = users.find((u) => u.id === currentUser.id);

      if (!user) {
        return { success: false, message: "User not found" };
      }

      // Verify password
      const hashedPassword = await this.hashPassword(password, user.salt);
      if (hashedPassword !== user.passwordHash) {
        return { success: false, message: "Password is incorrect" };
      }

      // Remove user
      const updatedUsers = users.filter((u) => u.id !== currentUser.id);
      this.saveUsers(updatedUsers);

      // Logout
      this.logout();

      return { success: true, message: "Account deleted successfully" };
    } catch (error) {
      console.error("Account deletion error:", error);
      return { success: false, message: "Failed to delete account" };
    }
  }

  /**
   * Reset password (demo version - in production this would involve email verification)
   * @param {string} email - User email
   * @returns {Promise<object>} Reset result
   */
  async resetPassword(email) {
    try {
      const sanitizedEmail = this.sanitizeInput(email).toLowerCase();

      if (!this.validateEmail(sanitizedEmail)) {
        return {
          success: false,
          message: "Please enter a valid email address",
        };
      }

      const users = this.getUsers();
      const user = users.find((u) => u.email === sanitizedEmail);

      if (!user) {
        // Don't reveal if email exists for security
        return {
          success: true,
          message:
            "If an account with this email exists, a reset link has been sent.",
        };
      }

      // In a real app, you'd send an email here
      // For demo purposes, we'll generate a temporary password
      const tempPassword = Math.random().toString(36).slice(-8);

      // Generate new salt and hash for temp password
      const newSalt = await this.generateSalt();
      const newHashedPassword = await this.hashPassword(tempPassword, newSalt);

      // Update user password
      const userIndex = users.findIndex((u) => u.id === user.id);
      users[userIndex].passwordHash = newHashedPassword;
      users[userIndex].salt = newSalt;
      users[userIndex].tempPassword = tempPassword; // Store for demo purposes
      users[userIndex].mustChangePassword = true;
      users[userIndex].updatedAt = new Date().toISOString();

      this.saveUsers(users);

      // In demo, show the temp password (in production, this would be emailed)
      return {
        success: true,
        message: `Password reset successful! Your temporary password is: ${tempPassword}. Please login and change your password immediately.`,
        tempPassword: tempPassword,
      };
    } catch (error) {
      console.error("Password reset error:", error);
      return {
        success: false,
        message: "Password reset failed. Please try again.",
      };
    }
  }
}

// Create global auth service instance
window.authService = new AuthService();

// Route protection utility
window.requireAuth = function () {
  if (!window.authService.isLoggedIn()) {
    // Store the intended destination
    sessionStorage.setItem("redirectAfterLogin", window.location.href);
    window.location.href = window.location.pathname.includes("/pages/")
      ? "login.html"
      : "pages/login.html";
    return false;
  }
  return true;
};

// Redirect if logged in utility (for login/signup pages)
window.redirectIfLoggedIn = function () {
  if (window.authService.isLoggedIn()) {
    const redirectUrl =
      sessionStorage.getItem("redirectAfterLogin") ||
      (window.location.pathname.includes("/pages/")
        ? "../index.html"
        : "index.html");
    sessionStorage.removeItem("redirectAfterLogin");
    window.location.href = redirectUrl;
    return true;
  }
  return false;
};

// DOM loaded event to initialize auth state
document.addEventListener("DOMContentLoaded", function () {
  // Update navigation based on auth state
  updateNavigationState();
});

/**
 * Update navigation elements based on authentication state
 */
function updateNavigationState() {
  const signupElements = document.querySelectorAll(
    "#header-signup-box, .signup-btn, .navbar-right"
  );
  const user = window.authService.getCurrentUser();

  signupElements.forEach((element) => {
    if (user) {
      // User is logged in - show user menu
      const firstName = user.name.split(" ")[0];
      element.innerHTML = `
                <div class="user-menu">
                    <span class="user-name">Hi, ${firstName}!</span>
                    <div class="user-dropdown">
                        <a href="${
                          window.location.pathname.includes("/pages/")
                            ? ""
                            : "pages/"
                        }studentAccount.html">👤 My Account</a>
                        <a href="${
                          window.location.pathname.includes("/pages/")
                            ? ""
                            : "pages/"
                        }upload.html">📤 Upload Notes</a>
                        <a href="#" onclick="window.authService.logout()">🚪 Logout</a>
                    </div>
                </div>
            `;

      // Add user menu styles if not already added
      if (!document.getElementById("userMenuStyles")) {
        const style = document.createElement("style");
        style.id = "userMenuStyles";
        style.textContent = `
                    .user-menu {
                        position: relative;
                        display: inline-block;
                    }
                    
                    .user-name {
                        background-color: #1a73e8;
                        color: white;
                        padding: 8px 15px;
                        border-radius: 20px;
                        cursor: pointer;
                        font-weight: 500;
                        font-size: 14px;
                        transition: background-color 0.3s ease;
                    }
                    
                    .user-name:hover {
                        background-color: #0f5ec9;
                    }
                    
                    .user-dropdown {
                        display: none;
                        position: absolute;
                        right: 0;
                        top: 100%;
                        margin-top: 5px;
                        background-color: white;
                        border: 1px solid #ddd;
                        border-radius: 8px;
                        box-shadow: 0 4px 12px rgba(0,0,0,0.15);
                        z-index: 1000;
                        min-width: 180px;
                    }
                    
                    .user-menu:hover .user-dropdown {
                        display: block;
                    }
                    
                    .user-dropdown a {
                        display: block;
                        padding: 12px 16px;
                        color: #333;
                        text-decoration: none;
                        border-bottom: 1px solid #eee;
                        transition: background-color 0.2s ease;
                    }
                    
                    .user-dropdown a:last-child {
                        border-bottom: none;
                    }
                    
                    .user-dropdown a:hover {
                        background-color: #f5f5f5;
                    }
                    
                    .user-dropdown a:first-child {
                        border-radius: 8px 8px 0 0;
                    }
                    
                    .user-dropdown a:last-child {
                        border-radius: 0 0 8px 8px;
                    }
                `;
        document.head.appendChild(style);
      }
    } else {
      // User is not logged in - show signup button
      const signupPath = window.location.pathname.includes("/pages/")
        ? "signup.html"
        : "pages/signup.html";
      const loginPath = window.location.pathname.includes("/pages/")
        ? "login.html"
        : "pages/login.html";

      // Check if this is a navbar-right element (for main page)
      if (element.classList.contains("navbar-right")) {
        element.innerHTML = `
                    <a href="${loginPath}" class="login-btn">Login</a>
                    <a href="${signupPath}" class="signup-btn">Sign Up</a>
                    <div id="hamburger" class="hamburger-icon">☰</div>
                `;
      } else {
        element.innerHTML = `<a href="${signupPath}"><p>Sign Up</p></a>`;
      }
    }
  });

  // Update page-specific elements
  updatePageSpecificElements(user);
}

/**
 * Update page-specific elements based on authentication state
 */
function updatePageSpecificElements(user) {
  // Update welcome message on main page
  const welcomeText = document.querySelector(".main-text.welcome");
  if (welcomeText && user) {
    welcomeText.textContent = `Welcome back, ${user.name.split(" ")[0]}!`;
  }

  // Update any "Student Account" links to be protected
  const studentAccountLinks = document.querySelectorAll(
    'a[href*="studentAccount"]'
  );
  studentAccountLinks.forEach((link) => {
    if (!user) {
      link.addEventListener("click", function (e) {
        e.preventDefault();
        sessionStorage.setItem("redirectAfterLogin", link.href);
        const loginPath = window.location.pathname.includes("/pages/")
          ? "login.html"
          : "pages/login.html";
        window.location.href = loginPath;
      });
    }
  });
}
