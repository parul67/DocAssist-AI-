from __future__ import annotations

import logging
from datetime import datetime, timezone
from pathlib import Path
from typing import Dict, List

from embeddings import embed_query, embed_texts
from pdf_loader import chunk_text, extract_text_from_pdf
from vectordb import vector_store


logger = logging.getLogger(__name__)


def ingest_pdf(pdf_path: Path, chunk_size: int, overlap: int) -> Dict[str, int | str]:
    logger.info("Extracting text from %s", pdf_path.name)
    text = extract_text_from_pdf(pdf_path)
    if not text:
        raise ValueError("The uploaded PDF does not contain extractable text.")

    chunks = chunk_text(text=text, chunk_size=chunk_size, overlap=overlap)
    if not chunks:
        raise ValueError("No text chunks were generated from the uploaded PDF.")

    embeddings = embed_texts(chunks)
    ingested_at = datetime.now(timezone.utc).isoformat()
    metadata: List[Dict[str, str | int]] = [
        {
            "source_file": pdf_path.name,
            "chunk_id": index,
            "text": chunk,
            "ingested_at": ingested_at,
        }
        for index, chunk in enumerate(chunks)
    ]
    vector_store.add_embeddings(embeddings, metadata)

    logger.info("Ingested %s chunks from %s", len(chunks), pdf_path.name)
    return {"filename": pdf_path.name, "chunks_indexed": len(chunks)}


def retrieve_context(query: str, top_k: int) -> List[Dict[str, str | float | int]]:
    query_vector = embed_query(query)
    return vector_store.search(query_vector=query_vector, top_k=top_k)


def build_context(results: List[Dict[str, str | float | int]], max_chars: int) -> str:
    context_parts: List[str] = []
    current_size = 0

    for item in results:
        chunk_text_value = str(item["text"]).strip()
        if not chunk_text_value:
            continue
        segment = f"Source: {item['source_file']}\nContent: {chunk_text_value}"
        if current_size + len(segment) > max_chars:
            break
        context_parts.append(segment)
        current_size += len(segment)

    return "\n\n".join(context_parts)
