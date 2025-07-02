"""Build and return sidebar state."""
from __future__ import annotations
import os, re, shutil, streamlit as st
from typing import List, Tuple
from science.config import CONFIG

class SidebarUI:
    """Sidebar controls for class selection, upload, mode radio."""

    def build(self) -> Tuple[str, str, List[str], str, list]:
        """Return ctx_dir, index_dir, selected_docs, mode, uploads."""
        st.sidebar.header("📂 Settings & Additional Info")

        # --- class picker ----------------------------------------------
        folders = [d for d in os.listdir(CONFIG.base_ctx_dir) if os.path.isdir(os.path.join(CONFIG.base_ctx_dir, d))]
        if not folders:
            st.sidebar.error("No class folders found"); st.stop()
        if "active_class" not in st.session_state:
            st.session_state.active_class = folders[0]
        active = st.sidebar.selectbox("Select class / module", folders, index=folders.index(st.session_state.active_class))
        if active != st.session_state.active_class:
            st.session_state.active_class = active; st.rerun()
        ctx_dir   = os.path.join(CONFIG.base_ctx_dir, active)
        index_dir = f"faiss_{active}"

        # --- uploader ---------------------------------------------------
        uploads = st.sidebar.file_uploader("Upload legal docs", type=["pdf","docx","doc","pptx","csv","txt"], accept_multiple_files=True)

        # --- focus mode -------------------------------------------------
        sel_docs = st.sidebar.multiselect("📑 Select docs to focus on (optional)", os.listdir(ctx_dir) if os.path.exists(ctx_dir) else [])
        mode     = st.sidebar.radio("↳ How should I use the selected docs?", ["Prioritise (default)", "Only these docs"], horizontal=True)

        return ctx_dir, index_dir, sel_docs, mode, uploads