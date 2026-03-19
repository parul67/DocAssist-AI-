# RAG Agent Chat Backend

## Overview

This project provides a production-ready backend for an agentic Retrieval-Augmented Generation (RAG) chat platform. Users can upload PDF documents, automatically extract and chunk their contents, store embeddings in a local FAISS index, and query the indexed knowledge base through a FastAPI API backed by a Mistral-hosted language model.

## Features

- PDF upload and indexing pipeline
- Text extraction with `pypdf`
- Semantic chunk embeddings with `sentence-transformers/all-MiniLM-L6-v2`
- Local FAISS vector search with incremental updates
- Agentic modular flow for query classification, retrieval, and answer generation
- Mistral API integration for contextual answers
- SQLite metadata storage for uploaded files
- Structured logging to `backend/logs/app.log`
- Clean JSON responses and error handling

## Tech Stack

- Python 3.10+
- FastAPI
- FAISS
- Sentence Transformers
- PyPDF
- Requests
- SQLite
- Uvicorn

## Folder Structure

```text
rag-agent-chat/
├── backend/
│   ├── main.py
│   ├── graph.py
│   ├── rag.py
│   ├── embeddings.py
│   ├── vectordb.py
│   ├── pdf_loader.py
│   ├── llm.py
│   ├── config.py
│   ├── db/
│   │   └── metadata.db
│   └── logs/
│       └── app.log
├── data/
│   ├── docs/
│   └── index/
├── frontend/
│   ├── src/
│   ├── package.json
│   ├── tailwind.config.js
│   ├── postcss.config.js
│   └── vite.config.js
├── requirements.txt
├── .env
└── README.md
```

## Setup Instructions

1. Create and activate a Python 3.10+ virtual environment.
2. Install dependencies:

```bash
pip install -r requirements.txt
```

3. Update `.env` with a valid `MISTRAL_API_KEY`.

## How to Run

From the project root:

```bash
cd backend
uvicorn main:app --host 0.0.0.0 --port 8000 --reload
```

The API will be available at `http://127.0.0.1:8000`.

For the frontend:

```bash
cd frontend
cp .env.example .env
npm install
npm run dev
```

The frontend will be available at `http://127.0.0.1:5173`.

## API Endpoints

### `GET /health`

Returns backend health status.

### `POST /upload`

Uploads and indexes a PDF file.

- Form field: `file`
- Supported type: `.pdf`

Example:

```bash
curl -X POST "http://127.0.0.1:8000/upload" \
  -F "file=@sample.pdf"
```

### `POST /chat`

Answers a question using retrieved PDF context.

Request body:

```json
{
  "query": "What are the main conclusions of the document?"
}
```

Example:

```bash
curl -X POST "http://127.0.0.1:8000/chat" \
  -H "Content-Type: application/json" \
  -d "{\"query\":\"Summarize the uploaded document.\"}"
```

Frontend-style payload example:

```json
{
  "question": "What are the key points in the selected PDFs?",
  "session_id": "f9f2b10b-0c78-4a79-ae88-d9d3fe4108e0",
  "doc_ids": ["doc-1", "doc-2"]
}
```

### `GET /chat/stream`

Streams tokens progressively for a ChatGPT-style frontend.

Example:

```bash
curl -N "http://127.0.0.1:8000/chat/stream?question=Summarize%20the%20document&session_id=test-session"
```

### `GET /documents`

Returns uploaded document metadata for multi-document selection in the frontend.

## Agentic Flow

The backend uses a simple modular graph-like pipeline:

1. `classify_query`
2. `retrieve_context`
3. `generate_answer`
4. Fallback if no relevant context is available

## Logging

Application logs are written to `backend/logs/app.log` and include:

- Incoming API requests
- Retrieval flow details
- LLM response previews
- Error traces

## Future Improvements

- Per-document filtering and document IDs
- Better token-aware chunking
- Background ingestion jobs
- Authentication and multi-user support
- Re-ranking and citation formatting
- Full `/documents` and `/chat/stream` backend support to match the included React client

## Frontend Features

- ChatGPT-style split layout with session sidebar
- Tailwind dark mode with localStorage persistence
- Upload flow with progress bar
- Multi-document selection controls
- Streaming response renderer with stop control
- Expandable source viewer for retrieved chunks
- Copy and regenerate actions for assistant messages
