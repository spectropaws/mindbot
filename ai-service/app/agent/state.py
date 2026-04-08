"""
state.py
Defines the LangGraph agent state schema.
"""
from typing import Annotated, List, Optional
from langchain_core.messages import BaseMessage
from langgraph.graph.message import add_messages
from pydantic import BaseModel
import operator


class AgentState(BaseModel):
    """
    The central state object threaded through every node in the LangGraph.
    """
    # The full conversation history - add_messages ensures proper append behaviour
    messages: Annotated[List[BaseMessage], add_messages]

    # Optional RAG context injected before the agent call
    rag_context: Optional[str] = None

    # Name of the tool currently being used (for streaming status to frontend)
    active_tool: Optional[str] = None

    # The final answer once the agent decides to stop
    final_answer: Optional[str] = None

    class Config:
        arbitrary_types_allowed = True
