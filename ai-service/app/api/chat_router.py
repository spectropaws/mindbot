"""
chat_router.py
FastAPI router for the /chat endpoint.
Retrieves RAG context if a FAISS index exists, then runs the LangGraph agent.
If imageBase64 is provided, the last user message is formatted as a multimodal
vision payload and dispatched to the vision-capable LLM graph.
"""
from fastapi import APIRouter
from pydantic import BaseModel
from typing import List, Optional
from langchain_core.messages import HumanMessage, AIMessage

from app.agent.graph import get_graph, get_vision_graph
from app.agent.state import AgentState
from app import rag as rag_module
from app.rag import faiss_store

router = APIRouter()


class ChatMessage(BaseModel):
    role: str
    content: str


class ChatRequest(BaseModel):
    messages: List[ChatMessage]
    userId: Optional[str] = None
    useRag: bool = True
    imageBase64: Optional[str] = None


class ToolStep(BaseModel):
    tool: str
    input: str
    output: str


class ChatResponse(BaseModel):
    reply: str
    tool_steps: List[ToolStep] = []


@router.post("/chat", response_model=ChatResponse)
async def chat_endpoint(request: ChatRequest):
    has_image = bool(request.imageBase64)

    # Build LangChain message list
    lc_messages = []
    for i, msg in enumerate(request.messages):
        if msg.role == "user":
            # For the LAST user message, attach the image if provided
            is_last_user = (
                has_image
                and i == len(request.messages) - 1
            )
            if is_last_user:
                # Multimodal content: text + inline base64 image
                content = [
                    {"type": "text", "text": msg.content},
                    {
                        "type": "image_url",
                        "image_url": {
                            "url": f"data:image/jpeg;base64,{request.imageBase64}"
                        },
                    },
                ]
                lc_messages.append(HumanMessage(content=content))
            else:
                lc_messages.append(HumanMessage(content=msg.content))
        elif msg.role == "assistant":
            lc_messages.append(AIMessage(content=msg.content))

    # RAG: retrieve context if index exists and useRag is set
    rag_context = None
    if request.useRag and faiss_store.has_index(request.userId or "default") and lc_messages:
        # Use plain text of the last user message for the RAG query
        last_user_text = None
        for m in reversed(request.messages):
            if m.role == "user":
                last_user_text = m.content
                break
        if last_user_text:
            docs = faiss_store.query(last_user_text, user_id=request.userId or "default")
            if docs:
                rag_context = "\n\n---\n\n".join(d.page_content for d in docs)

    # Memory Slice logic
    from app.core.config_loader import get
    max_messages = get("memory.max_messages", 5)
    if len(lc_messages) > max_messages:
        lc_messages = lc_messages[-max_messages:]

    # Build initial state
    state = AgentState(messages=lc_messages, rag_context=rag_context)

    # Route to vision graph if image is present, otherwise use default graph
    config = {"configurable": {"thread_id": request.userId or "anonymous"}}
    graph = get_vision_graph() if has_image else get_graph()
    final_state = graph.invoke(state, config=config)

    # Collect tool steps from message history (ToolMessages)
    from langchain_core.messages import ToolMessage
    tool_steps = []
    messages = final_state.get("messages", [])
    for i, msg in enumerate(messages):
        if isinstance(msg, ToolMessage):
            prior = messages[i - 1] if i > 0 else None
            tool_name = msg.name or "tool"
            tool_input = ""
            if prior and hasattr(prior, "tool_calls") and prior.tool_calls:
                call = next((tc for tc in prior.tool_calls if tc["id"] == msg.tool_call_id), None)
                if call:
                    tool_input = str(call.get("args", ""))
            tool_steps.append(ToolStep(tool=tool_name, input=tool_input, output=msg.content))

    # Final AI reply is the last non-tool message
    ai_reply = ""
    for msg in reversed(messages):
        if isinstance(msg, AIMessage) and not getattr(msg, "tool_calls", None):
            ai_reply = msg.content
            break

    return ChatResponse(reply=ai_reply, tool_steps=tool_steps)
