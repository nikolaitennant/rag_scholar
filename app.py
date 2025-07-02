# 🍋  Giulia's Law AI Assistant – full-feature UI wrapper
# ------------------------------------------------------
# Directory layout expected:
#   science/  → backend modules
#   ui/       → UI helpers (CSS + greeting)
#   app.py    → this file
# ------------------------------------------------------

from __future__ import annotations
import os, re, shutil
from typing import List

import streamlit as st
from dotenv import load_dotenv

# ── local modules ─────────────────────────────────────────────────────
from config import AppConfig
from science.document_manager import DocumentManager
from science.memory_manager import MemoryManager
from science.chat_assistant import ChatAssistant
from UI.ui_helpers import setup_ui

# ── env + OpenAI key ──────────────────────────────────────────────────
load_dotenv()
API_KEY = os.getenv("OPENAI_API_KEY", "")
if not API_KEY:
    st.error("OPENAI_API_KEY not found in environment.")
    st.stop()

# ── app-level setup ───────────────────────────────────────────────────
cfg = AppConfig()
setup_ui("Giulia's (🐀) Law AI Assistant", "⚖️", cfg, API_KEY)

doc_mgr = DocumentManager(API_KEY, cfg)
mem_mgr = MemoryManager(API_KEY, cfg)

# ======================================================================
# 1. SIDEBAR – class selector + controls, uploads, disclaimer
# ======================================================================

st.sidebar.header("📂 Settings & Additional Info")

# 1.1 quick tips
with st.sidebar.expander("🎯 Quick Tips (commands & scope)", expanded=False):
    st.markdown(
        """
| **Command** | **What it Does**               | **Scope**           |
|------------:|--------------------------------|---------------------|
| `remember:` | Store a fact permanently       | Across sessions     |
| `memo:`     | Store a fact this session only | Single session      |
| `role:`     | Set the assistant’s persona    | Single session      |
| `background:` | Allow background info from the model (not document based)    | Single session      |
""",
        unsafe_allow_html=True,
    )

