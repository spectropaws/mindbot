"""
document_processor.py
Handles PDF ingestion, text splitting, and embedding generation.
"""
from pathlib import Path
from typing import List
from langchain_core.documents import Document
from langchain_community.document_loaders import PyPDFLoader
from langchain_text_splitters import RecursiveCharacterTextSplitter
from app.core.config_loader import get


def load_and_split_pdf(file_path: str) -> List[Document]:
    """
    Load a PDF file and split it into overlapping chunks.
    """
    loader = PyPDFLoader(file_path)
    pages = loader.load()

    splitter = RecursiveCharacterTextSplitter(
        chunk_size=get("rag.chunk_size", 1000),
        chunk_overlap=get("rag.chunk_overlap", 200),
        length_function=len,
    )
    chunks = splitter.split_documents(pages)
    return chunks


def load_and_split_text(text: str, metadata: dict = None) -> List[Document]:
    """
    Split raw text into chunks (for URL or pasted text ingestion).
    """
    splitter = RecursiveCharacterTextSplitter(
        chunk_size=get("rag.chunk_size", 1000),
        chunk_overlap=get("rag.chunk_overlap", 200),
    )
    doc = Document(page_content=text, metadata=metadata or {})
    return splitter.split_documents([doc])
