# ui/chat_ui.py — render chat bubbles and the pill bar
# ---------------------------------------------------
from __future__ import annotations

import re
from typing import List, Dict

import streamlit as st

# --------------------------------------------------------------------
# Public API
# --------------------------------------------------------------------

def render_chat_history(history: List[Dict]):
    """Print the entire conversation stored in `history`.

    Each `entry` is a dict:
        {"speaker": "User"|"Assistant", "text": str}
    Assumes that  `st.session_state.all_snippets`  already contains every
    snippet ever sent to the LLM this session (so pills can always resolve).
    """
    if not history:
        return

    # ensure regex compiled once
    cid_re = re.compile(r"\[#(\d+)\]")

    for entry in history:
        role = "user" if entry["speaker"] == "User" else "assistant"
        with st.chat_message(role):
            if role == "user":
                st.write(entry["text"])
                continue

            # ---- assistant bubble -----------------------------------
            st.markdown(entry["text"], unsafe_allow_html=True)

            # ---- pill bar -------------------------------------------
            assistant_text = entry["text"]
            cited_ids = sorted({int(n) for n in cid_re.findall(assistant_text)})
            if not cited_ids:
                continue

            all_snips = st.session_state.get("all_snippets", {})
            pill_label = ", ".join(f"#{i}" for i in cited_ids)
            with st.expander(f"Sources used: {pill_label}", expanded=False):
                for cid in cited_ids:
                    info = all_snips.get(cid)
                    if not info:
                        st.markdown(f"[#{cid}] *snippet not found*")
                        continue

                    preview = _short_preview(info["full"])
                    src  = info["source"]
                    page = info.get("page")
                    meta = f" (p.{page})" if page is not None else ""
                    st.markdown(f"**[#{cid}] {src}{meta}** — {preview}")

# --------------------------------------------------------------------
# Helpers
# --------------------------------------------------------------------

def _short_preview(text: str, max_chars: int = 120) -> str:
    """Collapse whitespace and return ≤ max_chars with ellipsis."""
    clean = re.sub(r"\s+", " ", text.strip())
    if len(clean) <= max_chars:
        return clean
    return clean[:max_chars].rstrip() + " …"
