# ui/sidebar.py — all sidebar widgets in one place
# -------------------------------------------------
"""Sidebar builder for Giulia's Law AI Assistant.
Returns a dict with everything the main app needs:
    active_class, ctx_dir, idx_dir, sel_docs, mode, uploaded_docs

Relies only on Streamlit state; heavy objects (ChatAssistant, FAISS) live in
app.py.  Lightweight DocumentManager is re-instantiated here just to list
class folders and save uploads.
"""
from __future__ import annotations

import os, re, shutil, csv, datetime, json, requests, pathlib
from pathlib import Path
from typing import List, Dict

import streamlit as st

from config import AppConfig
from science.document_manager import DocumentManager

# --------------------------------------------------------------------
# Helper components (each could be factored further if desired)
# --------------------------------------------------------------------

def _quick_tips() -> None:
    with st.sidebar.expander("🎯 Quick Tips (commands & scope)", expanded=False):
        st.markdown(
            """
| **Command** | **What it Does** | **Scope** |
|------------:|------------------|-----------|
| `remember:` | Store fact permanently | Across sessions |
| `memo:`     | Store fact this session | Single session |
| `role:`     | Set assistant’s persona | Single session |
| `background:` | Ask general background | Single session |
""",
            unsafe_allow_html=True,
        )


def _contact_form() -> None:
    """Simple CSV + optional SendGrid email."""
    with st.sidebar.expander("✉️  Contact / Report an issue", expanded=False):
        st.markdown(
            "Spotted a bug or have a feature request?  Send it here and Giulia’s human will take a look."
        )

        with st.form(key="contact_form", clear_on_submit=True):
            name    = st.text_input("Your name (optional)")
            email   = st.text_input("Email or contact (optional)")
            message = st.text_area("Describe the issue*", height=150)
            submitted = st.form_submit_button("Submit")

        if submitted:
            if not message.strip():
                st.warning("Please enter a message before submitting.")
                return

            # A. append to CSV
            log_dir = pathlib.Path("logs"); log_dir.mkdir(exist_ok=True)
            with open(log_dir / "contact_requests.csv", "a", newline="", encoding="utf-8") as f:
                csv.writer(f).writerow([
                    datetime.datetime.utcnow().isoformat(), name, email, message
                ])

            # B. email via SendGrid if configured
            api_key = st.secrets.get("SENDGRID_API_KEY")
            owner   = st.secrets.get("OWNER_EMAIL")
            sender  = st.secrets.get("FROM_EMAIL", owner)

            if api_key and owner:
                subj = "New Giulia AI contact form entry"
                content = f"""Name: {name or '-'}\nEmail: {email or '-'}\n\nMessage:\n{message}"""
                r = requests.post(
                    "https://api.sendgrid.com/v3/mail/send",
                    headers={
                        "Authorization": f"Bearer {api_key}",
                        "Content-Type": "application/json",
                    },
                    data=json.dumps({
                        "personalizations": [{"to": [{"email": owner}]}],
                        "from": {"email": sender},
                        "subject": subj,
                        "content": [{"type": "text/plain", "value": content}],
                    }),
                    timeout=10,
                )
                if r.status_code >= 300:
                    st.info("Saved, but email failed to send (check API key / quota).")
                else:
                    st.success("Thanks! Your message has been recorded and emailed.")
            else:
                st.success("Thanks! Your message has been recorded.")


def _disclaimer() -> None:
    with st.sidebar.expander("⚖️ Disclaimer", expanded=False):
        st.markdown(
            """
I’m an AI study buddy, **not** your solicitor or lecturer.
Always double-check citations before relying on them.
""",
            unsafe_allow_html=True,
        )

# --------------------------------------------------------------------
# Main builder
# --------------------------------------------------------------------

def build_sidebar(cfg: AppConfig, api_key: str) -> Dict:
    """Render the entire sidebar & return user-selected state."""
    st.sidebar.header("📂 Settings & Additional Info")

    _quick_tips()

    # -- instantiate lightweight doc manager just for folder ops ------
    doc_mgr = DocumentManager(api_key, cfg)

    # ------------------------------------------------ Class controls --
    with st.sidebar.expander("🗂️ Class controls", expanded=False):
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
            key="active_class_select",
        )
        if active_class != st.session_state.active_class:
            st.session_state.active_class = active_class
            st.rerun()

    # --- badge right under header -----------------------------------
    st.sidebar.info(f"📂  Current class:  **{active_class}**")

    ctx_dir, idx_dir = doc_mgr.get_active_class_dirs(active_class)

    # ------------------------------------------------ File browser ----
    with st.sidebar.expander(f"🗄️ {active_class} File Browser", expanded=False):
        if not os.path.exists(ctx_dir):
            st.write("_Folder does not exist yet_")
        else:
            files = sorted(os.listdir(ctx_dir))
            if not files:
                st.write("_Folder is empty_")
            else:
                for fn in files:
                    key_base = fn.replace(" ", "_")
                    col_name, col_dl, col_tr = st.columns([5,1,1])
                    col_name.write(fn)
                    with open(os.path.join(ctx_dir, fn), "rb") as f:
                        col_dl.download_button("⬇️", f, file_name=fn, mime="application/octet-stream", key=f"dl_{key_base}")
                    if col_tr.button("🗑️", key=f"del_{key_base}"):
                        os.remove(os.path.join(ctx_dir, fn))
                        shutil.rmtree(idx_dir, ignore_errors=True)
                        st.rerun()

    # ------------------------------------------------ Add new class ---
    with st.sidebar.expander("➕  Add a new class", expanded=False):
        new_name = st.text_input("Class name", key="new_class_name")
        if st.button("Create class", key="create_class"):
            clean = re.sub(r"[^A-Za-z0-9 _-]", "", new_name).strip().replace(" ", "_")
            target = Path(cfg.BASE_CTX_DIR) / clean
            if not clean:
                st.error("Please enter a name.")
            elif clean in class_folders:
                st.warning("That class already exists.")
            else:
                target.mkdir(parents=True, exist_ok=True)
                seed_src = Path(__file__).with_name("giulia.txt")
                if seed_src.exists():
                    shutil.copy(seed_src, target / seed_src.name)
                st.success("Class created."); st.rerun()

    # ------------------------------------------------ Doc controls ----
    with st.sidebar.expander("📄 Document controls", expanded=False):
        uploaded_docs = st.file_uploader("Upload legal docs", type=list(DocumentManager.LOADER_MAP.keys()), accept_multiple_files=True)
        if st.button(f"💾 Save uploads to {active_class}"):
            if uploaded_docs:
                os.makedirs(ctx_dir, exist_ok=True)
                for uf in uploaded_docs:
                    with open(os.path.join(ctx_dir, uf.name), "wb") as out:
                        out.write(uf.getbuffer())
                shutil.rmtree(idx_dir, ignore_errors=True)
                st.success("Files saved! Re-indexing…"); st.rerun()
            else:
                st.info("No docs to save.")

        all_files = sorted(os.listdir(ctx_dir)) if os.path.exists(ctx_dir) else []
        sel_docs = st.multiselect("📑 Select docs to focus on (optional)", all_files)
        mode = st.radio("↳ How should I use the selected docs?", ["Prioritise (default)", "Only these docs"], horizontal=True)

    # ------------------------------------------------ Contact & misc --
    _contact_form()
    _disclaimer()

    # -------------- return everything main app needs -----------------
    return dict(
        active_class=active_class,
        ctx_dir=ctx_dir,
        idx_dir=idx_dir,
        sel_docs=sel_docs,
        mode=mode,
        uploaded_docs=uploaded_docs,
    )
