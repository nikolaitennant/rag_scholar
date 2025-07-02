
"""
Streamlit entry-point.

Keeps only high-level orchestration; all heavy logic lives in giulia_core/*
and giulia_ui/* modules.
"""

import streamlit as st

from science.config import CONFIG
from science.greeting import GreetingBanner
from science.vector_store import VectorStoreManager
from UI.styles import SidebarUI
from UI.chat import ChatUI
from UI.styles import inject_global_css


def main() -> None:
    """Launch the Giulia Law-AI Assistant app."""
    st.set_page_config("Giulia's (🐀) Law AI Assistant", "⚖️")
    inject_global_css()

    # 1️⃣  show fading welcome banner
    GreetingBanner().maybe_show()

    # 2️⃣  draw sidebar and get user choices
    ctx_dir, index_dir, sel_docs, mode, uploads = SidebarUI().build()

    # 3️⃣  prepare FAISS vector store (build or load)
    try:
        vs_manager = VectorStoreManager(ctx_dir, index_dir, uploads)
        vector_store = vs_manager.load()
    except ValueError:
        st.error("⚠️ This class has no documents yet. Upload something first.")
        st.stop()

    # 4️⃣  run chat loop
    ChatUI(vector_store).run()


if __name__ == "__main__":
    main()