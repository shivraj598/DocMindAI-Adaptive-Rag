"""
LLM initialization via OpenRouter (OpenAI-compatible endpoint).
"""

import os

from dotenv import load_dotenv
from langchain_openai import ChatOpenAI

load_dotenv()
os.environ["OPENAI_API_KEY"] = os.getenv("OPENAI_API_KEY", "")

OPENROUTER_API_KEY = os.getenv("OPENROUTER_API_KEY", "")
OPENROUTER_BASE_URL = os.getenv("OPENROUTER_BASE_URL", "https://openrouter.ai/api/v1")

llm = ChatOpenAI(
    model="gpt-4o",
    api_key=OPENROUTER_API_KEY,
    base_url=OPENROUTER_BASE_URL,
    max_tokens=1024,
    default_headers={
        "HTTP-Referer": "http://localhost:8000",
        "X-Title": "Adaptive RAG",
    }
) if OPENROUTER_API_KEY else ChatOpenAI(model="gpt-4o")