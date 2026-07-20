"""
RAG (Retrieval-Augmented Generation) Pipeline for PRAHARI.

Architecture:
  User Query → Embed query → FAISS similarity search → Retrieve top-K FIRs → 
  Format context → Generate grounded response

Uses: sentence-transformers (all-MiniLM-L6-v2) + FAISS (CPU)
Fallback: TF-IDF if sentence-transformers unavailable
"""
import logging
from typing import List, Dict, Any, Optional

# NOTE: numpy is imported lazily inside functions that need it (FAISS path only),
# so this module imports cleanly even when heavy RAG deps are not installed.
# This guarantees the app always starts regardless of which extras are present.

logger = logging.getLogger("prahari")

# --- Embedding Model Selection ---
# Try sentence-transformers first (best quality), fallback to TF-IDF
_EMBED_MODEL = None
_EMBED_TYPE = "none"
_FAISS_INDEX = None
_FIR_STORE: List[Dict[str, Any]] = []  # Stored FIR metadata parallel to index

try:
    from sentence_transformers import SentenceTransformer
    _EMBED_MODEL = SentenceTransformer("all-MiniLM-L6-v2")
    _EMBED_TYPE = "sentence_transformer"
    logger.info("RAG: Using sentence-transformers (all-MiniLM-L6-v2)")
except ImportError:
    try:
        from sklearn.feature_extraction.text import TfidfVectorizer
        from sklearn.metrics.pairwise import cosine_similarity as _cosine_sim
        _EMBED_TYPE = "tfidf"
        logger.info("RAG: Using TF-IDF fallback (scikit-learn)")
    except ImportError:
        logger.warning("RAG: No embedding library available. Semantic search disabled.")

# TF-IDF state
_TFIDF_VECTORIZER = None
_TFIDF_MATRIX = None


def build_fir_text(fir: Dict[str, Any]) -> str:
    """Create a rich text representation of an FIR for embedding."""
    parts = [
        fir.get("crime_type", ""),
        fir.get("description", ""),
        fir.get("modus_operandi", "") or "",
        fir.get("location_name", "") or "",
        fir.get("district", "") or "",
    ]
    return " ".join(p for p in parts if p).strip()


def index_firs(firs: List[Dict[str, Any]]) -> int:
    """
    Build the vector index from a list of FIR dicts.
    Call this on startup after DB is seeded.
    Returns number of indexed documents.
    """
    global _FAISS_INDEX, _FIR_STORE, _TFIDF_VECTORIZER, _TFIDF_MATRIX, _EMBED_TYPE

    if not firs:
        return 0

    _FIR_STORE = firs
    texts = [build_fir_text(f) for f in firs]

    if _EMBED_TYPE == "sentence_transformer":
        try:
            import faiss
            import numpy as np
            embeddings = _EMBED_MODEL.encode(texts, show_progress_bar=False, normalize_embeddings=True)
            dim = embeddings.shape[1]
            _FAISS_INDEX = faiss.IndexFlatIP(dim)  # Inner product = cosine for normalized vectors
            _FAISS_INDEX.add(np.array(embeddings, dtype=np.float32))
            logger.info(f"RAG: FAISS index built with {len(firs)} FIRs (dim={dim})")
            return len(firs)
        except Exception as e:
            # faiss missing or embedding failed - fall back to TF-IDF
            logger.warning(f"RAG: FAISS/ST path failed ({e}); falling back to TF-IDF")
            _EMBED_TYPE = "tfidf"

    if _EMBED_TYPE == "tfidf":
        try:
            from sklearn.feature_extraction.text import TfidfVectorizer
            _TFIDF_VECTORIZER = TfidfVectorizer(max_features=5000, stop_words="english")
            _TFIDF_MATRIX = _TFIDF_VECTORIZER.fit_transform(texts)
            logger.info(f"RAG: TF-IDF index built with {len(firs)} FIRs")
        except Exception as e:
            logger.warning(f"RAG: TF-IDF unavailable ({e}); semantic search disabled")
            _EMBED_TYPE = "none"

    return len(firs)


