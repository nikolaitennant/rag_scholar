"""
giulia_core.greeting
====================

Creates a one–line welcome banner that:

* Calls the OpenAI chat model for a random “funny / snarky / nice” greeting.
* Shows the banner only once per hour **per browser tab** (timestamp stored
  in the query string).
* Fades out after 10 s and removes itself at 11 s to free space.

Usage
-----
>>> from giulia_core.greeting import GreetingBanner
>>> GreetingBanner().maybe_show()
"""

from __future__ import annotations

import random
import time
import streamlit as st
from openai import OpenAI
from streamlit.components.v1 import html as html_component

from .config import CONFIG


class GreetingBanner:
    """Handle generation and display of the fading welcome banner."""

    def __init__(self, cooldown: int = 3600) -> None:
        """
        Parameters
        ----------
        cooldown : int, optional
            Minimum seconds between two greetings in the same tab.
        """
        self.cooldown = cooldown
        self._key = "last_greet"
        self._tones = ["funny", "snarky", "nice"]
        self._client = OpenAI(api_key=CONFIG.api_key)

    # ------------------------------------------------------------------ #
    def maybe_show(self) -> None:
        """Show a new banner if the cooldown has expired."""
        now = time.time()
        last = float(st.query_params.get(self._key, "0"))

        if now - last < self.cooldown:
            return  # still within cooldown -> do nothing

        banner_text = self._generate_line()
        self._render_html(banner_text)
        st.query_params[self._key] = f"{now:.0f}"

    # ------------------------------------------------------------------ #
    # Internal helpers                                                   #
    # ------------------------------------------------------------------ #
    def _generate_line(self) -> str:
        """Ask the LLM for a single greeting line (20–30 tokens)."""
        vibe = random.choice(self._tones)

        try:
            response = self._client.chat.completions.create(
                model="gpt-3.5-turbo-0125",
                messages=[
                    {
                        "role": "system",
                        "content": "Return ONE short welcome line for Giulia. "
                                   "No apologies, no extra commentary.",
                    },
                    {
                        "role": "user",
                        "content": (
                            f"Write a {vibe} one-sentence welcome for Giulia, "
                            "≤20 words, emoji allowed."
                        ),
                    },
                ],
                max_tokens=30,
                temperature=0.7,
            )
            return response.choices[0].message.content.strip()
        except Exception:
            # fallback if the API is unreachable
            return "👋 Welcome, Giulia! Ready to dive into some case law?"

    # ------------------------------------------------------------------ #
    def _render_html(self, message: str) -> None:
        """Inject HTML/CSS/JS for the centred fade-out banner."""
        html_component(
            f"""
            <div id="wb" style="
                 max-width:600px;margin:1.2rem auto 2rem;padding:18px 28px;
                 text-align:center;font-size:1.35rem;font-weight:600;
                 line-height:1.5;background:linear-gradient(135deg,#fffbea 0%,#e9f9ff 100%);
                 border:2px solid #ffd36a;border-radius:14px;
                 box-shadow:0 3px 8px rgba(0,0,0,.06);transition:opacity 1s ease-out;">
                {message}
            </div>

            <script>
              setTimeout(() => {{
                  const el = document.getElementById('wb');
                  if (el) el.style.opacity = 0;
              }}, 10000);  /* start fade @10s */

              setTimeout(() => {{
                  const el = document.getElementById('wb');
                  if (el) el.remove();
              }}, 11000);  /* remove @11s */
            </script>
            """,
            height=130,
        )