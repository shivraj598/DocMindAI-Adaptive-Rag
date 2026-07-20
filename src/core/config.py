"""
Core configuration and environment settings.
"""

import os

from dotenv import load_dotenv

load_dotenv()


class Settings:
    """Application settings loaded from environment variables."""

    GEMINI_API_KEY: str = os.getenv("GEMINI_API_KEY", "")
    TAVILY_API_KEY: str = os.getenv("TAVILY_API_KEY", "")


settings = Settings()

# Set env variables for LangChain integrations
os.environ["TAVILY_API_KEY"] = settings.TAVILY_API_KEY
os.environ["GOOGLE_API_KEY"] = settings.GEMINI_API_KEY
