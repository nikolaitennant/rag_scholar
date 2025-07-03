# 🍋  Giulia's Law Study Buddy – single-file app.py
# -------------------------------------------------
from __future__ import annotations
import os, re, shutil, csv, datetime, pathlib, html, re as regex
from pathlib import Path
from typing import List

import streamlit as st
from dotenv import load_dotenv

# ── local modules ─────────────────────────────────
from config import AppConfig
from science.document_manager import DocumentManager
from science.memory_manager import MemoryManager
from science.chat_assistant import ChatAssistant
from UI.ui_helpers import setup_ui


# ═══════════ 0. ENV + UI BOOTSTRAP ═══════════════
load_dotenv()
API_KEY = os.getenv("OPENAI_API_KEY", "")
if not API_KEY:
    st.error("OPENAI_API_KEY not found in environment."); st.stop()

cfg = AppConfig()
setup_ui("Giulia's Law Study Buddy", "⚖️", cfg, API_KEY)

doc_mgr = DocumentManager(API_KEY, cfg)
mem_mgr  = MemoryManager(API_KEY, cfg)

# ═══════════ 1. SESSION DEFAULTS (prevent AttrErr) ═══════════════
defaults = dict(
    chat_history   = [],
    all_snippets   = {},
    global_ids     = {},
    next_id        = 1,
    session_facts  = [],
    persona        = None,
    chat_buckets   = {},   # class → chat_history
    snip_buckets   = {},   # class → snippet map
    id_counters    = {},   # class → (global_ids, next_id)
)
for k, v in defaults.items():
    st.session_state.setdefault(k, v)

# ═══════════ 2. SIDEBAR ══════════════════════════════════════════
st.sidebar.markdown("### 🛠️ Workspace")

# 2-A list classes
class_folders: List[str] = doc_mgr.list_class_folders()
if not class_folders:
    st.sidebar.warning(f"Add folders inside `{cfg.BASE_CTX_DIR}` to get started."); st.stop()

if "active_class" not in st.session_state:
    st.session_state.active_class = class_folders[0]
active_class = st.session_state.active_class

ctx_dir, idx_dir = doc_mgr.get_active_class_dirs(active_class)

# 2-B TOOLS – clear chat
with st.sidebar.expander("🧹 Tools", expanded=False):
    if st.button("🗑️  Clear chat history"):
        st.session_state.chat_history   = []
        st.session_state.all_snippets   = {}
        st.session_state.global_ids     = {}
        st.session_state.next_id        = 1
        st.session_state.session_facts  = []
        st.success("Chat cleared • counters reset")
        st.rerun()

