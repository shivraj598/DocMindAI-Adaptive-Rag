"""LLM initialization via Cloudflare Workers AI (OpenAI-compatible API)."""

import os

from dotenv import load_dotenv
from langchain_openai import ChatOpenAI

load_dotenv()

CLOUDFLARE_API_KEY = os.getenv("CLOUDFLARE_API_KEY", "")
CLOUDFLARE_ACCOUNT_ID = os.getenv("CLOUDFLARE_ACCOUNT_ID", "")

BASE_URL = f"https://api.cloudflare.com/client/v4/accounts/{CLOUDFLARE_ACCOUNT_ID}/ai/v1"

llm = ChatOpenAI(
    model="@cf/meta/llama-3.2-3b-instruct",
    api_key=CLOUDFLARE_API_KEY,
    base_url=BASE_URL,
    max_tokens=1024,
    temperature=0,
)


def extract_text(response) -> str:
    """Extract text from an LLM response (handles new Gemini list format)."""
    content = response.content
    if isinstance(content, str):
        return content
    if isinstance(content, list):
        parts = []
        for item in content:
            if isinstance(item, dict) and item.get("type") == "text":
                parts.append(item["text"])
        return " ".join(parts)
    return str(content)

