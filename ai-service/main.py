"""
main.py — MindBot AI Service entry point.
Loads .env, mounts API routers, and starts the FastAPI app.
"""
import os
from dotenv import load_dotenv
from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

load_dotenv()

from app.api.chat_router import router as chat_router
from app.api.rag_router import router as rag_router
from app.api.voice_router import router as voice_router

app = FastAPI(
    title="MindBot AI Service",
    description="LangGraph-powered conversational agent with RAG, tools, and OpenRouter LLMs.",
    version="1.0.0",
)

# CORS — only allow the Spring Boot gateway (localhost:8080) internally
app.add_middleware(
    CORSMiddleware,
    allow_origins=["http://localhost:8080"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

app.include_router(chat_router)
app.include_router(rag_router)
app.include_router(voice_router)


@app.get("/health")
async def health():
    return {"status": "ok", "service": "MindBot AI Service"}


if __name__ == "__main__":
    import uvicorn
    uvicorn.run("main:app", host="0.0.0.0", port=8000, reload=True)
