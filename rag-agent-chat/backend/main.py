from __future__ import annotations

import logging
import sqlite3
from contextlib import asynccontextmanager
from datetime import datetime, timezone
from pathlib import Path
from uuid import uuid4

from fastapi import FastAPI, File, HTTPException, Request, UploadFile
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import JSONResponse
from pydantic import BaseModel, Field

from config import configure_logging, ensure_directories, settings
from graph import graph
from rag import ingest_pdf


configure_logging()
logger = logging.getLogger(__name__)


def init_db() -> None:
    ensure_directories()
    with sqlite3.connect(settings.METADATA_DB_PATH) as connection:
        connection.execute(
            """
            CREATE TABLE IF NOT EXISTS uploads (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                file_name TEXT NOT NULL,
                stored_path TEXT NOT NULL,
                uploaded_at TEXT NOT NULL
            )
            """
        )
        connection.commit()


def save_upload_record(file_name: str, stored_path: str) -> None:
    uploaded_at = datetime.now(timezone.utc).isoformat()
    with sqlite3.connect(settings.METADATA_DB_PATH) as connection:
        connection.execute(
            "INSERT INTO uploads (file_name, stored_path, uploaded_at) VALUES (?, ?, ?)",
            (file_name, stored_path, uploaded_at),
        )
        connection.commit()


def list_upload_records() -> list[dict[str, str | int | bool]]:
    with sqlite3.connect(settings.METADATA_DB_PATH) as connection:
        connection.row_factory = sqlite3.Row
        rows = connection.execute(
            """
            SELECT id, file_name, stored_path, uploaded_at
            FROM uploads
            ORDER BY uploaded_at DESC, id DESC
            """
        ).fetchall()

    return [
        {
            "id": row["id"],
            "file_name": row["file_name"],
            "stored_path": row["stored_path"],
            "uploaded_at": row["uploaded_at"],
            "exists": Path(row["stored_path"]).exists(),
        }
        for row in rows
    ]


@asynccontextmanager
async def lifespan(_: FastAPI):
    init_db()
    logger.info("Application startup complete")
    yield
    logger.info("Application shutdown complete")


app = FastAPI(
    title=settings.APP_NAME,
    version=settings.APP_VERSION,
    lifespan=lifespan,
)

app.add_middleware(
    CORSMiddleware,
    allow_origins=[
        "http://127.0.0.1:5173",
        "http://localhost:5173",
        "null",
    ],
    allow_origin_regex=r"^https?://(localhost|127\.0\.0\.1)(:\d+)?$",
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

init_db()


class ChatRequest(BaseModel):
    query: str = Field(..., min_length=1, description="User question")


@app.middleware("http")
async def log_requests(request: Request, call_next):
    logger.info("Incoming request: %s %s", request.method, request.url.path)
    response = await call_next(request)
    logger.info(
        "Completed request: %s %s -> %s",
        request.method,
        request.url.path,
        response.status_code,
    )
    return response


@app.exception_handler(Exception)
async def unhandled_exception_handler(_: Request, exc: Exception):
    logger.error("Unhandled error: %s", exc, exc_info=True)
    return JSONResponse(
        status_code=500,
        content={"success": False, "error": "Internal server error."},
    )


@app.get("/health")
async def health_check():
    return {"success": True, "message": "Service is healthy."}


@app.get("/documents")
async def list_documents():
    try:
        records = list_upload_records()
        return {"success": True, "data": records}
    except Exception as exc:
        logger.error("Failed to load uploaded documents: %s", exc, exc_info=True)
        raise HTTPException(status_code=500, detail="Failed to load documents.") from exc


@app.post("/upload")
async def upload_pdf(file: UploadFile = File(...)):
    if not file.filename:
        raise HTTPException(status_code=400, detail="A file name is required.")

    if not file.filename.lower().endswith(".pdf"):
        raise HTTPException(status_code=400, detail="Only PDF files are supported.")

    safe_name = Path(file.filename).name
    unique_name = f"{uuid4().hex}_{safe_name}"
    destination = settings.DOCS_PATH / unique_name

    try:
        content = await file.read()
        if not content:
            raise HTTPException(status_code=400, detail="Uploaded file is empty.")

        destination.write_bytes(content)
        result = ingest_pdf(
            pdf_path=destination,
            chunk_size=settings.CHUNK_SIZE,
            overlap=settings.CHUNK_OVERLAP,
        )
        save_upload_record(file_name=safe_name, stored_path=str(destination))
        return {"success": True, "message": "PDF uploaded and indexed.", "data": result}
    except HTTPException:
        if destination.exists():
            destination.unlink(missing_ok=True)
        raise
    except ValueError as exc:
        if destination.exists():
            destination.unlink(missing_ok=True)
        logger.error("Upload validation failed: %s", exc)
        raise HTTPException(status_code=400, detail=str(exc)) from exc
    except Exception as exc:
        if destination.exists():
            destination.unlink(missing_ok=True)
        logger.error("Upload processing failed: %s", exc, exc_info=True)
        raise HTTPException(status_code=500, detail="Failed to process the uploaded PDF.") from exc
    finally:
        await file.close()


@app.post("/chat")
async def chat(request: ChatRequest):
    query = request.query.strip()
    if not query:
        raise HTTPException(status_code=400, detail="Query must not be empty.")

    try:
        state = graph.run(query=query)
        return {
            "success": True,
            "data": {
                "query": query,
                "answer": state.answer,
                "sources": [
                    {
                        "source_file": item["source_file"],
                        "chunk_id": item["chunk_id"],
                        "score": item["score"],
                    }
                    for item in state.retrieved_chunks
                ],
            },
        }
    except FileNotFoundError as exc:
        logger.error("Chat failed due to missing index: %s", exc)
        raise HTTPException(status_code=404, detail=str(exc)) from exc
    except Exception as exc:
        logger.error("Chat processing failed: %s", exc, exc_info=True)
        raise HTTPException(status_code=500, detail="Failed to process chat request.") from exc
