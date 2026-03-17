const STORAGE_KEY = "rag_ui_state_v1";
const USER_STORAGE_KEY = "rag_ui_users_v1";
const SESSION_STORAGE_KEY = "rag_ui_session_v1";

function readState() {
  try {
    return JSON.parse(localStorage.getItem(STORAGE_KEY)) || {};
  } catch {
    return {};
  }
}

function writeState(nextState) {
  const current = readState();
  localStorage.setItem(STORAGE_KEY, JSON.stringify({ ...current, ...nextState }));
}

function getApiBase(defaultValue = "http://127.0.0.1:8000") {
  const state = readState();
  return state.apiBase || defaultValue;
}

function setApiBase(value) {
  writeState({ apiBase: String(value || "").trim().replace(/\/+$/, "") });
}

function setLastResult(payload) {
  writeState({
    lastQuestion: payload.lastQuestion || "",
    lastAnswer: payload.lastAnswer || "",
    lastFileName: payload.lastFileName || "",
    updatedAt: new Date().toISOString()
  });
}

async function parseError(response) {
  try {
    const data = await response.json();
    if (data && data.detail) return String(data.detail);
    return JSON.stringify(data);
  } catch {
    return response.statusText || "Unexpected error";
  }
}

function setButtonLoading(button, loading, loadingText = "Please wait...") {
  if (!button) return;
  if (!button.dataset.defaultText) {
    button.dataset.defaultText = button.textContent;
  }
  button.disabled = loading;
  button.textContent = loading ? loadingText : button.dataset.defaultText;
}

window.ragShared = {
  readState,
  writeState,
  getApiBase,
  setApiBase,
  setLastResult,
  parseError,
  setButtonLoading
};

function readUsers() {
  try {
    return JSON.parse(localStorage.getItem(USER_STORAGE_KEY)) || [];
  } catch {
    return [];
  }
}

function writeUsers(users) {
  localStorage.setItem(USER_STORAGE_KEY, JSON.stringify(users));
}

function getSession() {
  try {
    return JSON.parse(localStorage.getItem(SESSION_STORAGE_KEY)) || null;
  } catch {
    return null;
  }
}

function setSession(session) {
  if (!session) {
    localStorage.removeItem(SESSION_STORAGE_KEY);
    return;
  }
  localStorage.setItem(SESSION_STORAGE_KEY, JSON.stringify(session));
}

function signUp(name, email, password) {
  const users = readUsers();
  const normalizedEmail = String(email || "").trim().toLowerCase();
  if (!normalizedEmail || !password) {
    throw new Error("Email and password are required.");
  }
  if (users.some((user) => user.email === normalizedEmail)) {
    throw new Error("Account already exists with this email.");
  }

  const user = {
    id: `${Date.now()}-${Math.random().toString(16).slice(2)}`,
    name: String(name || "").trim() || "User",
    email: normalizedEmail,
    password: String(password)
  };
  users.push(user);
  writeUsers(users);
  setSession({ userId: user.id, name: user.name, email: user.email });
  return { name: user.name, email: user.email };
}

function login(email, password) {
  const normalizedEmail = String(email || "").trim().toLowerCase();
  const user = readUsers().find(
    (candidate) => candidate.email === normalizedEmail && candidate.password === String(password)
  );
  if (!user) {
    throw new Error("Invalid email or password.");
  }
  setSession({ userId: user.id, name: user.name, email: user.email });
  return { name: user.name, email: user.email };
}

function logout() {
  setSession(null);
}

function currentUser() {
  return getSession();
}

function requireAuth(redirectTo = "login.html") {
  if (!currentUser()) {
    const next = encodeURIComponent(window.location.pathname.split("/").pop() || "upload.html");
    window.location.href = `${redirectTo}?next=${next}`;
    return false;
  }
  return true;
}

function renderAuthNav() {
  const container = document.querySelector("[data-auth-nav]");
  if (!container) return;

  const user = currentUser();
  if (user) {
    container.innerHTML = `
      <span class="auth-user">Hi, ${user.name}</span>
      <button type="button" id="logoutBtn" class="btn btn-secondary btn-sm">Logout</button>
    `;
    const logoutBtn = document.getElementById("logoutBtn");
    if (logoutBtn) {
      logoutBtn.addEventListener("click", () => {
        logout();
        window.location.href = "index.html";
      });
    }
    return;
  }

  container.innerHTML = `
    <a class="btn btn-secondary btn-sm" href="login.html">Login</a>
    <a class="btn btn-primary btn-sm" href="signup.html">Sign Up</a>
  `;
}

window.ragAuth = {
  signUp,
  login,
  logout,
  currentUser,
  requireAuth,
  renderAuthNav
};

document.addEventListener("DOMContentLoaded", () => {
  window.ragAuth.renderAuthNav();
  if (document.body.dataset.protected === "true") {
    window.ragAuth.requireAuth();
  }
});
