from __future__ import annotations

import logging
from functools import lru_cache
from typing import Iterable

import numpy as np
from sentence_transformers import SentenceTransformer

from config import settings


logger = logging.getLogger(__name__)


@lru_cache(maxsize=1)
def get_embedding_model() -> SentenceTransformer:
    logger.info("Loading embedding model: %s", settings.EMBEDDING_MODEL)
    return SentenceTransformer(settings.EMBEDDING_MODEL)


def embed_texts(texts: Iterable[str]) -> np.ndarray:
    items = list(texts)
    if not items:
        return np.empty((0, 0), dtype="float32")

    model = get_embedding_model()
    embeddings = model.encode(
        items,
        convert_to_numpy=True,
        normalize_embeddings=True,
        show_progress_bar=False,
    )
    return embeddings.astype("float32")


def embed_query(query: str) -> np.ndarray:
    vector = embed_texts([query])
    return vector[0]