# 1.2 class controls
with st.sidebar.expander("🗂️ Class controls", expanded=False):

    # ----- class selector -------------------------------------------
    class_folders: List[str] = doc_mgr.list_class_folders()
    if not class_folders:
        st.sidebar.warning(f"Add folders inside `{cfg.BASE_CTX_DIR}` to get started.")
        st.stop()

    if "active_class" not in st.session_state:
        st.session_state.active_class = class_folders[0]

    active_class = st.selectbox(
        "Select class / module",
        class_folders,
        index=class_folders.index(st.session_state.active_class),
        key="active_class_select"
    )
    if active_class != st.session_state.active_class:
        st.session_state.active_class = active_class
        st.rerun()

    ctx_dir, idx_dir = doc_mgr.get_active_class_dirs(active_class)


    # ----- file browser --------------------------------------------
    with st.expander(f"🗄️ {active_class} File Browser", expanded=False):
        if not os.path.exists(ctx_dir):
            st.write("_Folder does not exist yet_")
        else:
            files = sorted(os.listdir(ctx_dir))
            if not files:
                st.write("_Folder is empty_")
            else:
                st.markdown("<div class='file-list'>", unsafe_allow_html=True)

                for fn in files:
                    key_base = fn.replace(" ", "_")  # safe part for keys
                    col1, col2, col3 = st.columns([4, 1, 1])
                    col1.write(fn)

                    with open(os.path.join(ctx_dir, fn), "rb") as f:
                        col2.download_button("⬇️", f,
                            file_name=fn, mime="application/octet-stream",
                            key=f"dl_{key_base}")

                    # ── first click: ask for confirmation ───────────────
                    if col3.button("🗑️", key=f"ask_del_{key_base}"):
                        st.session_state.file_to_delete = fn

                    # ── show confirm row *only* for the chosen file ─────
                    # show confirm inline for the chosen file
                    if st.session_state.get("file_to_delete") == fn:
                        colA, colB = st.columns([1, 5])
                        with colA:
                            st.write("")          # spacer
                        with colB:
                            # draw a rounded pill with 2 buttons side-by-side
                            confirm_col1, confirm_col2 = st.columns(2)
                            with confirm_col1:
                                st.markdown(
                                    "<div style='text-align:center;'>✅</div>",
                                    unsafe_allow_html=True,
                                )
                                if st.button("", key=f"yes_del_{key_base}", help="Delete file"):
                                    os.remove(os.path.join(ctx_dir, fn))
                                    shutil.rmtree(idx_dir, ignore_errors=True)
                                    st.session_state.file_to_delete = None
                                    st.rerun()
                            with confirm_col2:
                                st.markdown(
                                    "<div style='text-align:center;'>❌</div>",
                                    unsafe_allow_html=True,
                                )
                                if st.button("", key=f"no_del_{key_base}", help="Cancel"):
                                    st.session_state.file_to_delete = None
                                    st.experimental_rerun()

    # ----- add new class -------------------------------------------
    with st.expander("➕  Add a new class", expanded=False):
        new_name = st.text_input("Class name (letters, numbers, spaces):", key="new_class_name")
        if st.button("Create class", key="create_class"):
            clean = re.sub(r"[^A-Za-z0-9 _-]", "", new_name).strip().replace(" ", "_")
            target = os.path.join(cfg.BASE_CTX_DIR, clean)
            if not clean:
                st.error("Please enter a name.")
            elif clean in class_folders:
                st.warning(f"“{clean}” already exists.")
            else:
                # seed optional file (keep or remove)
                seed_src = "giulia.txt"
                seed_dst = os.path.join(target, os.path.basename(seed_src))
                try:
                    shutil.copy(seed_src, seed_dst)
                except FileNotFoundError:
                    st.warning("Starter file giulia.txt not found – class created empty.")
                os.makedirs(target, exist_ok=True)
                st.success(f"Added “{clean}”. Select it in the list above.")
                st.rerun()

    # ----- delete class --------------------------------------------
    if st.button("🗑️ Delete this class", key="ask_delete"):
        st.session_state.confirm_delete = True

    if st.session_state.get("confirm_delete"):
        with st.expander("⚠️ Confirm delete", expanded=True):
            st.error(f"Really delete the class “{active_class}” and all its files?")
            col_yes, col_no = st.columns(2)
            if col_yes.button("Yes, delete", key="yes_delete"):
                shutil.rmtree(ctx_dir, ignore_errors=True)
                shutil.rmtree(idx_dir, ignore_errors=True)
                st.session_state.confirm_delete = False
                remaining = [d for d in doc_mgr.list_class_folders() if d != active_class]
                if remaining:
                    st.session_state.active_class = remaining[0]
                    st.rerun()
                else:
                    st.sidebar.success("All classes deleted. Add a new one!")
                    st.stop()
            if col_no.button("Cancel", key="cancel_delete"):
                st.session_state.confirm_delete = False
                st.rerun()

# ---------- 1.3 document controls ------------------------------------
with st.sidebar.expander("📄 Document controls", expanded=False):
    uploaded_docs = st.file_uploader(
        "Upload legal docs",
        type=list(DocumentManager.LOADER_MAP.keys()),
        accept_multiple_files=True,
    )
    if st.button(f"💾 Save uploads to {active_class}"):
        if uploaded_docs:
            os.makedirs(ctx_dir, exist_ok=True)
            for uf in uploaded_docs:
                with open(os.path.join(ctx_dir, uf.name), "wb") as out:
                    out.write(uf.getbuffer())
            shutil.rmtree(idx_dir, ignore_errors=True)
            st.success("Files saved! Re-indexing…")
            st.rerun()
        else:
            st.info("No docs to save.")

    all_files = sorted(os.listdir(ctx_dir)) if os.path.exists(ctx_dir) else []
    sel_docs = st.multiselect("📑 Select docs to focus on (optional)", all_files)

    mode = st.radio(
        "↳ How should I use the selected docs?",
        ["Prioritise (default)", "Only these docs"],
        horizontal=True,
    )

