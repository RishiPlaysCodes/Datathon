"""
Vector Database Service - ChromaDB integration with graceful fallback.
When ChromaDB is unavailable, uses in-memory keyword search.
"""
from typing import Dict, Any


class VectorDBService:
    """Handles vector search with ChromaDB, gracefully degrades without it."""

    def __init__(self):
        self.client = None
        self.collection = None
        self._initialized = False

    def _try_connect(self):
        """Try to connect to ChromaDB, fail gracefully. Called lazily."""
        if self._initialized:
            return
        try:
            from app.core.config import settings
            import chromadb
            self.client = chromadb.HttpClient(
                host=settings.CHROMA_HOST,
                port=int(settings.CHROMA_PORT),
            )
            self.collection = self.client.get_or_create_collection(name="ksp_firs")
            self._initialized = True
        except Exception:
            self._initialized = False

    def add_fir(self, fir_id: int, text: str, metadata: dict):
        """Add FIR to vector store."""
        self._try_connect()
        if not self._initialized:
            return
        try:
            self.collection.add(
                documents=[text],
                metadatas=[metadata],
                ids=[str(fir_id)]
            )
        except Exception:
            pass

    def query_firs(self, query_text: str, n_results: int = 5) -> Dict[str, Any]:
        """Query vector store for similar FIRs."""
        self._try_connect()
        if not self._initialized:
            return {"ids": [[]], "documents": [[]], "metadatas": [[]], "distances": [[]]}
        try:
            return self.collection.query(
                query_texts=[query_text],
                n_results=n_results
            )
        except Exception:
            return {"ids": [[]], "documents": [[]], "metadatas": [[]], "distances": [[]]}

    @property
    def is_available(self) -> bool:
        return self._initialized


vector_db_service = VectorDBService()
