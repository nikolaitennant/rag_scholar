"""LangChain tools using built-in decorators and utilities."""

import re
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
    return f"BACKGROUND_MODE_ACTIVATED: The user wants a general knowledge answer for: {question}. Please provide a comprehensive answer using your training data and general knowledge, not the uploaded documents. Do not cite any sources."


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


def generate_conversational_response(query: str) -> str:
    """Generate a friendly conversational response for simple greetings and social interactions."""
    query_lower = query.strip().lower()

    # Greetings
    if re.match(r'^(hi|hello|hey|hiya|howdy)[.!]*$', query_lower):
        return "Hello! I'm here to help you with your research and documents. What would you like to explore today?"

    # How are you
    if re.match(r'^(how are you|how\'re you|how are ya)[\?\!\.]*$', query_lower):
        return "I'm doing well, thank you for asking! I'm ready to help you analyze your documents and answer questions. What can I assist you with?"

    # What's up
    if re.match(r'^(what\'s up|whats up|wassup)[\?\!\.]*$', query_lower):
        return "Not much, just ready to help you with your research! What documents would you like to explore or what questions do you have?"

    # Good morning/evening
    if re.match(r'^(good morning|good afternoon|good evening|good night)[\!\.\,]*$', query_lower):
        return f"Good {query_lower.split()[1] if len(query_lower.split()) > 1 else 'day'}! How can I help you with your research today?"

    # Thanks
    if re.match(r'^(thanks|thank you|thx|ty)[\!\.\,]*$', query_lower):
        return "You're very welcome! I'm here whenever you need help with your documents or research questions."

    # Affirmatives
    if re.match(r'^(yes|yeah|yep|yup|ok|okay|sure|fine)[\!\.\,]*$', query_lower):
        return "Great! What would you like to work on next?"

    # Negatives
    if re.match(r'^(no|nope|nah)[\!\.\,]*$', query_lower):
        return "No problem! Let me know if there's anything else I can help you with."

    # Goodbye
    if re.match(r'^(bye|goodbye|see ya|see you|cya|later)[\!\.\,]*$', query_lower):
        return "Goodbye! Feel free to come back anytime you need help with your research. Have a great day!"

    # Default conversational response
    return "I'm here to help you with your research and documents. What would you like to explore today?"


# Tool Registry - Using built-in @tool decorator
LANGCHAIN_TOOLS = [
    background_knowledge,
    remember_fact,
    memo_for_session,
    set_persona,
]