# 2-C CLASS CONTROLS
with st.sidebar.expander("🗂️ Class Controls", expanded=False):
    chosen = st.selectbox(
        "Change class / module",
        class_folders,
        index=class_folders.index(active_class),
        key="change_class_select",
    )

    # swap buckets if changed
    if chosen != active_class:
        # save outgoing
        st.session_state.chat_buckets[active_class]  = st.session_state.chat_history
        st.session_state.snip_buckets[active_class]  = st.session_state.all_snippets
        st.session_state.id_counters[active_class]   = (
            st.session_state.global_ids, st.session_state.next_id
        )
        # load incoming (or start fresh)
        st.session_state.chat_history = st.session_state.chat_buckets.get(chosen, [])
        st.session_state.all_snippets = st.session_state.snip_buckets.get(chosen, {})
        st.session_state.global_ids, st.session_state.next_id = (
            st.session_state.id_counters.get(chosen, ({}, 1))
        )
        st.session_state.active_class = chosen
        st.rerun()

    # ----- file browser --------------------------------------------
    with st.expander(f"🗄️ {active_class} File Browser", expanded=False):
        if not os.path.exists(ctx_dir):
            st.write("_Folder does not exist yet_")
        else:
            files = sorted(os.listdir(ctx_dir))

            if not files:
                st.write("_Folder is empty_")
            else:
                # --- per-file rows ------------------------------------
                for idx, fn in enumerate(files, start=1):
                    key_base = fn.replace(" ", "_")  # safe for widget keys

                    col_name, col_dl, col_tr = st.columns([5, 1, 1])
                    col_name.write(fn)

                    # download button
                    with open(os.path.join(ctx_dir, fn), "rb") as f:
                        col_dl.download_button(
                            "⬇️",
                            f,
                            file_name=fn,
                            mime="application/octet-stream",
                            key=f"dl_{key_base}",
                        )

                    # instant delete button
                    if col_tr.button("🗑️", key=f"del_{key_base}", help="Delete this file"):
                        # remove the file
                        os.remove(os.path.join(ctx_dir, fn))
                        # wipe the FAISS index so it rebuilds next prompt
                        shutil.rmtree(idx_dir, ignore_errors=True)
                        # refresh sidebar + index
                        st.rerun()

    # ----- add new class -------------------------------------------
    with st.expander("➕  Add a new class", expanded=False):
        new_name = st.text_input("Class name (letters, numbers, spaces):", key="new_class_name")

        if st.button("Create class", key="create_class"):
            clean = re.sub(r"[^A-Za-z0-9 _-]", "", new_name).strip().replace(" ", "_")
            target = Path(cfg.BASE_CTX_DIR) / clean

            if not clean:
                st.error("Please enter a name.")
            elif clean in class_folders:
                st.warning(f"“{clean}” already exists.")
            else:
                target.mkdir(parents=True, exist_ok=True)

                # path to giulia.txt sitting next to app.py
                seed_src = Path(__file__).with_name("giulia.txt")

                if seed_src.exists():
                    shutil.copy(seed_src, target / seed_src.name)
                    st.success("Class created with starter file giulia.txt.")
                    st.rerun()
                else:
                    st.info("Class created (no giulia.txt found).")

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

# 2-D always-visible banner
ctx_dir, idx_dir = doc_mgr.get_active_class_dirs(active_class)
doc_count = len(os.listdir(ctx_dir)) if os.path.exists(ctx_dir) else 0
plural    = "doc" if doc_count == 1 else "docs"
st.sidebar.info(f"📂 Current class: **{active_class}** — {doc_count} {plural}")

# 1.1 quick tips
with st.sidebar.expander("🎯 Quick Tips (commands & scope)", expanded=False):
    st.markdown(
        """
| **Command** | **What it Does**               | **Scope**           |
|------------:|--------------------------------|---------------------|
| remember: | Store a fact permanently       | Across sessions     |
| memo:     | Store a fact this session only | Single session      |
| role:     | Set the assistant’s persona    | Single session      |
| background: | Allow background info from the model (not document based)    | Single session      |
""",
        unsafe_allow_html=True,
    )

# ===== 1.5 Contact / Report an issue =================================

