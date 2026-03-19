from __future__ import annotations

import logging
from dataclasses import dataclass, field
from typing import Dict, List

from config import settings
from llm import LLMError, generate_answer
from rag import build_context, retrieve_context


logger = logging.getLogger(__name__)


@dataclass
class GraphState:
    query: str
    query_type: str = "knowledge_lookup"
    retrieved_chunks: List[Dict] = field(default_factory=list)
    context: str = ""
    answer: str = ""


class AgenticRAGGraph:
    def run(self, query: str) -> GraphState:
        state = GraphState(query=query.strip())
        self.classify_query(state)
        self.retrieve_context(state)
        self.generate_response(state)
        return state

    def classify_query(self, state: GraphState) -> None:
        greetings = {"hi", "hello", "hey"}
        state.query_type = "greeting" if state.query.lower() in greetings else "knowledge_lookup"
        logger.info("Query classified as %s", state.query_type)

    def retrieve_context(self, state: GraphState) -> None:
        state.retrieved_chunks = retrieve_context(
            query=state.query,
            top_k=settings.RETRIEVAL_K,
        )
        state.context = build_context(
            results=state.retrieved_chunks,
            max_chars=settings.MAX_CONTEXT_CHARS,
        )
        logger.info("Context length after retrieval: %s", len(state.context))

    def generate_response(self, state: GraphState) -> None:
        if state.query_type == "greeting":
            state.answer = "Hello! Upload a PDF and ask a question about its contents."
            return

        if not state.context:
            state.answer = "I do not know based on the indexed documents."
            return

        try:
            state.answer = generate_answer(query=state.query, context=state.context)
        except LLMError:
            state.answer = "I could not generate an answer right now because the language model is unavailable."


graph = AgenticRAGGraph()
