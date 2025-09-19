"""LangChain tools using built-in decorators and utilities."""

import structlog
from langchain_core.tools import tool
from langchain_google_firestore import FirestoreChatMessageHistory

logger = structlog.get_logger()


@tool
def background_knowledge(question: str) -> str:
    """Answer questions using general knowledge instead of uploaded documents.

    Use ONLY when user explicitly requests general knowledge with '/background'.

    Args:
        question: The question to answer with general knowledge
    """
    logger.info("Background knowledge requested", question=question[:50])
    return f"**[UNCITED]** Background mode: This response draws from general knowledge, not your documents.\n\n{question}"


@tool
def remember_fact(fact: str, user_id: str) -> str:
    """Remember a fact permanently across all sessions for this user.

    Args:
        fact: Fact to remember permanently
        user_id: User ID
    """
    try:
        from google.cloud import firestore
        db = firestore.AsyncClient()

        # Add to user's permanent facts
        user_memory_ref = db.collection("user_memory").document(user_id)
        user_memory_ref.collection("permanent_facts").add({
            "fact": fact,
            "timestamp": firestore.SERVER_TIMESTAMP
        })

        logger.info("Fact remembered permanently", user_id=user_id, fact=fact[:50])
        return "✅ Fact remembered permanently across all sessions."

    except Exception as e:
        logger.error("Failed to remember fact", error=str(e))
        return "❌ Failed to remember fact."


@tool
def memo_for_session(fact: str, session_id: str, user_id: str) -> str:
    """Remember a fact for this session only.

    Args:
        fact: Fact to remember for this session
        session_id: Session ID
        user_id: User ID
    """
    try:
        # Add to session memory
        history = FirestoreChatMessageHistory(
            session_id=session_id,
            collection=f"users/{user_id}/chat_sessions"
        )

        from langchain_core.messages import SystemMessage
        history.add_message(SystemMessage(content=f"MEMO: {fact}"))

        logger.info("Fact memoized for session", session_id=session_id, fact=fact[:50])
        return "📝 Fact remembered for this session."

    except Exception as e:
        logger.error("Failed to memo fact", error=str(e))
        return "❌ Failed to memo fact."


@tool
def set_persona(persona: str, session_id: str, user_id: str) -> str:
    """Adopt a specific role or persona for this conversation.

    Args:
        persona: Role or persona to adopt
        session_id: Session ID
        user_id: User ID
    """
    try:
        # Store persona in session metadata
        history = FirestoreChatMessageHistory(
            session_id=session_id,
            collection=f"users/{user_id}/chat_sessions"
        )

        from langchain_core.messages import SystemMessage
        history.add_message(SystemMessage(
            content=f"PERSONA_SET: I am now acting as {persona}. I will respond from this perspective."
        ))

        logger.info("Persona set", session_id=session_id, persona=persona)
        return f"🎭 Now acting as: {persona}"

    except Exception as e:
        logger.error("Failed to set persona", error=str(e))
        return "❌ Failed to set persona."


# Tool Registry - Using built-in @tool decorator
LANGCHAIN_TOOLS = [
    background_knowledge,
    remember_fact,
    memo_for_session,
    set_persona,
]