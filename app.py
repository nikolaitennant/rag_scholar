# ==================== file: app.py ====================
"""
🍋 Giulia's Law AI Assistant – OOP edition with polished UI.

Run with:
    streamlit run app.py
"""
# ----------------------------------------------------- #
# 0. Imports & initialisation                           #
# ----------------------------------------------------- #
import os
from dotenv import load_dotenv
import streamlit as st

# Local modules
from config import AppConfig
from ui_helpers import setup_ui            # ← our new helper
from document_manager import DocumentManager
from memory_manager import MemoryManager
from chat_assistant import ChatAssistant

# Load .env & key
load_dotenv()
API_KEY = os.getenv("OPENAI_API_KEY", "")
if not API_KEY:
    st.error("OPENAI_API_KEY not found in environment.")
    st.stop()

# ----------------------------------------------------- #
# 1. App-wide config / greeting banner / CSS inject     #
# ----------------------------------------------------- #
cfg = AppConfig()
setup_ui("Giulia's (🐀) Law AI Assistant", "⚖️", cfg, API_KEY)

# ----------------------------------------------------- #
# 2. Backend manager instances                          #
# ----------------------------------------------------- #
doc_mgr = DocumentManager(API_KEY, cfg)
mem_mgr = MemoryManager(API_KEY, cfg)

# ----------------------------------------------------- #
# 3. Sidebar – class picker & uploads                   #
# ----------------------------------------------------- #
st.sidebar.header("📂 Class / Module")

class_folders = doc_mgr.list_class_folders()
if not class_folders:
    st.sidebar.warning(f"Add folders inside `{cfg.BASE_CTX_DIR}` to get started.")
    st.stop()

active_class = st.sidebar.selectbox("Choose class", class_folders)
ctx_dir, idx_dir = doc_mgr.get_active_class_dirs(active_class)

uploaded_docs = st.sidebar.file_uploader(
    "Upload docs",
    type=list(DocumentManager.LOADER_MAP.keys()),
    accept_multiple_files=True,
)

# Tiny hint to persist uploads (uses existing folder logic)
if uploaded_docs:
    if st.sidebar.button("💾 Save uploads to class folder"):
        os.makedirs(ctx_dir, exist_ok=True)
        for f in uploaded_docs:
            with open(os.path.join(ctx_dir, f.name), "wb") as out:
                out.write(f.getbuffer())
        st.sidebar.success("Saved! Re-indexing…")
        st.experimental_rerun()

# ----------------------------------------------------- #
# 4. Ensure / load vector store                         #
# ----------------------------------------------------- #
vector_store = doc_mgr.ensure_vector_store(ctx_dir, idx_dir, uploaded_docs)

# ----------------------------------------------------- #
# 5. Main chat interface                                #
# ----------------------------------------------------- #
st.title("⚖️ Giulia's Law AI Assistant (OOP)")

assistant = ChatAssistant(API_KEY, cfg, mem_mgr, vector_store)

query = st.chat_input("Ask me anything about your documents…")
if query:
    reply = assistant.handle_turn(query)
    st.session_state.chat_history.append({"speaker": "User", "text": query})
    st.session_state.chat_history.append(reply)

# ----------------------------------------------------- #
# 6. Render chat history                                #
# ----------------------------------------------------- #
for entry in st.session_state.chat_history:
    role = "user" if entry["speaker"] == "User" else "assistant"
    with st.chat_message(role):
        if role == "user":
            st.write(entry["text"])
        else:
            st.markdown(entry["text"], unsafe_allow_html=True)

            # Inline citation preview
            cites = assistant._extract_citation_numbers(entry["text"])
            if cites:
                with st.expander("Sources", expanded=False):
                    seen = set()
                    for n in cites:
                        if n in seen:
                            continue
                        seen.add(n)
                        snip = entry.get("snippets", {}).get(n)
                        if not snip:
                            continue
                        page = f"p.{snip['page']+1}" if snip['page'] is not None else ""
                        st.markdown(
                            f"**[#{n}]** – {snip['source']} {page}\n\n> {snip['preview']}",
                            unsafe_allow_html=True,
                        )

# ----------------------------------------------------- #
# 7. Footer disclaimer                                  #
# ----------------------------------------------------- #
with st.sidebar.expander("⚖️ Disclaimer", expanded=False):
    st.markdown(
        """
I’m an AI study buddy, **not** your solicitor or lecturer.  
Double-check everything before relying on it.
""",
        unsafe_allow_html=True,
    )