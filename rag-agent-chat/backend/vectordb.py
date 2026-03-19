from __future__ import annotations

import json
import logging
from pathlib import Path
from typing import Any, Dict, List

import faiss
import numpy as np

from config import settings


logger = logging.getLogger(__name__)


class VectorStore:
    def __init__(self, index_dir: Path) -> None:
        self.index_dir = index_dir
        self.index_path = self.index_dir / "faiss.index"
        self.metadata_path = self.index_dir / "faiss_metadata.json"
        self.index = None
        self.records: List[Dict[str, Any]] = []
        self.dimension: int | None = None
        self._load()

    def _load(self) -> None:
        self.index_dir.mkdir(parents=True, exist_ok=True)

        if self.index_path.exists():
            self.index = faiss.read_index(str(self.index_path))
            self.dimension = self.index.d
            logger.info("Loaded FAISS index with dimension %s", self.dimension)

        if self.metadata_path.exists():
            self.records = json.loads(self.metadata_path.read_text(encoding="utf-8"))
            logger.info("Loaded %s vector metadata records", len(self.records))

    def _init_index(self, dimension: int) -> None:
        self.dimension = dimension
        self.index = faiss.IndexFlatIP(dimension)
        logger.info("Initialized new FAISS index with dimension %s", dimension)

    def add_embeddings(self, embeddings: np.ndarray, metadata: List[Dict[str, Any]]) -> None:
        if embeddings.size == 0:
            raise ValueError("No embeddings were provided for indexing.")

        if len(embeddings) != len(metadata):
            raise ValueError("Embeddings and metadata length mismatch.")

        if self.index is None:
            self._init_index(int(embeddings.shape[1]))

        if embeddings.shape[1] != self.dimension:
            raise ValueError("Embedding dimension does not match the existing index.")

        self.index.add(embeddings)
        self.records.extend(metadata)
        self.save()
        logger.info("Indexed %s new chunks. Total chunks: %s", len(metadata), len(self.records))

    def search(self, query_vector: np.ndarray, top_k: int = 4) -> List[Dict[str, Any]]:
        if self.index is None or self.index.ntotal == 0:
            raise FileNotFoundError("Vector index is empty. Upload a PDF before querying.")

        query = np.asarray([query_vector], dtype="float32")
        scores, indices = self.index.search(query, top_k)

        results: List[Dict[str, Any]] = []
        for score, idx in zip(scores[0], indices[0]):
            if idx < 0 or idx >= len(self.records):
                continue
            record = dict(self.records[idx])
            record["score"] = float(score)
            results.append(record)

        logger.info("Retrieved %s chunks for query", len(results))
        return results

    def save(self) -> None:
        if self.index is not None:
            faiss.write_index(self.index, str(self.index_path))
        self.metadata_path.write_text(
            json.dumps(self.records, ensure_ascii=True, indent=2),
            encoding="utf-8",
        )


vector_store = VectorStore(settings.FAISS_INDEX_PATH)
