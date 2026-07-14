"""
Retriever setup and vector store configuration.
"""

import os
from pathlib import Path

from langchain_core.documents import Document
from langchain_core.tools import create_retriever_tool
from langchain_community.embeddings import HuggingFaceEmbeddings
from langchain_community.vectorstores import FAISS

from src.core.config import settings

embeddings = HuggingFaceEmbeddings(model_name="all-MiniLM-L6-v2")

FAISS_DIR = Path(__file__).parent.parent.parent / "faiss_index"

_faiss_vectorstore = None


def _load_from_disk():
    global _faiss_vectorstore
    index_file = FAISS_DIR / "index.faiss"
    if index_file.exists():
        try:
            _faiss_vectorstore = FAISS.load_local(
                str(FAISS_DIR), embeddings, allow_dangerous_deserialization=True
            )
            print(f"Loaded FAISS index from {FAISS_DIR}")
            return True
        except Exception as e:
            print(f"Failed to load FAISS index: {e}")
    return False


def _save_to_disk():
    global _faiss_vectorstore
    if _faiss_vectorstore is not None:
        FAISS_DIR.mkdir(parents=True, exist_ok=True)
        _faiss_vectorstore.save_local(str(FAISS_DIR))
        print(f"Saved FAISS index to {FAISS_DIR}")


def retriever_chain(chunks: list[Document]):
    global _faiss_vectorstore

    try:
        vectorstore = FAISS.from_documents(documents=chunks, embedding=embeddings)
        _faiss_vectorstore = vectorstore
        _save_to_disk()
        print(f"FAISS vector store initialized with {len(chunks)} document chunks")
        return True
    except Exception as e:
        print(f"Error storing documents in FAISS: {e}")
        return False


def get_retriever():
    global _faiss_vectorstore

    try:
        if _faiss_vectorstore is None:
            _load_from_disk()

        if _faiss_vectorstore is not None:
            retriever = _faiss_vectorstore.as_retriever()
            print("Using FAISS vectorstore with uploaded documents")
        else:
            print("No documents uploaded yet, creating dummy vectorstore")
            dummy_doc = Document(
                page_content="No documents have been uploaded yet. Please upload a document first.",
                metadata={"source": "initialization"},
            )
            _faiss_vectorstore = FAISS.from_documents(documents=[dummy_doc], embedding=embeddings)
            retriever = _faiss_vectorstore.as_retriever()

        if os.path.exists("description.txt"):
            with open("description.txt", "r", encoding="utf-8") as f:
                description = f.read()
        else:
            description = None

        retriever_tool = create_retriever_tool(
            retriever,
            "retriever_customer_uploaded_documents",
            f"Use this tool **only** to answer questions about: {description}\n"
            "Don't use this tool to answer anything else."
        )

        return retriever_tool

    except Exception as e:
        print(f"Error initializing retriever: {e}")
        raise Exception(e)