with st.sidebar.expander("✉️  Contact / Report an issue", expanded=False):
    st.markdown(
        "Spotted a bug or have a feature request? "
        "Send it here and Giulia’s human will take a look."
    )

    with st.form(key="contact_form", clear_on_submit=True):
        name    = st.text_input("Your name (optional)")
        email   = st.text_input("Email or contact (optional)")
        message = st.text_area("Describe the issue*", height=150)
        submitted = st.form_submit_button("Submit")

    if submitted:
        if not message.strip():
            st.warning("Please enter a message before submitting.")
        else:
            # ---------- A.  append to CSV -------------------------------
            log_dir = pathlib.Path("logs"); log_dir.mkdir(exist_ok=True)
            log_file = log_dir / "contact_requests.csv"
            with open(log_file, "a", newline="", encoding="utf-8") as f:
                csv.writer(f).writerow(
                    [datetime.datetime.utcnow().isoformat(), name, email, message]
                )

            import smtplib, ssl
            from email.message import EmailMessage

            # --- grab credentials from secrets / env
            gmail_user = st.secrets.get("GMAIL_USER", os.getenv("GMAIL_USER"))
            gmail_pass = st.secrets.get("GMAIL_PASS", os.getenv("GMAIL_PASS"))
            owner      = st.secrets.get("OWNER_EMAIL", gmail_user)  # where you'll receive it

            if gmail_user and gmail_pass:
                msg = EmailMessage()
                msg["Subject"] = "New Giulia AI contact form entry"
                msg["From"]    = gmail_user
                msg["To"]      = owner
                msg.set_content(
                    f"Name: {name or '-'}\n"
                    f"Email: {email or '-'}\n\n"
                    f"Message:\n{message}"
                )

                try:
                    context = ssl.create_default_context()
                    with smtplib.SMTP_SSL("smtp.gmail.com", 465, context=context) as smtp:
                        smtp.login(gmail_user, gmail_pass)
                        smtp.send_message(msg)
                    st.success("Thanks! Your message has been recorded and emailed.")
                except Exception as e:
                    st.info(f"Saved, but email failed to send: {e}")
            else:
                st.info("Saved, but email credentials not set (GMAIL_USER / GMAIL_PASS).")


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
st.title("⚖️ Giulia's Law (AI) Study Buddy!")
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
  <li><b>Sources pill</b> – after each reply you’ll see “Sources used: #2, #7 …”. Click it to expand a list where every #-tag shows <em>file name, page no., and a one-sentence preview</em> of the cited passage.</li>
  <li><b>Read the whole snippet</b> – type <kbd>show&nbsp;snippet&nbsp;[#4]</kbd> (or any number) and I’ll print the full text of that passage in chat.</li>


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
# --------------------------------------------------------------
# 4. RENDER CHAT HISTORY
# --------------------------------------------------------------

# ---------------------------------------------------------------
# 0️⃣  Re-hydrate citation maps ONCE, before rendering messages
# ---------------------------------------------------------------
if "global_ids" not in st.session_state:
    st.session_state.global_ids   = {}
    st.session_state.next_id      = 1
    st.session_state.all_snippets = {}

    for msg in st.session_state.get("chat_history", []):
        for cid, info in msg.get("snippets", {}).items():
            cid_int = int(cid)
            # global lookup tables
            st.session_state.all_snippets[cid_int] = info
            st.session_state.global_ids[
                (info["source"], info.get("page"))
            ] = cid_int
            st.session_state.next_id = max(
                st.session_state.next_id, cid_int + 1
            )

# ---------------------------------------------------------------
# 1️⃣  Render chat history
# ---------------------------------------------------------------
for entry in st.session_state.chat_history:
    role = "user" if entry["speaker"] == "User" else "assistant"

    with st.chat_message(role):
        if role == "user":
            st.write(entry["text"])

        else:
            st.markdown(entry["text"], unsafe_allow_html=True)

            # --- extract the IDs that appear in this answer --------
            plain = html.unescape(re.sub(r"<.*?>", "", entry["text"]))
            cited_ids = sorted({int(n) for n in re.findall(r"\[#\s*(\d+)\s*\]", plain)})

            # per-message snippet map
            snip_map = entry.get("snippets", {})

            if cited_ids:
                with st.expander(
                    "Sources used: " + ", ".join(f"#{i}" for i in cited_ids),
                    expanded=False,
                ):
                    for cid in cited_ids:
                        info = snip_map.get(cid)
                        if not info:
                            st.markdown(f"[#{cid}] *snippet not found*")
                            continue

                        preview = re.sub(r"\s+", " ", info["full"]).strip()[:120] + " …"
                        page    = info.get("page")
                        meta    = f" (p.{page})" if page is not None else ""

                        st.markdown(
                            f"**[#{cid}] {info['source']}{meta}** — {preview}"
                        )