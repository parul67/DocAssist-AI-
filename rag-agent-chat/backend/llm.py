from __future__ import annotations

import logging
from typing import Dict, List

import requests

from config import settings


logger = logging.getLogger(__name__)


class LLMError(Exception):
    pass


def build_messages(context: str, query: str) -> List[Dict[str, str]]:
    system_prompt = (
        "You are a helpful knowledge base assistant. "
        "Answer based only on the provided context. "
        "If the answer is not present in the context, say you do not know."
    )
    user_prompt = f"Context:\n{context}\n\nQuestion:\n{query}"
    return [
        {"role": "system", "content": system_prompt},
        {"role": "user", "content": user_prompt},
    ]


def generate_answer(query: str, context: str) -> str:
    if not settings.MISTRAL_API_KEY:
        raise LLMError("MISTRAL_API_KEY is not configured.")

    url = "https://api.mistral.ai/v1/chat/completions"
    headers = {
        "Authorization": f"Bearer {settings.MISTRAL_API_KEY}",
        "Content-Type": "application/json",
    }
    payload = {
        "model": settings.MODEL_NAME,
        "messages": build_messages(context=context, query=query),
        "temperature": 0.2,
        "max_tokens": 512,
    }

    try:
        response = requests.post(
            url,
            headers=headers,
            json=payload,
            timeout=settings.REQUEST_TIMEOUT,
        )
        response.raise_for_status()
        data = response.json()
        answer = data["choices"][0]["message"]["content"].strip()
        logger.info("LLM response preview: %s", answer[:300])
        return answer
    except requests.RequestException as exc:
        logger.error("Mistral API request failed: %s", exc)
        raise LLMError("Failed to generate answer from the LLM.") from exc
    except (KeyError, IndexError, TypeError) as exc:
        logger.error("Unexpected Mistral API response: %s", exc)
        raise LLMError("Received an invalid response from the LLM.") from exc
