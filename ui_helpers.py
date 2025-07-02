# ==================== file: ui_helpers.py ====================
"""
Small collection of UI-centric helpers for Giulia’s Law AI Assistant.

Import `setup_ui()` in app.py right after importing Streamlit.
"""
import random
import time
import streamlit as st
from openai import OpenAI

from config import AppConfig


# ------------------------------------------------------------------ #
# Page-wide config + CSS injection                                   #
# ------------------------------------------------------------------ #
def setup_ui(page_title: str, page_icon: str, cfg: AppConfig, api_key: str) -> None:
    """Call this **once** at the very top of your Streamlit file."""
    st.set_page_config(page_title, page_icon)

    _inject_css()
    _maybe_greet(cfg, api_key)


# ------------------------------------------------------------------ #
# Internal helpers                                                   #
# ------------------------------------------------------------------ #
def _inject_css() -> None:
    """Global CSS tweaks – fonts, spacing, expander style, etc."""
    st.markdown(
        """
        <style>
          /* -------- Global font & spacing tweaks -------- */
          html, body, .stApp { font-family: "Inter", sans-serif; }
          h1, h2, h3, h4 { letter-spacing: -0.3px; }
          .sidebar .block-container { padding: 18px 16px 40px; }

          /* -------- Nicer <details>/<summary> ---------- */
          details > summary {
            font-weight: 600;
            cursor: pointer;
            margin: 4px 0 8px;
          }

          /* -------- File-list monospace style ---------- */
          .file-list {
            font-family: "Roboto Mono", monospace;
            font-size: 0.85rem;
          }
        </style>
        """,
        unsafe_allow_html=True,
    )


def _maybe_greet(cfg: AppConfig, api_key: str) -> None:
    """
    Display a playful banner once per cooldown period.
    Persists the timestamp in st.query_params to survive page reloads.
    """
    def _get_last() -> float:
        return float(st.query_params.get("last_greet", "0"))

    def _set_last(ts: float) -> None:
        st.query_params["last_greet"] = f"{ts:.0f}"

    now = time.time()
    if now - _get_last() < cfg.GREETING_COOLDOWN:
        return  # still in cooldown

    vibe = random.choice(cfg.TONES)
    client = OpenAI(api_key=api_key)

    try:
        msg = client.chat.completions.create(
            model="gpt-3.5-turbo-0125",
            messages=[
                {
                    "role": "system",
                    "content": "Return ONE short welcome line; no extra chatter.",
                },
                {
                    "role": "user",
                    "content": f"Write a {vibe} one-sentence welcome (≤30 words, emoji allowed).",
                },
            ],
            max_tokens=30,
            temperature=0.6,
        ).choices[0].message.content.strip()
    except Exception:
        msg = "👋 Welcome, Giulia! Ready to dive into some case law?"

    _banner(msg)
    _set_last(now)


def _banner(msg: str) -> None:
    """Pretty dismiss-after-few-seconds HTML banner."""
    st.components.v1.html(
        f"""
        <div id="welcome-banner" class="welcome-banner">{msg}</div>

        <style>
          .welcome-banner {{
              max-width: 600px;
              margin: 1.2rem auto 2rem;
              padding: 18px 28px;
              text-align: center;
              font-size: 1.35rem;
              font-weight: 600;
              line-height: 1.5;
              background: linear-gradient(135deg,#fffbea 0%,#e9f9ff 100%);
              border: 2px solid #ffd36a;
              border-radius: 14px;
              box-shadow: 0 3px 8px rgba(0,0,0,.06);
              transition: opacity 1s ease-out;
          }}
          .welcome-banner.fade-out {{ opacity: 0; }}
        </style>

        <script>
          setTimeout(() => {{
              const el = document.getElementById("welcome-banner");
              if (el) el.classList.add("fade-out");
          }}, 10000);          /* start fade at 10 s */

          setTimeout(() => {{
              const el = document.getElementById("welcome-banner");
              if (el) el.remove();              /* remove at 11 s */
          }}, 11000);
        </script>
        """,
        height=130,
    )