"""
API routes for RAG operations.
"""

from fastapi import APIRouter, UploadFile, File, Header, Depends
from langchain_core.messages import HumanMessage, AIMessage

from src.db.auth import get_current_user
from src.memory.chat_history_supabase import ChatHistory
from src.models.query_request import QueryRequest
from src.rag.document_upload import documents
from src.rag.graph_builder import builder

router = APIRouter()


@router.post("/rag/query")
async def rag_query(req: QueryRequest, user: dict = Depends(get_current_user)):
    """
    Process a RAG query and return the result.

    Args:
        req: The query request containing query text and session_id.
        user: Authenticated user info from JWT.

    Returns:
        The generated response from the RAG pipeline.
    """
    user_id = user["id"]
    try:
        chat_history = ChatHistory.get_session_history(req.session_id, user_id)
        await chat_history.add_message(HumanMessage(content=req.query))
        messages = await chat_history.get_messages()
    except Exception as e:
        print(f"Supabase error (continuing without history): {e}")
        messages = [HumanMessage(content=req.query)]

    result = builder.invoke({"messages": messages, "session_id": req.session_id})

    try:
        await chat_history.add_message(AIMessage(content=result["messages"][-1].content))
    except Exception as e:
        print(f"Supabase save error: {e}")

    return {"result": result["messages"][-1]}


ROLE_MAP = {"human": "user", "ai": "assistant"}


@router.get("/rag/sessions/{session_id}")
async def get_session_messages(session_id: str, user: dict = Depends(get_current_user)):
    """Fetch messages for a given session."""
    try:
        chat_history = ChatHistory.get_session_history(session_id, user["id"])
        messages = await chat_history.get_messages()
        return {"messages": [{"role": ROLE_MAP.get(m.type, m.type), "content": m.content} for m in messages]}
    except Exception as e:
        print(f"Supabase fetch error: {e}")
        return {"messages": []}


@router.post("/rag/documents/upload")
async def upload_file(
    file: UploadFile = File(...),
    description: str = Header(..., alias="X-Description"),
    session_id: str = Header(..., alias="X-Session-Id"),
    user: dict = Depends(get_current_user),
):
    """
    Upload a document for RAG processing.

    Args:
        file: The file to upload (PDF or TXT).
        description: Document description provided via header.
        session_id: Session ID to scope the document to.
        user: Authenticated user info from JWT.

    Returns:
        Upload status.
    """
    status_upload = documents(description, session_id, file)
    return {"status": status_upload}
