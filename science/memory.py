"""Thin wrapper around LangChain memory objects."""
from langchain.memory import ConversationBufferWindowMemory, ConversationSummaryBufferMemory
from langchain_openai import ChatOpenAI
from .config import CONFIG

class MemoryManager:
    """Provides window + summary memories as singletons."""
    window  = ConversationBufferWindowMemory(k=CONFIG.session_window, return_messages=True)
    summary = ConversationSummaryBufferMemory(
        llm=ChatOpenAI(api_key=CONFIG.api_key, model="gpt-3.5-turbo-0125", temperature=0.0),
        max_token_limit=CONFIG.max_token_limit,
        return_messages=True,
    )