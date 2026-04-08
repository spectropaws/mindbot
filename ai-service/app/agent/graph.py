"""
graph.py
The core LangGraph agent — a ReAct-style agent with tool use.
Architecture:
  START → agent_node → [tool_node | END]
              ↑____________|
"""
from typing import Literal
from langchain_core.messages import SystemMessage, AIMessage, ToolMessage, HumanMessage
from langgraph.graph import StateGraph, START, END
from langgraph.prebuilt import ToolNode

from app.agent.state import AgentState
from app.core.config_loader import get
from app.core.llm_factory import get_default_llm, get_vision_llm
from app.tools.web_search import web_search
from app.tools.calculator import calculator
from app.tools.python_repl import python_repl
from app.tools.calendar_api import calendar_get_events, calendar_add_event
from app import rag as rag_module


# Assemble tool list from enabled config
TOOLS = []
if get("tools.web_search.enabled", True):
    TOOLS.append(web_search)
if get("tools.calculator.enabled", True):
    TOOLS.append(calculator)
if get("tools.python_repl.enabled", True):
    TOOLS.append(python_repl)
if get("tools.calendar.enabled", True):
    TOOLS.extend([calendar_get_events, calendar_add_event])


def _build_graph(llm, bind_tools=True, use_system_role=True):
    """Compile and return a LangGraph agent graph using the given LLM."""
    llm_with_tools = llm.bind_tools(TOOLS) if bind_tools else llm

    system_prompt = get("agent.system_prompt", "You are MindBot, a helpful AI assistant.")

    def agent_node(state: AgentState) -> dict:
        messages = list(state.messages)

        # Inject RAG context
        if state.rag_context:
            rag_msg = f"Use the following document context to help answer the user's question:\n\n{state.rag_context}"
            if use_system_role:
                messages = [SystemMessage(content=rag_msg)] + messages
            else:
                # Append RAG to system prompt instead
                nonlocal system_prompt
                system_prompt += "\n" + rag_msg

        if use_system_role:
            full_messages = [SystemMessage(content=system_prompt)] + messages
        else:
            # Avoid using SystemMessage (which causes 'Developer instruction is not enabled' on some OpenRouter vision endpoints)
            full_messages = list(messages)
            if full_messages:
                first_msg = full_messages[0]
                if isinstance(first_msg, HumanMessage):
                    if isinstance(first_msg.content, list):
                        # Multimodal list format -> find text block
                        for block in first_msg.content:
                            if block.get("type") == "text":
                                block["text"] = f"[System Instruction: {system_prompt}]\n\n" + block.get("text", "")
                                break
                    else:
                        first_msg.content = f"[System Instruction: {system_prompt}]\n\n" + str(first_msg.content)

        response = llm_with_tools.invoke(full_messages)
        return {"messages": [response], "active_tool": None}

    def should_continue(state: AgentState) -> Literal["tools", "__end__"]:
        """Route to tool_node if the LLM emitted tool calls, else stop."""
        last_message = state.messages[-1]
        if isinstance(last_message, AIMessage) and getattr(last_message, "tool_calls", None):
            return "tools"
        return "__end__"

    # Build graph
    graph = StateGraph(AgentState)
    tool_node = ToolNode(TOOLS)

    graph.add_node("agent", agent_node)
    graph.add_node("tools", tool_node)

    graph.add_edge(START, "agent")
    graph.add_conditional_edges("agent", should_continue)
    graph.add_edge("tools", "agent")

    return graph.compile()


# Singleton compiled graphs
_graph = None
_vision_graph = None


def get_graph():
    global _graph
    if _graph is None:
        _graph = _build_graph(get_default_llm(), bind_tools=True)
    return _graph


def get_vision_graph():
    """Returns a singleton graph that uses the configured vision LLM without tools."""
    global _vision_graph
    if _vision_graph is None:
        # Avoid tool-binding to guarantee OpenRouter vision endpoints don't strictly require tool support
        _vision_graph = _build_graph(get_vision_llm(), bind_tools=False, use_system_role=False)
    return _vision_graph
