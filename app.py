# Law AI Assistant – compact main entry
# =================================================
"""Top‑level Streamlit file.  Everything UI‑heavy or utility‑heavy
lives in smaller helper modules so this stays readable.

Folder structure expected
└── app.py                 (this file)
└── config.py              (unchanged)
└── science/…              (unchanged)
└── ui/
    ├── ui_helpers.py      (your existing header / theme code)
    ├── sidebar.py         (new – handles ALL sidebar widgets)
    └── chat_ui.py         (new – renders chat history and pills)

Only this file has to be run with `streamlit run app.py`.
"""
from __future__ import annotations

import os
import streamlit as st
from dotenv import load_dotenv

# local imports 
from config import AppConfig
from science.document_manager import DocumentManager
from science.memory_manager import MemoryManager
from science.chat_assistant import ChatAssistant

from ui.ui_helpers import setup_ui
from ui.sidebar import build_sidebar            # returns state needed for chat
from ui.chat_ui import render_chat_history      # prints chat bubbles + pills

# env + API key
load_dotenv()
API_KEY = os.getenv("OPENAI_API_KEY")
if not API_KEY:
    st.error("OPENAI_API_KEY not found in environment / Streamlit secrets.")
    st.stop()

# High‑level app config & title 
cfg = AppConfig()
setup_ui("Giulia's (🐀) Law AI Assistant", "⚖️", cfg, API_KEY)

# Sidebar (class picker, uploads, contact form, …)
sidebar_state = build_sidebar(cfg)  # dict with active_class, ctx_dir, idx_dir,
                                    # sel_docs, mode, uploaded_docs

active_class  = sidebar_state["active_class"]
ctx_dir       = sidebar_state["ctx_dir"]
idx_dir       = sidebar_state["idx_dir"]
sel_docs      = sidebar_state["sel_docs"]
mode          = sidebar_state["mode"]
uploaded_docs = sidebar_state["uploaded_docs"]

# Vector store (cached per class)
doc_mgr = DocumentManager(API_KEY, cfg)
vector_store = doc_mgr.ensure_vector_store(ctx_dir, idx_dir, uploaded_docs)

# Chat assistant & title
mem_mgr   = MemoryManager(API_KEY, cfg)
assistant = ChatAssistant(API_KEY, cfg, mem_mgr, vector_store)

st.title("⚖️ Giulia's Law AI Assistant!")

# Chat input
user_q = st.chat_input("Ask anything…")
if user_q:
    reply = assistant.handle_turn(user_q, sel_docs, mode)
    # store turns in the session (so chat survives rerun)
    st.session_state.setdefault("chat_history", [])
    st.session_state.chat_history.append({"speaker": "User", "text": user_q})
    st.session_state.chat_history.append(reply)

# Render chat history incl. pill bar
render_chat_history(st.session_state.get("chat_history", []))