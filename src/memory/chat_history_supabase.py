"""
Chat history storage using Supabase backend.
"""

from typing import List

import httpx
from langchain_core.chat_history import BaseChatMessageHistory
from langchain_core.messages import BaseMessage, messages_from_dict

from src.db.supabase_client import SUPABASE_URL, SUPABASE_ANON_KEY

_HEADERS = {
    "apikey": SUPABASE_ANON_KEY,
    "Authorization": f"Bearer {SUPABASE_ANON_KEY}",
    "Content-Type": "application/json",
    "Prefer": "return=minimal",
}

_client = httpx.AsyncClient(timeout=httpx.Timeout(30.0))


class SupabaseChatMessageHistory(BaseChatMessageHistory):
    """Chat history backed by Supabase."""

    def __init__(self, session_id: str):
        self.session_id = session_id

    async def add_message(self, message: BaseMessage) -> None:
        await _client.post(
            f"{SUPABASE_URL}/rest/v1/chat_history",
            headers=_HEADERS,
            json={
                "session_id": self.session_id,
                "type": message.type,
                "content": message.content,
                "additional_kwargs": message.additional_kwargs,
            },
        )

    async def get_messages(self) -> List[BaseMessage]:
        response = await _client.get(
            f"{SUPABASE_URL}/rest/v1/chat_history",
            headers=_HEADERS,
            params={
                "session_id": f"eq.{self.session_id}",
                "order": "timestamp.asc",
                "limit": 1000,
            },
        )
        response.raise_for_status()
        docs = response.json()

        return messages_from_dict(
            [
                {
                    "type": d["type"],
                    "data": {
                        "content": d["content"],
                        "additional_kwargs": d.get("additional_kwargs", {}),
                    },
                }
                for d in docs
            ]
        )

    async def clear(self) -> None:
        await _client.delete(
            f"{SUPABASE_URL}/rest/v1/chat_history",
            headers=_HEADERS,
            params={"session_id": f"eq.{self.session_id}"},
        )


class ChatHistory:
    """Factory for Supabase-backed chat history."""

    @classmethod
    def get_session_history(
        cls, session_id: str, config: dict = None
    ) -> SupabaseChatMessageHistory:
        """Get chat history for a session."""
        return SupabaseChatMessageHistory(session_id)