def semantic_search(query: str, top_k: int = 5) -> List[Dict[str, Any]]:
    """
    Search the FIR index semantically.
    Returns top-K most similar FIRs with similarity scores.
    """
    if not _FIR_STORE:
        return []

    if _EMBED_TYPE == "sentence_transformer" and _FAISS_INDEX is not None:
        import numpy as np
        query_vec = _EMBED_MODEL.encode([query], normalize_embeddings=True)
        scores, indices = _FAISS_INDEX.search(np.array(query_vec, dtype=np.float32), top_k)
        results = []
        for score, idx in zip(scores[0], indices[0]):
            if idx < len(_FIR_STORE) and idx >= 0:
                fir = _FIR_STORE[idx].copy()
                fir["similarity_score"] = round(float(score) * 100, 1)
                results.append(fir)
        return results

    elif _EMBED_TYPE == "tfidf" and _TFIDF_VECTORIZER is not None:
        from sklearn.metrics.pairwise import cosine_similarity
        query_vec = _TFIDF_VECTORIZER.transform([query])
        similarities = cosine_similarity(query_vec, _TFIDF_MATRIX).flatten()
        top_indices = similarities.argsort()[-top_k:][::-1]
        results = []
        for idx in top_indices:
            if similarities[idx] > 0.05:  # Minimum threshold
                fir = _FIR_STORE[idx].copy()
                fir["similarity_score"] = round(float(similarities[idx]) * 100, 1)
                results.append(fir)
        return results

    return []


def rag_query(query: str, top_k: int = 5) -> Dict[str, Any]:
    """
    Full RAG pipeline: retrieve + format response.
    Returns structured response with retrieved context and grounded answer.
    """
    retrieved = semantic_search(query, top_k=top_k)

    if not retrieved:
        return {
            "answer": "No relevant cases found in the database for your query.",
            "retrieved_count": 0,
            "sources": [],
            "context_used": [],
        }

    # Build grounded response from retrieved docs
    sources = []
    context_parts = []
    for i, fir in enumerate(retrieved):
        sources.append(f"FIR #{fir.get('fir_number', 'N/A')}")
        context_parts.append(
            f"{i+1}. [{fir.get('fir_number')}] {fir.get('crime_type', '').title()} at "
            f"{fir.get('location_name', 'unknown')} - {fir.get('description', '')[:100]}"
        )

    # Generate grounded answer
    answer = f"Based on semantic search of {len(_FIR_STORE)} FIRs, found **{len(retrieved)} relevant cases**:\n\n"
    for fir in retrieved:
        answer += (
            f"- **{fir.get('fir_number')}** ({fir.get('crime_type')}) - "
            f"{fir.get('location_name', 'N/A')} | "
            f"Similarity: {fir.get('similarity_score', 0)}%\n"
        )

    answer += f"\n**Retrieval method:** {'FAISS + Sentence-BERT' if _EMBED_TYPE == 'sentence_transformer' else 'TF-IDF Cosine Similarity'}"
    answer += f"\n**Index size:** {len(_FIR_STORE)} documents"

    return {
        "answer": answer,
        "retrieved_count": len(retrieved),
        "sources": sources,
        "context_used": context_parts,
        "embedding_model": _EMBED_TYPE,
        "index_size": len(_FIR_STORE),
    }


def get_rag_status() -> Dict[str, Any]:
    """Get current RAG pipeline status."""
    return {
        "embedding_type": _EMBED_TYPE,
        "index_size": len(_FIR_STORE),
        "indexed": len(_FIR_STORE) > 0,
        "model": "all-MiniLM-L6-v2" if _EMBED_TYPE == "sentence_transformer" else "TF-IDF (sklearn)",
        "backend": "FAISS" if _EMBED_TYPE == "sentence_transformer" else "sklearn cosine_similarity",
    }
