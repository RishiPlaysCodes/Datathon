from sqlmodel import Session, create_engine, select
from app.models.crime import FIR
from app.services.vector_db import vector_db_service
from app.core.config import settings

engine = create_engine(settings.DATABASE_URL)

def index_firs():
    with Session(engine) as session:
        firs = session.exec(select(FIR)).all()
        print(f"Indexing {len(firs)} FIRs into ChromaDB...")
        
        for fir in firs:
            # Create a rich text representation for semantic search
            text = f"FIR Number: {fir.fir_number}\n"
            text += f"Location: {fir.location}\n"
            text += f"Description: {fir.description}\n"
            text += f"Incident Date: {fir.incident_date}\n"
            
            metadata = {
                "fir_number": fir.fir_number,
                "status": fir.status,
                "category_id": fir.category_id or 0
            }
            
            vector_db_service.add_fir(fir.id, text, metadata)
            
        print("Indexing completed successfully.")

if __name__ == "__main__":
    index_firs()
