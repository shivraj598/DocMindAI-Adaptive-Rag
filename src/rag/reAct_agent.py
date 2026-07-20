"""ReAct agent setup for document retrieval and question answering."""

import os

from langgraph.prebuilt import create_react_agent
from langchain_core.prompts import ChatPromptTemplate

from src.config.settings import Config
from src.llms.openai import llm
from src.rag.retriever_setup import get_retriever

config = Config()

# Initialize tools
tools = [get_retriever()]

# Create ReAct agent
prompt = ChatPromptTemplate.from_messages([
    ("system", config.prompt("system_prompt")),
    ("human", "{input}"),
])

agent_executor = create_react_agent(
    llm,
    tools,
    prompt=prompt,
)
