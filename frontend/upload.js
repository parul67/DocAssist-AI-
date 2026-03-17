const uploadForm = document.getElementById("uploadForm");
const askForm = document.getElementById("askForm");
const apiBaseInput = document.getElementById("apiBase");
const fileInput = document.getElementById("pdfFile");
const questionInput = document.getElementById("question");
const uploadBtn = document.getElementById("uploadBtn");
const askBtn = document.getElementById("askBtn");
const uploadStatus = document.getElementById("uploadStatus");
const askStatus = document.getElementById("askStatus");

const state = window.ragShared.readState();
let hasIndexed = Boolean(state.lastFileName);
let pollingTimer = null;

apiBaseInput.value = window.ragShared.getApiBase();

function setAskEnabled(enabled) {
  askBtn.disabled = !enabled;
}

setAskEnabled(hasIndexed);

if (hasIndexed) {
  uploadStatus.textContent = `Indexed document: ${state.lastFileName}`;
  uploadStatus.classList.add("good");
  askStatus.textContent = "Ready. Ask your question.";
  askStatus.classList.remove("bad");
}

apiBaseInput.addEventListener("change", () => {
  window.ragShared.setApiBase(apiBaseInput.value);
});

uploadForm.addEventListener("submit", async (event) => {
  event.preventDefault();
  const file = fileInput.files[0];
  if (!file) {
    uploadStatus.textContent = "Please select a PDF.";
    uploadStatus.className = "status bad";
    return;
  }

  const formData = new FormData();
  formData.append("file", file);

  try {
    window.ragShared.setButtonLoading(uploadBtn, true, "Uploading...");
    hasIndexed = false;
    setAskEnabled(false);
    uploadStatus.textContent = `Uploading ${file.name}...`;
    uploadStatus.className = "status";
    askStatus.textContent = "Indexing started. Please wait...";
    askStatus.className = "status";
    window.ragShared.setApiBase(apiBaseInput.value);

    const response = await fetch(`${window.ragShared.getApiBase()}/upload`, {
      method: "POST",
      body: formData
    });

    if (!response.ok) {
      throw new Error(await window.ragShared.parseError(response));
    }

    const data = await response.json();
    window.ragShared.writeState({ lastFileName: data.filename });
    uploadStatus.textContent = `Upload complete. Job queued: ${data.job_id}`;
    uploadStatus.className = "status";

    if (pollingTimer) clearInterval(pollingTimer);
    pollingTimer = setInterval(async () => {
      try {
        const statusResponse = await fetch(
          `${window.ragShared.getApiBase()}/upload/status/${data.job_id}`
        );
        if (!statusResponse.ok) {
          throw new Error(await window.ragShared.parseError(statusResponse));
        }
        const job = await statusResponse.json();

        if (job.status === "queued" || job.status === "processing") {
          uploadStatus.textContent = `Indexing ${job.filename}... (${job.status})`;
          askStatus.textContent = "Indexing in progress...";
          return;
        }

        clearInterval(pollingTimer);
        pollingTimer = null;

        if (job.status === "completed") {
          hasIndexed = true;
          setAskEnabled(true);
          const resultStatus = job.result && job.result.status ? job.result.status : "indexed";
          const message = resultStatus === "skipped"
            ? `Ready: ${job.filename} (same file, reused index)`
            : `Index ready: ${job.filename}`;
          uploadStatus.textContent = message;
          uploadStatus.className = "status good";
          askStatus.textContent = "Ready. Ask your question.";
          askStatus.className = "status good";
          return;
        }

        hasIndexed = false;
        setAskEnabled(false);
        uploadStatus.textContent = `Indexing failed: ${job.error || "Unknown error"}`;
        uploadStatus.className = "status bad";
        askStatus.textContent = "Upload a PDF and retry.";
        askStatus.className = "status bad";
      } catch (error) {
        clearInterval(pollingTimer);
        pollingTimer = null;
        uploadStatus.textContent = `Status check failed: ${error.message}`;
        uploadStatus.className = "status bad";
      }
    }, 1500);
  } catch (error) {
    uploadStatus.textContent = `Upload failed: ${error.message}`;
    uploadStatus.className = "status bad";
    askStatus.textContent = "Upload and index a PDF first.";
    askStatus.className = "status bad";
  } finally {
    window.ragShared.setButtonLoading(uploadBtn, false);
  }
});

askForm.addEventListener("submit", async (event) => {
  event.preventDefault();
  const question = questionInput.value.trim();
  if (!question) return;

  if (!hasIndexed) {
    askStatus.textContent = "Upload and index a PDF first.";
    askStatus.className = "status bad";
    return;
  }

  try {
    window.ragShared.setButtonLoading(askBtn, true, "Generating...");
    askStatus.textContent = "Generating response...";
    askStatus.className = "status";
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
    askStatus.textContent = "Response ready. Redirecting...";
    askStatus.className = "status good";
    window.location.href = "response.html";
  } catch (error) {
    askStatus.textContent = `Request failed: ${error.message}`;
    askStatus.className = "status bad";
  } finally {
    window.ragShared.setButtonLoading(askBtn, false);
  }
});
