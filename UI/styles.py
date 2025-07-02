"""
Central place for global CSS tweaks shared by all Streamlit pages.
Import once at app start:

    from giulia_ui.styles import inject_global_css
    inject_global_css()
"""

import streamlit as st


def inject_global_css() -> None:
    """Inject small reusable style rules into the Streamlit page."""
    st.markdown(
        """
        <style>
        /* ---------- reusable info panel (used in “How this assistant works”) */
        .info-panel {
            padding: 24px 28px;
            border-radius: 14px;
            font-size: 1.05rem;
            line-height: 1.7;
            background: #fafafa;
            border: 1px solid #ececec;
        }

        /* ---------- tweak expander chevron to sit on the right */
        .streamlit-expanderHeader {
            flex-direction: row-reverse;
        }

        /* ---------- nicer chat markdown (code blocks etc.) */
        .chat-element code {
            color: #d6336c;
            background: #f7f7f7;
            padding: 2px 4px;
            border-radius: 4px;
            font-size: 0.92rem;
        }

        /* ---------- reduce top padding of main container */
        section.main > div:first-child {
            padding-top: 0.5rem;
        }
        </style>
        """,
        unsafe_allow_html=True,
    )