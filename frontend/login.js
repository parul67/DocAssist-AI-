const loginForm = document.getElementById("loginForm");
const emailInput = document.getElementById("email");
const passwordInput = document.getElementById("password");
const loginBtn = document.getElementById("loginBtn");
const loginStatus = document.getElementById("loginStatus");

const params = new URLSearchParams(window.location.search);
const nextPage = params.get("next") || "upload.html";

if (window.ragAuth.currentUser()) {
  window.location.href = nextPage;
}

loginForm.addEventListener("submit", (event) => {
  event.preventDefault();
  try {
    window.ragShared.setButtonLoading(loginBtn, true, "Logging in...");
    window.ragAuth.login(emailInput.value, passwordInput.value);
    loginStatus.textContent = "Login successful. Redirecting...";
    loginStatus.className = "status good";
    window.location.href = nextPage;
  } catch (error) {
    loginStatus.textContent = error.message;
    loginStatus.className = "status bad";
  } finally {
    window.ragShared.setButtonLoading(loginBtn, false);
  }
});
