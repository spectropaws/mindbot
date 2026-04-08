"""
faiss_store.py
Manages the FAISS vector store — adding documents and querying similar chunks.
Uses OpenRouter-compatible embeddings (OpenAI-compatible API).
"""
import os
from pathlib import Path
from typing import List, Optional
from langchain_core.documents import Document
from langchain_huggingface import HuggingFaceEmbeddings
from langchain_community.vectorstores import FAISS
from app.core.config_loader import get


def _get_embeddings() -> HuggingFaceEmbeddings:
    # Use a lightweight robust local model, completely free
    return HuggingFaceEmbeddings(model_name="all-MiniLM-L6-v2")


def get_store_path(user_id: str = "default") -> str:
    base_path = get("rag.index_path", "./data/faiss_index")
    # Clean user_id to prevent injection issues, though it should be a UUID
    safe_uid = "".join(c for c in user_id if c.isalnum() or c in ("-", "_"))
    return str(Path(base_path) / safe_uid)


def add_documents(documents: List[Document], user_id: str = "default") -> None:
    """Add chunked documents to FAISS, creating or updating the index for the user."""
    embeddings = _get_embeddings()
    store_path = get_store_path(user_id)
    
    if Path(store_path).exists():
        store = FAISS.load_local(store_path, embeddings, allow_dangerous_deserialization=True)
        store.add_documents(documents)
    else:
        store = FAISS.from_documents(documents, embeddings)
    
    store.save_local(store_path)


def query(query_text: str, user_id: str = "default", top_k: int = None) -> List[Document]:
    """Retrieve the most relevant document chunks for a query from a specific user's index."""
    store_path = get_store_path(user_id)
    if not Path(store_path).exists():
        return []
    
    embeddings = _get_embeddings()
    k = top_k or get("rag.top_k", 4)
    store = FAISS.load_local(store_path, embeddings, allow_dangerous_deserialization=True)
    return store.similarity_search(query_text, k=k)


def has_index(user_id: str = "default") -> bool:
    """Check if a FAISS index exists for the user."""
    return Path(get_store_path(user_id)).exists()
