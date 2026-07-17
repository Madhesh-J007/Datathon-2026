"""LaBSE embedding generation for explainable modus-operandi retrieval."""

from functools import lru_cache

from config import settings


@lru_cache(maxsize=1)
def get_embedding_model():
    """Load the transformer once per AI-service worker, not per request."""
    from sentence_transformers import SentenceTransformer

    return SentenceTransformer(settings.EMBEDDING_MODEL_NAME)


def embed_texts(texts: list[str]) -> list[list[float]]:
    """Return L2-normalised LaBSE vectors compatible with pgvector(768)."""
    cleaned = [text.strip() for text in texts]
    if any(not text for text in cleaned):
        raise ValueError("Each embedding input must contain non-empty text.")

    vectors = get_embedding_model().encode(
        cleaned,
        batch_size=settings.EMBEDDING_BATCH_SIZE,
        normalize_embeddings=True,
        show_progress_bar=False,
    )
    if vectors.shape[1] != settings.EMBEDDING_DIMENSIONS:
        raise RuntimeError(
            f"Embedding model returned {vectors.shape[1]} dimensions; "
            f"expected {settings.EMBEDDING_DIMENSIONS}."
        )
    return vectors.tolist()
