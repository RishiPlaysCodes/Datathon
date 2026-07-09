import chromadb
from chromadb.config import Settings
from app.core.config import settings

class VectorDBService:
    def __init__(self):
        self.client = chromadb.HttpClient(
            host=settings.CHROMA_HOST,
            port=settings.CHROMA_PORT,
            settings=Settings(allow_reset=True)
        )
        self.collection_name = "ksp_firs"
        self.collection = self.client.get_or_create_collection(name=self.collection_name)

    def add_fir(self, fir_id: int, text: str, metadata: dict):
        self.collection.add(
            documents=[text],
            metadatas=[metadata],
            ids=[str(fir_id)]
        )

    def query_firs(self, query_text: str, n_results: int = 5):
        return self.collection.query(
            query_texts=[query_text],
            n_results=n_results
        )

vector_db_service = VectorDBService()
