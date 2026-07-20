"""
Tools for graph routing.
"""

from typing import Literal

from src.models.state import State


def routing_tool(state: State) -> Literal["__end__", "general_llm", "web_search"]:
    if state["route"] == "index":
        return "__end__"
    elif state["route"] == "general":
        return "general_llm"
    else:
        return "web_search"
