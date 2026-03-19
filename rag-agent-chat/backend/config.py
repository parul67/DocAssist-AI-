from __future__ import annotations

import logging
import os
from pathlib import Path

from dotenv import load_dotenv


BASE_DIR = Path(__file__).resolve().parent.parent
BACKEND_DIR = BASE_DIR / "backend"
DB_DIR = BACKEND_DIR / "db"
LOG_DIR = BACKEND_DIR / "logs"
DATA_DIR = BASE_DIR / "data"

load_dotenv(BASE_DIR / ".env")


class Settings:
    APP_NAME = "RAG Agent Chat Backend"
    APP_VERSION = "1.0.0"

    MISTRAL_API_KEY = os.getenv("MISTRAL_API_KEY", "")
    MODEL_NAME = os.getenv("MODEL_NAME", "mistral-medium-latest")
    EMBEDDING_MODEL = os.getenv(
        "EMBEDDING_MODEL", "sentence-transformers/all-MiniLM-L6-v2"
    )
    _faiss_index_env = os.getenv("FAISS_INDEX_PATH", "./data/index")
    _docs_path_env = os.getenv("DOCS_PATH", "./data/docs")

    FAISS_INDEX_PATH = (
        Path(_faiss_index_env)
        if Path(_faiss_index_env).is_absolute()
        else (BASE_DIR / _faiss_index_env).resolve()
    )
    DOCS_PATH = (
        Path(_docs_path_env)
        if Path(_docs_path_env).is_absolute()
        else (BASE_DIR / _docs_path_env).resolve()
    )
    METADATA_DB_PATH = DB_DIR / "metadata.db"
    LOG_FILE_PATH = LOG_DIR / "app.log"

    CHUNK_SIZE = 600
    CHUNK_OVERLAP = 100
    RETRIEVAL_K = 4
    REQUEST_TIMEOUT = 60
    MAX_CONTEXT_CHARS = 8000


settings = Settings()


def ensure_directories() -> None:
    DB_DIR.mkdir(parents=True, exist_ok=True)
    LOG_DIR.mkdir(parents=True, exist_ok=True)
    settings.DOCS_PATH.mkdir(parents=True, exist_ok=True)
    settings.FAISS_INDEX_PATH.mkdir(parents=True, exist_ok=True)
    settings.LOG_FILE_PATH.touch(exist_ok=True)
    settings.METADATA_DB_PATH.touch(exist_ok=True)


def configure_logging() -> None:
    ensure_directories()

    logging.basicConfig(
        level=logging.INFO,
        format="%(asctime)s | %(levelname)s | %(name)s | %(message)s",
        handlers=[
            logging.FileHandler(settings.LOG_FILE_PATH, encoding="utf-8"),
            logging.StreamHandler(),
        ],
        force=True,
    )
