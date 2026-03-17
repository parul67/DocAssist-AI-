const lastQuestionEl = document.getElementById("lastQuestion");
const lastAnswerEl = document.getElementById("lastAnswer");
const metaInfoEl = document.getElementById("metaInfo");
const apiBaseInput = document.getElementById("apiBase");
const followUpForm = document.getElementById("followUpForm");
const followUpQuestionInput = document.getElementById("followUpQuestion");
const followUpBtn = document.getElementById("followUpBtn");
const followUpStatus = document.getElementById("followUpStatus");

function renderState() {
  const state = window.ragShared.readState();
  lastQuestionEl.textContent = state.lastQuestion || "No question asked yet.";
  lastAnswerEl.textContent = state.lastAnswer || "No response generated yet.";

  if (state.updatedAt || state.lastFileName) {
    const parts = [];
    if (state.lastFileName) parts.push(`File: ${state.lastFileName}`);
    if (state.updatedAt) parts.push(`Updated: ${new Date(state.updatedAt).toLocaleString()}`);
    metaInfoEl.textContent = parts.join(" | ");
  }
}

apiBaseInput.value = window.ragShared.getApiBase();
renderState();

apiBaseInput.addEventListener("change", () => {
  window.ragShared.setApiBase(apiBaseInput.value);
});

followUpForm.addEventListener("submit", async (event) => {
  event.preventDefault();
  const question = followUpQuestionInput.value.trim();
  if (!question) return;

  try {
    window.ragShared.setButtonLoading(followUpBtn, true, "Asking...");
    followUpStatus.textContent = "Fetching answer...";
    followUpStatus.className = "status";
    window.ragShared.setApiBase(apiBaseInput.value);

    const response = await fetch(`${window.ragShared.getApiBase()}/ask`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ question })
    });

    if (!response.ok) {
      throw new Error(await window.ragShared.parseError(response));
    }

    const data = await response.json();
    window.ragShared.setLastResult({
      lastQuestion: question,
      lastAnswer: data.answer || "No answer returned.",
      lastFileName: window.ragShared.readState().lastFileName || ""
    });
    followUpQuestionInput.value = "";
    followUpStatus.textContent = "Answer updated.";
    followUpStatus.className = "status good";
    renderState();
  } catch (error) {
    followUpStatus.textContent = `Request failed: ${error.message}`;
    followUpStatus.className = "status bad";
  } finally {
    window.ragShared.setButtonLoading(followUpBtn, false);
  }
});
