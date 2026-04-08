"""
web_search.py
DuckDuckGo web search tool for the MindBot agent.
Uses the light_model for query reformulation to minimise token usage.
"""
from langchain_core.tools import tool
from ddgs import DDGS
from app.core.config_loader import get


@tool
def web_search(query: str) -> str:
    """
    Search the web using DuckDuckGo. Use this for current events,
    facts, or any information that may not be in the training data.
    Args:
        query: The search query string.
    Returns:
        A formatted string of search results.
    """
    max_results = get("tools.web_search.max_results", 5)
    try:
        with DDGS() as ddgs:
            results = list(ddgs.text(query, max_results=max_results))
        if not results:
            return "No search results found for the given query."
        formatted = []
        for i, r in enumerate(results, 1):
            formatted.append(
                f"[{i}] {r.get('title', 'No title')}\n"
                f"URL: {r.get('href', 'N/A')}\n"
                f"{r.get('body', 'No snippet available.')}"
            )
        return "\n\n".join(formatted)
    except Exception as e:
        return f"Web search failed: {str(e)}"
