"""
rag_router.py
FastAPI router for /rag endpoints — document upload and index management.
"""
import os
import shutil
import tempfile
from fastapi import APIRouter, UploadFile, File, Form, HTTPException, Path
from pydantic import BaseModel

from app.rag.document_processor import load_and_split_pdf, load_and_split_text
from app.rag import faiss_store

router = APIRouter()


class TextIngestRequest(BaseModel):
    text: str
    source: str = "manual"
    userId: str = "default"


class IngestResponse(BaseModel):
    success: bool
    chunks_added: int
    message: str


@router.post("/rag/upload", response_model=IngestResponse)
async def upload_document(file: UploadFile = File(...), userId: str = Form("default")):
    """Accept a PDF file, chunk it, and add to FAISS index."""
    if not file.filename.lower().endswith(".pdf"):
        raise HTTPException(status_code=400, detail="Only PDF files are supported.")

    # Write to temp file
    pdf_bytes = await file.read()
    
    # We must save bytes to a temporary disk path for PyPDFLoader to read it
    with tempfile.NamedTemporaryFile(delete=False, suffix=".pdf") as tmp:
        tmp.write(pdf_bytes)
        tmp_path = tmp.name
    
    try:
        # 1. Load and split the PDF into document chunks
        chunks = load_and_split_pdf(tmp_path)
        
        # 2. Add these chunks to the user's specific FAISS index
        faiss_store.add_documents(chunks, userId)
        
        return IngestResponse(
            success=True,
            chunks_added=len(chunks),
            message=f"Document '{file.filename}' processed successfully ({len(chunks)} chunks)."
        )
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))
    finally:
        # Cleanup the temp file
        if os.path.exists(tmp_path):
            os.remove(tmp_path)


@router.delete("/rag/users/{user_id}/documents")
async def clear_knowledge_base(user_id: str = Path(...)):
    """
    Clears the entire FAISS index containing knowledge base documents for a specific user.
    """
    try:
        faiss_store.clear_index(user_id)
        return {"success": True, "message": "Knowledge base cleared."}
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


@router.post("/rag/ingest-text", response_model=IngestResponse)
async def ingest_text(request: TextIngestRequest):
    """Ingest raw text or URL content into the FAISS index."""
    try:
        chunks = load_and_split_text(request.text, metadata={"source": request.source})
        faiss_store.add_documents(chunks)
        return IngestResponse(
            success=True,
            chunks_added=len(chunks),
            message=f"Successfully indexed {len(chunks)} text chunks."
        )
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Ingestion failed: {str(e)}")


@router.get("/rag/status")
async def rag_status():
    """Check whether a FAISS index exists."""
    return {"index_exists": faiss_store.has_index()}
