"""
Retriever setup and vector store configuration.
"""

import os
from pathlib import Path

from langchain_core.documents import Document
from langchain_core.tools import create_retriever_tool
from langchain_community.embeddings import HuggingFaceEmbeddings
from langchain_community.vectorstores import Chroma

embeddings = HuggingFaceEmbeddings(model_name="all-MiniLM-L6-v2")

CHROMA_DIR = Path(__file__).parent.parent.parent / "chroma_index"

_vectorstore = None


def _init_vectorstore():
    global _vectorstore
    _vectorstore = Chroma(
        collection_name="documents",
        embedding_function=embeddings,
        persist_directory=str(CHROMA_DIR),
    )


def retriever_chain(chunks: list[Document]):
    global _vectorstore

    try:
        _init_vectorstore()
        _vectorstore.add_documents(chunks)
        _vectorstore.persist()
        print(f"Chroma vector store updated with {len(chunks)} document chunks")
        return True
    except Exception as e:
        print(f"Error storing documents in Chroma: {e}")
        return False


def has_documents(session_id: str = None) -> bool:
    global _vectorstore
    if _vectorstore is None:
        _init_vectorstore()
    if session_id:
        return len(_vectorstore.get(where={"session_id": session_id})["ids"]) > 0
    return len(_vectorstore.get()["ids"]) > 0


def get_retriever(session_id: str = None):
    global _vectorstore

    try:
        if _vectorstore is None:
            _init_vectorstore()

        filter_kwargs = {}
        if session_id:
            filter_kwargs["filter"] = {"session_id": session_id}

        retriever = _vectorstore.as_retriever(
            search_type="mmr",
            search_kwargs={"k": 6, "fetch_k": 10, "lambda_mult": 0.5, **filter_kwargs},
        )

        if os.path.exists("description.txt"):
            with open("description.txt", "r", encoding="utf-8") as f:
                description = f.read()
        else:
            description = None

        if has_documents(session_id):
            print("Using Chroma vectorstore with uploaded documents")
            tool_desc = (
                f"Use this tool ONLY to answer questions about: {description}\n"
                "Don't use this tool to answer anything else."
            )
        else:
            print("No documents uploaded yet")
            tool_desc = "No documents have been uploaded yet. Do not use this tool."

        retriever_tool = create_retriever_tool(retriever, "retriever_customer_uploaded_documents", tool_desc)

        return retriever_tool

    except Exception as e:
        print(f"Error initializing retriever: {e}")
        raise Exception(e)
