import os, re
from dotenv import load_dotenv

load_dotenv()

API_KEY           = os.getenv("OPENAI_API_KEY")
BASE_CTX_DIR      = "classes_context"
FIRST_K, FINAL_K  = 30, 4
LLM_MODEL         = "gpt-4.1-mini"
INLINE_RE         = re.compile(r"\[\s*#(\d+)\s*\]")
SESSION_WINDOW    = 8
MAX_TOKEN_LIMIT   = 800