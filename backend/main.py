from fastapi import FastAPI, UploadFile, File, BackgroundTasks, HTTPException
import shutil
from pydantic import BaseModel
from pathlib import Path
from datetime import datetime, timezone
import threading
import uuid
from rag_pipeline import ask_question, process_pdf

app = FastAPI()
BASE_DIR = Path(__file__).resolve().parent
UPLOADS_DIR = BASE_DIR / "uploads"
UPLOADS_DIR.mkdir(parents=True, exist_ok=True)

JOBS = {}
JOBS_LOCK = threading.Lock()
LATEST_JOB_ID = None

@app.get("/")
def read_root():
    return {"message": "RAG API is running"}


def _utc_now():
    return datetime.now(timezone.utc).isoformat()


def _create_job(filename):
    global LATEST_JOB_ID
    job_id = str(uuid.uuid4())
    with JOBS_LOCK:
        JOBS[job_id] = {
            "job_id": job_id,
            "filename": filename,
            "status": "queued",
            "created_at": _utc_now(),
            "updated_at": _utc_now()
        }
        LATEST_JOB_ID = job_id
    return job_id


def _update_job(job_id, **fields):
    with JOBS_LOCK:
        if job_id in JOBS:
            JOBS[job_id].update(fields)
            JOBS[job_id]["updated_at"] = _utc_now()


def _run_index_job(job_id, file_location):
    _update_job(job_id, status="processing", started_at=_utc_now())
    try:
        result = process_pdf(str(file_location))
        _update_job(job_id, status="completed", finished_at=_utc_now(), result=result)
    except Exception as exc:
        _update_job(job_id, status="failed", finished_at=_utc_now(), error=str(exc))


@app.post("/upload")
async def upload_file(background_tasks: BackgroundTasks, file: UploadFile = File(...)):

    file_location = UPLOADS_DIR / file.filename

    with open(file_location, "wb") as buffer:
        shutil.copyfileobj(file.file, buffer)

    job_id = _create_job(file.filename)
    background_tasks.add_task(_run_index_job, job_id, file_location)

    return {"job_id": job_id, "filename": file.filename, "status": "queued"}


@app.get("/upload/status/{job_id}")
def upload_status(job_id: str):
    with JOBS_LOCK:
        job = JOBS.get(job_id)
    if not job:
        raise HTTPException(status_code=404, detail="Job not found")
    return job


@app.get("/upload/status/latest")
def upload_latest_status():
    with JOBS_LOCK:
        if not LATEST_JOB_ID:
            return {"status": "idle"}
        return JOBS[LATEST_JOB_ID]

class QuestionRequest(BaseModel):
    question: str


@app.post("/ask")
def ask(req: QuestionRequest):
    with JOBS_LOCK:
        latest_job = JOBS.get(LATEST_JOB_ID) if LATEST_JOB_ID else None

    if latest_job and latest_job.get("status") in {"queued", "processing"}:
        raise HTTPException(
            status_code=409,
            detail="Indexing in progress. Please wait until indexing completes."
        )

    try:
        answer = ask_question(req.question)
        return {"answer": answer}
    except FileNotFoundError as exc:
        raise HTTPException(status_code=400, detail=str(exc)) from exc
