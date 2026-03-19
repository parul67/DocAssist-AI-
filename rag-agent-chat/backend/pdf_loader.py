from __future__ import annotations

import logging
from pathlib import Path
from typing import List

from pypdf import PdfReader


logger = logging.getLogger(__name__)


def extract_text_from_pdf(pdf_path: Path) -> str:
    reader = PdfReader(str(pdf_path))
    pages = []

    for page_number, page in enumerate(reader.pages, start=1):
        text = page.extract_text() or ""
        if text.strip():
            pages.append(text)
        else:
            logger.info("Skipping empty text on page %s for %s", page_number, pdf_path.name)

    return "\n".join(pages).strip()


def chunk_text(text: str, chunk_size: int = 600, overlap: int = 100) -> List[str]:
    if not text.strip():
        return []

    words = text.split()
    if len(words) <= chunk_size:
        return [" ".join(words)]

    chunks: List[str] = []
    start = 0
    step = max(chunk_size - overlap, 1)

    while start < len(words):
        end = start + chunk_size
        chunk = " ".join(words[start:end]).strip()
        if chunk:
            chunks.append(chunk)
        if end >= len(words):
            break
        start += step

    return chunks
