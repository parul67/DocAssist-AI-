from langchain_community.document_loaders import PyPDFLoader
from langchain_text_splitters import RecursiveCharacterTextSplitter
from langchain_community.vectorstores import FAISS
from langchain_community.embeddings import HuggingFaceEmbeddings
from pathlib import Path
from datetime import datetime, timezone
import hashlib
import json
import threading

from ollama_llm import generate_answer

BASE_DIR = Path(__file__).resolve().parent
INDEX_DIR = BASE_DIR / "faiss_index"
METADATA_PATH = INDEX_DIR / "metadata.json"
INDEX_FAISS_PATH = INDEX_DIR / "index.faiss"

_EMBEDDINGS = None
_VECTORSTORE = None
_VECTORSTORE_MTIME = None
_CACHE_LOCK = threading.Lock()


def _file_sha256(file_path):
    digest = hashlib.sha256()
    with open(file_path, "rb") as file_obj:
        while True:
            chunk = file_obj.read(1024 * 1024)
            if not chunk:
                break
            digest.update(chunk)
    return digest.hexdigest()


def _load_metadata():
    if not METADATA_PATH.exists():
        return {}
    with open(METADATA_PATH, "r", encoding="utf-8") as file_obj:
        return json.load(file_obj)


def _save_metadata(payload):
    INDEX_DIR.mkdir(parents=True, exist_ok=True)
    with open(METADATA_PATH, "w", encoding="utf-8") as file_obj:
        json.dump(payload, file_obj, indent=2)


def _get_embeddings():
    global _EMBEDDINGS
    if _EMBEDDINGS is None:
        _EMBEDDINGS = HuggingFaceEmbeddings(
            model_name="sentence-transformers/all-MiniLM-L6-v2"
        )
    return _EMBEDDINGS


def _cache_vectorstore(vectorstore):
    global _VECTORSTORE, _VECTORSTORE_MTIME
    with _CACHE_LOCK:
        _VECTORSTORE = vectorstore
        _VECTORSTORE_MTIME = INDEX_FAISS_PATH.stat().st_mtime if INDEX_FAISS_PATH.exists() else None


def _get_vectorstore():
    if not INDEX_DIR.exists() or not INDEX_FAISS_PATH.exists():
        raise FileNotFoundError("No indexed PDF found. Upload a PDF first.")

    current_mtime = INDEX_FAISS_PATH.stat().st_mtime
    with _CACHE_LOCK:
        if _VECTORSTORE is not None and _VECTORSTORE_MTIME == current_mtime:
            return _VECTORSTORE

    vectorstore = FAISS.load_local(
        str(INDEX_DIR),
        _get_embeddings(),
        allow_dangerous_deserialization=True
    )
    _cache_vectorstore(vectorstore)
    return vectorstore


def process_pdf(file_path):
    source_path = Path(file_path)
    source_hash = _file_sha256(source_path)
    previous_metadata = _load_metadata()
    if previous_metadata.get("file_hash") == source_hash and INDEX_FAISS_PATH.exists():
        return {
            "status": "skipped",
            "reason": "same_file_hash",
            "filename": source_path.name,
            "file_hash": source_hash,
            "indexed_at": previous_metadata.get("indexed_at")
        }

    print("Loading PDF...")

    loader = PyPDFLoader(file_path)
    documents = loader.load()

    text_splitter = RecursiveCharacterTextSplitter(
        chunk_size=500,
        chunk_overlap=50
    )

    texts = text_splitter.split_documents(documents)

    print("Creating embeddings...")

    embeddings = _get_embeddings()

    vectorstore = FAISS.from_documents(texts, embeddings)

    vectorstore.save_local(str(INDEX_DIR))
    _cache_vectorstore(vectorstore)
    metadata = {
        "status": "indexed",
        "filename": source_path.name,
        "file_hash": source_hash,
        "chunks": len(texts),
        "pages": len(documents),
        "indexed_at": datetime.now(timezone.utc).isoformat()
    }
    _save_metadata(metadata)

    print("PDF processed successfully")
    return metadata


def ask_question(question):
    vectorstore = _get_vectorstore()

    # retrieve relevant chunks
    docs = vectorstore.similarity_search(question, k=3)

    # combine retrieved chunks
    context = "\n\n".join([doc.page_content for doc in docs])

    # send context + question to LLM
    answer = generate_answer(context, question)

    return answer


if __name__ == "__main__":

    process_pdf("uploads/AI Engineer Intern Assignment 1.pdf")

    question = "What is smart irrigation?"

    response = ask_question(question)

    print("\nAI Answer:\n")
    print(response)