# ---------- 1.4 disclaimer -------------------------------------------
with st.sidebar.expander("⚖️ Disclaimer", expanded=False):
    st.markdown(
        """
I’m an AI study buddy, **not** your solicitor or lecturer.  
By using this tool you agree that:

* I might be wrong, out-of-date, or miss a key authority.  
* Your exam results remain **your** responsibility.  
* If you flunk, you’ve implicitly waived all claims in tort, contract, equity, and any other jurisdiction you can think of 😉

**Double-check everything** before relying on it.
""",
        unsafe_allow_html=True,
    )

# ----------------------------------------------------------------------
# 2. VECTOR STORE (loads cached index or rebuilds)                       
# ----------------------------------------------------------------------
vector_store = doc_mgr.ensure_vector_store(ctx_dir, idx_dir, uploaded_docs)

# ----------------------------------------------------------------------
# 3. MAIN CHAT AREA                                                      
# ----------------------------------------------------------------------
st.title("⚖️ Giulia's Law AI Assistant!")
assistant = ChatAssistant(API_KEY, cfg, mem_mgr, vector_store)

with st.expander("ℹ️  How this assistant works", expanded=False):
    st.markdown(
        """
<div class="info-panel">

**📚 Quick overview**

<ul style="margin-left:1.1em;margin-top:12px">

<!-- Core behaviour ---------------------------------------------------- -->
  <li><b>Document-only answers</b> – I rely <em>solely</em> on the files you upload or the facts you store with remember:/memo:/user queries. No web searching!</li>

  <li><b>Citations</b> – every sentence that states a legal rule, date, or authority ends with [#n]. If I can’t cite it, I’ll say so.</li>

  <li><b>Sources pill</b> – under each reply you’ll see “Sources used: #2, #7 …”. Click to preview which file each number came from.</li>

  <li><b>Read the snippet</b> – type “<kbd>show snippet [#4]</kbd>” and I’ll reveal the exact passage.</li>

  <!-- Uploads ----------------------------------------------------------- -->
  <li><b>Uploads</b>
      <ul>
        <li><b>Session-only</b> – drag files into the sidebar. They vanish when you refresh.</li>
        <li><b>Keep forever</b> – after uploading, click <strong>“💾 Save uploads”</strong>. Need to delete one later? Hit <strong>🗑️</strong>.</li>
      </ul>
  </li>

  <!-- Retrieval options -------------------------------------------------- -->
  <li>📌 <b>Prioritise docs</b> – tick files in the sidebar to make me search them first, then widen the net.</li>
  <li style="margin-top:6px;color:gray;font-size:0.95rem">
      Tip: the “Prioritise / Only these docs” switch activates once at least one file is ticked.
  </li>
</ul>
</div>
        """,
        unsafe_allow_html=True,
    )

user_q = st.chat_input("Ask anything…")
if user_q:
    reply = assistant.handle_turn(user_q, sel_docs, mode)
    st.session_state.chat_history.append({"speaker": "User", "text": user_q})
    st.session_state.chat_history.append(reply)

# ----------------------------------------------------------------------
# 4. RENDER CHAT HISTORY                                                 
# ----------------------------------------------------------------------
for entry in st.session_state.chat_history:
    role = "user" if entry["speaker"] == "User" else "assistant"
    with st.chat_message(role):
        if role == "user":
            st.write(entry["text"])
        else:
            st.markdown(entry["text"], unsafe_allow_html=True)
            cites = assistant._extract_citation_numbers(entry["text"])
            if cites:
                pill = ", ".join(f"#{n}" for n in cites)
                with st.expander(f"Sources used: {pill}", expanded=False):
                    seen = set()
                    for n in cites:
                        if n in seen:
                            continue
                        seen.add(n)
                        info = entry.get("snippets", {}).get(n)
                        if not info:
                            st.write(f"• [#{n}] – (not in this context?)")
                            continue
                        label = f"**[#{n}]** – {info['source']}"
                        page = f"p.{info['page']+1}" if info['page'] is not None else ""
                        quote = info.get("full", info['preview']).replace("\n", " ")[:550]
                        st.markdown(
                            f"{label}<br><span style='color:gray;font-size:0.85rem'>{page}</span><br>"
                            f"<blockquote style='margin-top:6px'>{quote}</blockquote>",
                            unsafe_allow_html=True,
                        )