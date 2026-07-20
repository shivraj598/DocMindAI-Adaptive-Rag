"""
Graph builder module for the adaptive RAG system.
"""

from langchain_community.tools import TavilySearchResults
from langchain_core.prompts import PromptTemplate
from langgraph.constants import START, END
from langgraph.graph.state import StateGraph

from src.rag.retriever_setup import get_retriever, has_documents
from src.config.settings import Config
from src.llms.openai import llm, extract_text
from src.models.state import State
from src.tools.graph_tools import routing_tool

config = Config()

classify_prompt = PromptTemplate(
    template=config.prompt("classify_prompt"),
    input_variables=["question", "context"],
)

generate_prompt = PromptTemplate(
    template=config.prompt("generate_prompt"),
    input_variables=["question", "context"],
)


def query_classifier(state: State):
    question = state["messages"][-1].content

    if has_documents():
        retriever = get_retriever()
        context = retriever.invoke(question)
        print("context received from retriever")
        print(context[:500] if context else "empty")
    else:
        context = ""

    result = llm.invoke(classify_prompt.format(question=question, context=context))
    text = extract_text(result)
    print("result received is in query classifier")
    print(text[:300])

    route = "general"
    answer = None
    lines = text.splitlines()
    for i, line in enumerate(lines):
        line = line.strip()
        if line.startswith("Route:"):
            r = line.split(":", 1)[1].strip().lower()
            for valid in ("index", "general", "search"):
                if valid in r:
                    route = valid
                    break
            if route != "search" and i + 1 < len(lines):
                ans_line = lines[i + 1].strip()
                if ans_line.startswith("Answer:"):
                    answer = ans_line.split(":", 1)[1].strip()
                elif ans_line and not ans_line.startswith("Route"):
                    answer = ans_line
                if answer == "":
                    answer = None

    new_messages = list(state["messages"])
    if route == "index" and answer:
        new_messages.append({"role": "assistant", "content": answer})

    return {
        "messages": new_messages,
        "route": route,
        "latest_query": question,
        "retrieved_context": context if route == "index" else "",
    }


def general_llm(state: State):
    result = llm.invoke(state["messages"])
    print("inside general llm")
    print(result)
    return {"messages": result}


def generate(state: State):
    context = state["retrieved_context"] or state["messages"][-1].content
    question = state["latest_query"]

    generate_chain = generate_prompt | llm
    result = generate_chain.invoke({"question": question, "context": context})

    return {"messages": [{"role": "assistant", "content": extract_text(result)}]}


def web_search(state: State):
    search_tool = TavilySearchResults()
    result = search_tool.invoke(state["latest_query"])
    contents = [item["content"] for item in result if "content" in item]
    print(contents)

    return {
        "messages": [{"role": "assistant", "content": "\n\n".join(contents)}]
    }


graph = StateGraph(State)

graph.add_node("query_analysis", query_classifier)
graph.add_node("generate", generate)
graph.add_node("web_search", web_search)
graph.add_node("general_llm", general_llm)

graph.add_edge(START, "query_analysis")
graph.add_conditional_edges("query_analysis", routing_tool)
graph.add_edge("web_search", "generate")
graph.add_edge("generate", END)
graph.add_edge("general_llm", END)

builder = graph.compile()
builder.recursion_limit = 50
