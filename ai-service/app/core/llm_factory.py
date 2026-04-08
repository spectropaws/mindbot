"""
llm_factory.py
Instantiates LangChain LLM instances pointing to OpenRouter.
Uses config.yaml for model selection and parameters.
"""
import os
from langchain_openai import ChatOpenAI
from app.core.config_loader import get


def _create_llm(model: str, temperature: float = None, max_tokens: int = None) -> ChatOpenAI:
    api_key = os.getenv("OPENROUTER_API_KEY")
    if not api_key:
        raise EnvironmentError("OPENROUTER_API_KEY is not set in environment variables.")
    return ChatOpenAI(
        model=model,
        openai_api_key=api_key,
        openai_api_base=get("llm.base_url", "https://openrouter.ai/api/v1"),
        temperature=temperature if temperature is not None else get("llm.temperature", 0.7),
        max_tokens=max_tokens if max_tokens is not None else get("llm.max_tokens", 2048),
        default_headers={
            "HTTP-Referer": "https://mindbot.local",
            "X-Title": "MindBot",
        },
    )


def get_default_llm() -> ChatOpenAI:
    return _create_llm(get("llm.default_model"))


def get_light_llm() -> ChatOpenAI:
    """For trivial / routing tasks — uses the lighter, faster model."""
    return _create_llm(get("llm.light_model"), temperature=0.1)


def get_heavy_llm() -> ChatOpenAI:
    """For complex multi-step reasoning."""
    return _create_llm(get("llm.heavy_model"))


def get_vision_llm() -> ChatOpenAI:
    """For vision-capable tasks (image analysis, OCR)."""
    return _create_llm(get("llm.vision_model"))
