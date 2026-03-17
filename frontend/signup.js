const signupForm = document.getElementById("signupForm");
const nameInput = document.getElementById("name");
const emailInput = document.getElementById("email");
const passwordInput = document.getElementById("password");
const signupBtn = document.getElementById("signupBtn");
const signupStatus = document.getElementById("signupStatus");

const params = new URLSearchParams(window.location.search);
const nextPage = params.get("next") || "upload.html";

if (window.ragAuth.currentUser()) {
  window.location.href = nextPage;
}

signupForm.addEventListener("submit", (event) => {
  event.preventDefault();
  try {
    window.ragShared.setButtonLoading(signupBtn, true, "Creating...");
    window.ragAuth.signUp(nameInput.value, emailInput.value, passwordInput.value);
    signupStatus.textContent = "Account created. Redirecting...";
    signupStatus.className = "status good";
    window.location.href = nextPage;
  } catch (error) {
    signupStatus.textContent = error.message;
    signupStatus.className = "status bad";
  } finally {
    window.ragShared.setButtonLoading(signupBtn, false);
  }
});
