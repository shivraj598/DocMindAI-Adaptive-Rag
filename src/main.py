"""
Main FastAPI application entry point.
"""

import shutil
from pathlib import Path

from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

from src.api.routes import router

CHROMA_DIR = Path(__file__).parent.parent / "chroma_index"
if CHROMA_DIR.exists():
    shutil.rmtree(CHROMA_DIR)
    print("Cleared chroma_index on startup")

app = FastAPI(title="DocMindAI API")

app.add_middleware(
    CORSMiddleware,
    allow_origins=["http://localhost:5173", "http://127.0.0.1:5173"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

app.include_router(router)
app.state.description_ = ""


@app.get("/")
async def root():
    """Root endpoint to verify API is running."""
    return {"message": "DocMindAI API is running"}
