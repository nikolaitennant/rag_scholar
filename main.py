import streamlit as st
from dotenv import load_dotenv
from openai import OpenAI
from langchain_openai import ChatOpenAI, OpenAIEmbeddings
from langchain_community.vectorstores import FAISS
from langchain_community.document_loaders import (
    Docx2txtLoader,
    UnstructuredWordDocumentLoader,
    UnstructuredPowerPointLoader,
    CSVLoader,
    TextLoader,
    PyPDFLoader,
)
from langchain_core.messages import SystemMessage, HumanMessage
from langchain.memory import ConversationBufferWindowMemory
import re, shutil, tempfile, os
from langchain.memory import ConversationSummaryBufferMemory
import time, random

# ─── Load environment variables ─────────────────────────────────────────────
load_dotenv()
api_key = os.getenv("OPENAI_API_KEY")
client = OpenAI(api_key=api_key)

# ─── CONFIG ───────────────────────────────────────────────────────────────
BASE_CTX_DIR = "classes_context"  # parent folder that holds the per-class folders
CTX_DIR = None  # will be set after the user picks a class
INDEX_DIR = None
FIRST_K = 30
FINAL_K = 4
LLM_MODEL = "gpt-4.1-mini"
INLINE_RE = re.compile(r"\[\s*#(\d+)\s*\]")
SESSION_WINDOW = 8
MAX_TOKEN_LIMIT = 800  # for the summary memory

# ─── Streamlit session state ───────────────────────────────────────────────
for key in ("memory_facts", "session_facts", "chat_history"):
    if key not in st.session_state:
        st.session_state[key] = []
if "persona" not in st.session_state:
    st.session_state.persona = None
# ─── session-wide citation IDs ────────────────────────────────────────────
if "global_ids" not in st.session_state:
    st.session_state.global_ids = {}   # {(file, page) → stable int}
    st.session_state.next_id = 1       # next unused citation number


# ① short verbatim window
if "window_memory" not in st.session_state:
    st.session_state.window_memory = ConversationBufferWindowMemory(
        k=SESSION_WINDOW,
        return_messages=True,
    )

# ② long summary memory
if "summary_memory" not in st.session_state:
    st.session_state.summary_memory = ConversationSummaryBufferMemory(
        llm=ChatOpenAI(api_key=api_key,
                    model="gpt-3.5-turbo-0125",
                    temperature=0.0),
        max_token_limit=MAX_TOKEN_LIMIT,
        return_messages=True,
        human_prefix="Human",
        ai_prefix="AI",
        summary_prompt=(
            "Provide a concise running summary of the conversation so far, "
            "excluding the most recent 8 messages."
        ),
    )


# ─── Helpers: load & index default docs ────────────────────────────────────
@st.cache_resource(show_spinner=False)
def load_and_index_defaults(folder: str):
    docs = []
    if os.path.exists(folder):
        for fname in os.listdir(folder):
            lower = fname.lower()
            path = os.path.join(folder, fname)

            if lower.endswith(".pdf"):
                loader = PyPDFLoader(path)
            elif lower.endswith(".docx"):
                loader = Docx2txtLoader(path)
            elif lower.endswith(".doc"):
                loader = UnstructuredWordDocumentLoader(path)
            elif lower.endswith(".pptx"):
                loader = UnstructuredPowerPointLoader(path)
            elif lower.endswith(".csv"):
                loader = CSVLoader(path)
            elif lower.endswith(".txt"):
                loader = TextLoader(path)
            else:
                continue

            docs.extend(loader.load())

    # ── guard: nothing to index ─────────────────────────────
    if not docs:
        return [], None
    # ────────────────────────────────────────────────────────

    embeddings = OpenAIEmbeddings(api_key=api_key)
    index = FAISS.from_documents(docs, embeddings)
    return docs, index


def load_uploaded_files(uploaded_files):
    if not uploaded_files:
        return []
    tmp = tempfile.mkdtemp()
    docs = []
    for f in uploaded_files:
        lower = f.name.lower()
        if not lower.endswith((".pdf", ".txt", ".docx", ".doc", ".pptx", ".csv")):
            continue
        fp = os.path.join(tmp, f.name)
        with open(fp, "wb") as out:
            out.write(f.getbuffer())
        if lower.endswith(".pdf"):
            loader = PyPDFLoader(fp)
        elif lower.endswith(".docx"):
            loader = Docx2txtLoader(fp)
        elif lower.endswith(".doc"):
            loader = UnstructuredWordDocumentLoader(fp)
        elif lower.endswith(".pptx"):
            loader = UnstructuredPowerPointLoader(fp)
        elif lower.endswith(".csv"):
            loader = CSVLoader(fp)
        else:
            loader = TextLoader(fp)
        docs.extend(loader.load())
    return docs


def build_vectorstore(default_docs, default_index, session_docs):
    if session_docs:
        embeddings = OpenAIEmbeddings(api_key=api_key)
        return FAISS.from_documents(default_docs + session_docs, embeddings)
    return default_index


def extract_citation_numbers(text: str) -> list[int]:
    return sorted({int(n) for n in INLINE_RE.findall(text)})


# ─── Streamlit UI setup ───────────────────────────────────────────────────
st.set_page_config("Giulia's (🐀) Law AI Assistant", "⚖️")

from streamlit.components.v1 import html as html_component


# ------------------------------------------------------------------ #
# 1. parameter tweaks                                                 #
# ------------------------------------------------------------------ #
GREETING_COOLDOWN = 3          # 1 hour (set back from 3 s test)
TONES             = ["funny", "snarky", "nice"]
openai_client     = OpenAI(api_key=api_key)   # api_key already loaded above

# ------------------------------------------------------------------ #
# 2. query-string helpers (per-tab persistence)                       #
# ------------------------------------------------------------------ #
def get_last_greet() -> float:
    return float(st.query_params.get("last_greet", "0"))

def set_last_greet(ts: float) -> None:
    st.query_params["last_greet"] = f"{ts:.0f}"   # mutates URL in place

# ------------------------------------------------------------------ #
# 3. HTML banner with auto-fade                                        #
# ------------------------------------------------------------------ #
def show_greeting(msg: str):
    html_component(
        f"""
        <div id="welcome-banner" class="welcome-banner">{msg}</div>

        <style>
          .welcome-banner {{
              max-width: 600px;
              margin: 1.2rem auto 2rem;
              padding: 18px 28px;
              text-align: center;
              font-size: 1.35rem; font-weight: 600; line-height: 1.5;
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
        height=130,   # adjust if the banner wraps onto two lines
    )

# ------------------------------------------------------------------ #
# 4. Display banner once per cooldown                                 #
# ------------------------------------------------------------------ #
now = time.time()
if now - get_last_greet() > GREETING_COOLDOWN:
    vibe = random.choice(TONES)

    try:
        msg = openai_client.chat.completions.create(
            model="gpt-3.5-turbo-0125",
            messages=[
                {"role": "system",
                 "content": "Return ONE short welcome line for Giulia; no extra chatter."},
                {"role": "user",
                 "content": f"Write a {vibe} one-sentence welcome (≤30 words, emoji allowed)."}
            ],
            max_tokens=30,
            temperature=0.6,
        ).choices[0].message.content.strip()
    except Exception:
        msg = "👋 Welcome, Giulia! Ready to dive into some case law?"

    show_greeting(msg)
    set_last_greet(now)

st.markdown(
    """
<style>

/* info-panel look */
.info-panel {
  padding:24px 28px;
  border-radius:14px;
  font-size:1.05rem;
  line-height:1.7;
}

</style>

""",
    unsafe_allow_html=True,
)

st.title("⚖️ Giulia's Law AI Assistant!")

# Sidebar
st.sidebar.header("📂 Settings & Additional Info")
with st.sidebar.expander("🎯 Quick Tips (commands & scope)", expanded=False):
    st.markdown(
        """
| **Command** | **What it Does**               | **Scope**           |
|------------:|--------------------------------|---------------------|
| `remember:` | Store a fact permanently       | Across sessions     |
| `memo:`     | Store a fact this session only | Single session      |
| `role:`     | Set the assistant’s persona    | Single session      |

""",
        unsafe_allow_html=True,
    )


# # ─── Sidebar: choose active class / module ───────────────────────────────
with st.sidebar.container():
    st.markdown("### 🗂️ Class controls")

    # --- list available class folders -----------------------------------
    class_folders = sorted(
        d for d in os.listdir(BASE_CTX_DIR)
        if os.path.isdir(os.path.join(BASE_CTX_DIR, d))
    )
    if not class_folders:
        st.sidebar.error(f"No folders found inside {BASE_CTX_DIR}.")
        st.stop()

    # --- pick default active class in session state ---------------------
    if "active_class" not in st.session_state:
        st.session_state.active_class = class_folders[0]

    # 1️⃣  CLASS SELECTOR (must come before any file-browser widgets)
    active_class = st.sidebar.selectbox(
        "Select class / module",
        class_folders,
        index=class_folders.index(st.session_state.active_class),
    )
    if active_class != st.session_state.active_class:
        st.session_state.active_class = active_class
        st.rerun()  # reload to pick up the new folder

    # --- paths that depend on active_class ------------------------------
    CTX_DIR = os.path.join(BASE_CTX_DIR, active_class)
    INDEX_DIR = f"faiss_{active_class}"

    # 2️⃣  FILE-BROWSER EXPANDER (shown under the selector)
    with st.sidebar.expander(f"🗄️ {active_class} File Browser", expanded=False):
        if not os.path.exists(CTX_DIR):
            st.write("_Folder does not exist yet_")
        else:
            files = sorted(os.listdir(CTX_DIR))
            if not files:
                st.write("_Folder is empty_")
            else:
                st.markdown("<div class='file-list'>", unsafe_allow_html=True)
                for fn in files:
                    col1, col2, col3 = st.columns([4, 1, 1])
                    col1.write(fn)

                    with open(os.path.join(CTX_DIR, fn), "rb") as f:
                        col2.download_button(
                            "⬇️",
                            f,
                            file_name=fn,
                            mime="application/octet-stream",
                            key=f"dl_{fn}",
                        )

                    if col3.button("🗑️", key=f"del_{fn}"):
                        os.remove(os.path.join(CTX_DIR, fn))
                        shutil.rmtree(INDEX_DIR, ignore_errors=True)
                        st.rerun()

    with st.expander(f"🗄️ {active_class} File Browser", expanded=False):
        if not os.path.exists(CTX_DIR):
            st.write("_Folder does not exist yet_")
        else:
            files = sorted(os.listdir(CTX_DIR))
            if not files:
                st.write("_Folder is empty_")
            else:
                # "Download all" zip button
                import io, zipfile
                zip_buffer = io.BytesIO()
                with zipfile.ZipFile(zip_buffer, "w", zipfile.ZIP_DEFLATED) as zf:
                    for fn in files:
                        zf.write(os.path.join(CTX_DIR, fn), arcname=fn)
                st.download_button(
                    "⬇️ Download all as .zip",
                    data=zip_buffer.getvalue(),
                    file_name=f"{active_class}_files.zip",
                    mime="application/zip",
                    key="zip_all_files",
                )
                st.markdown("<div class='file-list'>", unsafe_allow_html=True)
                for fn in files:
                    col1, col2, col3 = st.columns([4, 1, 1])
                    col1.write(fn)
                    with open(os.path.join(CTX_DIR, fn), "rb") as f:
                        col2.download_button(
                            "⬇️",
                            f,
                            file_name=fn,
                            mime="application/octet-stream",
                            key=f"dl_{fn}",
                        )
                    if col3.button("🗑️", key=f"del_{fn}"):
                        os.remove(os.path.join(CTX_DIR, fn))
                        shutil.rmtree(INDEX_DIR, ignore_errors=True)
                        st.rerun()

                    col1, col2, col3 = st.columns([4, 1, 1])
                    col1.write(fn)

                    with open(os.path.join(CTX_DIR, fn), "rb") as f:
                        col2.download_button(
                            "⬇️",
                            f,
                            file_name=fn,
                            mime="application/octet-stream",
                            key=f"dl_{fn}",
                        )

                    if col3.button("🗑️", key=f"del_{fn}"):
                        os.remove(os.path.join(CTX_DIR, fn))
                        shutil.rmtree(INDEX_DIR, ignore_errors=True)
                        st.rerun()


    # 3️⃣  ADD-NEW-CLASS EXPANDER (also under the selector)
    with st.sidebar.expander("➕  Add a new class", expanded=False):
        new_name = st.text_input(
            "Class name (letters, numbers, spaces):", key="new_class_name"
        )

        if st.button("Create class", key="create_class"):
            clean = re.sub(r"[^A-Za-z0-9 _-]", "", new_name).strip().replace(" ", "_")
            target = os.path.join(BASE_CTX_DIR, clean)
            seed_src = "giulia.txt"  # starter file
            seed_dst = os.path.join(target, os.path.basename(seed_src))

            if not clean:
                st.error("Please enter a name.")
            elif clean in class_folders:
                st.warning(f"“{clean}” already exists.")
            else:
                os.makedirs(target, exist_ok=True)
                try:
                    shutil.copy(seed_src, seed_dst)  # make sure folder isn’t empty
                except FileNotFoundError:
                    st.warning(
                        "Starter file giulia.txt not found – class created empty."
                    )

                st.success(f"Added “{clean}”. Select it in the list above.")
                st.rerun()

    # 4️⃣  DELETE CLASS BUTTON (also under the selector)
    if st.sidebar.button("🗑️ Delete this class", key="ask_delete"):
        st.session_state.confirm_delete = True

    if st.session_state.get("confirm_delete"):
        with st.sidebar.expander("⚠️ Confirm delete", expanded=True):
            st.error(f"Really delete the class “{active_class}” and all its files?")
            col_yes, col_no = st.columns(2)
            if col_yes.button("Yes, delete", key="yes_delete"):
                shutil.rmtree(
                    os.path.join(BASE_CTX_DIR, active_class), ignore_errors=True
                )
                shutil.rmtree(f"faiss_{active_class}", ignore_errors=True)
                st.session_state.confirm_delete = False
                # pick a new active class (first alphabetically) or stop if none left
                remaining = sorted(
                    d
                    for d in os.listdir(BASE_CTX_DIR)
                    if os.path.isdir(os.path.join(BASE_CTX_DIR, d))
                )
                if remaining:
                    st.session_state.active_class = remaining[0]
                    st.rerun()
                else:
                    st.sidebar.success("All classes deleted. Add a new one!")
                    st.stop()
            if col_no.button("Cancel", key="cancel_delete"):
                st.session_state.confirm_delete = False
                st.rerun()

# ---------------- Sidebar: Document Controls -----------------

with st.sidebar.container():
    st.markdown("### 📄 Document controls")

    # ── Sidebar: upload files to the current class folder ────────────────────
    LOADER_MAP = {
        "pdf": PyPDFLoader,
        "docx": Docx2txtLoader,
        "doc": TextLoader,  # treat old .doc as plain text fallback
        "pptx": UnstructuredPowerPointLoader,
        "csv": CSVLoader,
        "txt": TextLoader,
    }

    uploaded_docs = st.sidebar.file_uploader(
        "Upload legal docs", type=list(LOADER_MAP.keys()), accept_multiple_files=True
    )
    if st.sidebar.button(f"💾 Save uploads to {active_class}"):
        if uploaded_docs:
            os.makedirs(CTX_DIR, exist_ok=True)
            for uf in uploaded_docs:
                with open(os.path.join(CTX_DIR, uf.name), "wb") as out:
                    out.write(uf.getbuffer())

            shutil.rmtree(INDEX_DIR, ignore_errors=True)  # wipe stale FAISS
            st.success("Files saved! Re-indexing…")
            st.rerun()  # ← add this
        else:
            st.info("No docs to save.")

    # --- Sidebar: narrow or prioritise docs ---------------------------------
    all_files = sorted(os.listdir(CTX_DIR)) if os.path.exists(CTX_DIR) else []
    sel_docs = st.sidebar.multiselect("📑 Select docs to focus on (optional)", all_files)

    mode = st.sidebar.radio(
        "↳ How should I use the selected docs?",
        ["Prioritise (default)", "Only these docs"],
        horizontal=True,
    )


# --------------- Sidebar: light-hearted disclaimer -----------------
with st.sidebar.expander("⚖️ Disclaimer", expanded=False):
    st.markdown(
        """
I’m an AI study buddy, **not** your solicitor or lecturer.  
By using this tool you agree that:

* I might be wrong, out-of-date, or miss a key authority.
* Your exam results remain **your** responsibility.
* If you flunk, you’ve implicitly waived all claims in tort, contract,
  equity, and any other jurisdiction you can think of&nbsp;😉

In short: double-check everything before relying on it.
""",
        unsafe_allow_html=True,
    )

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

# ─── Build or load FAISS index ────────────────────────────────────────────
embeddings = OpenAIEmbeddings(api_key=api_key)

faiss_bin = os.path.join(INDEX_DIR, f"{os.path.basename(INDEX_DIR)}.faiss")
faiss_pkl = os.path.join(INDEX_DIR, f"{os.path.basename(INDEX_DIR)}.pkl")


def index_files_exist() -> bool:
    return os.path.isfile(faiss_bin) and os.path.isfile(faiss_pkl)


if index_files_exist():
    try:
        vector_store = FAISS.load_local(
            INDEX_DIR, embeddings, allow_dangerous_deserialization=True
        )
    except Exception:  # corrupted ⇒ rebuild
        shutil.rmtree(INDEX_DIR, ignore_errors=True)
        vector_store = None
else:
    vector_store = None

if vector_store is None:
    # build from whatever we actually have right now
    default_docs, default_index = load_and_index_defaults(
        CTX_DIR
    )  # <-- pass class folder
    session_docs = load_uploaded_files(uploaded_docs)

    if default_index and session_docs:
        vector_store = build_vectorstore(default_docs, default_index, session_docs)
    elif default_index:
        vector_store = default_index
    elif session_docs:
        vector_store = FAISS.from_documents(session_docs, embeddings)
    else:
        st.error("⚠️ This class has no documents yet. Upload something first.")
        st.stop()

    vector_store.save_local(INDEX_DIR)

# ─── Set up the LLM client ────────────────────────────────────────────────
chat_llm = ChatOpenAI(api_key=api_key, model=LLM_MODEL, temperature=0.0)

# ─── Chat handler ─────────────────────────────────────────────────────────
user_input = st.chat_input("Ask anything")
if user_input:
    txt = user_input.strip()
    low = txt.lower()

    # -------- choose retrieval strategy (sidebar controls) ----------------
    full_retriever = vector_store.as_retriever(search_kwargs={"k": FIRST_K})

    if sel_docs:
        sel_set = set(sel_docs)

        def _in_selection(meta: dict) -> bool:  # meta is a dict
            src = meta.get("source") or meta.get("file_path") or ""
            return os.path.basename(src) in sel_set

        focus_retriever = vector_store.as_retriever(
            search_kwargs={"k": FIRST_K, "filter": _in_selection}
        )
    else:
        focus_retriever = None

    if mode == "Only these docs" and focus_retriever:
        docs = focus_retriever.invoke(txt)

    elif mode == "Prioritise (default)" and focus_retriever:
        primary = focus_retriever.invoke(txt)
        secondary = [d for d in full_retriever.invoke(txt) if d not in primary][
            : max(0, FINAL_K - len(primary))
        ]
        docs = primary + secondary
    else:
        docs = full_retriever.invoke(txt)

    # ─ Command branches ──────────────────────────────────────────────────
    if low.startswith("remember:"):
        fact = txt.split(":", 1)[1].strip()
        st.session_state.memory_facts.append(fact)
        st.session_state.chat_history.append(
            ("Assistant", "✅ Fact remembered permanently.")
        )

    elif low.startswith("memo:"):
        fact = txt.split(":", 1)[1].strip()
        st.session_state.session_facts.append(fact)
        st.session_state.chat_history.append(
            ("Assistant", "ℹ️ Session-only fact added.")
        )

    elif low.startswith("role:"):
        persona = txt.split(":", 1)[1].strip()
        st.session_state.persona = persona
        st.session_state.chat_history.append(("Assistant", f"👤 Persona set: {persona}"))

    # ─ RAG / LLM answer branch ───────────────────────────────────────────
    else:
        # number the retrieved docs and remember their metadata  ────────────────
        snippet_map = {}  # {id:int → dict}
        context_parts = []    # {cid:int → dict}

        for d in docs:
            # ① identify the page we’re citing
            file_name = os.path.basename(
                d.metadata.get("source") or d.metadata.get("file_path", "-unknown-")
            )
            page_num = d.metadata.get("page", None)   # may be None

            # ② look up or assign a stable citation id
            key = (file_name, page_num)
            if key not in st.session_state.global_ids:
                st.session_state.global_ids[key] = st.session_state.next_id
                st.session_state.next_id += 1
            cid = st.session_state.global_ids[key]        # ← stable [#id]

            # ③ build context & map
            context_parts.append(f"[#{cid}]\n{d.page_content}")
            snippet_map[cid] = {
                "preview": re.sub(r"\s+", " ", d.page_content.strip())[:160] + "…",
                "full": d.page_content.strip(),          # ← store the whole snippet
                "source": file_name,
                "page": page_num,
            }
        
        context = "\n\n".join(context_parts)

        sys_prompt = """
        You are Giulia’s friendly but meticulous law-exam assistant.

        GROUND RULES
        • Your knowledge source hierarchy, in order of authority:  
        1. **Provided Snippets** (numbered [#n]).  
        2. **Stored facts** added with remember:/memo:.  
        3. Generally known public facts *only* if obviously harmless
            (e.g., “LSE stands for London School of Economics”).  
        • Every sentence that states a legal rule, holding, statute section, date,
        or anything that might be challenged in an exam answer must end with its
        citation [#n].  
        • If the necessary information is not present in 1 or 2, respond exactly with:  
        “I don’t have enough information in the provided material to answer that.”
        • Cite ONLY when the statement relies on a numbered snippet [#n] (those come from the uploaded documents).  
        Do NOT cite user chat, remembered facts, or general knowledge.

        STYLE
        1. Begin with one conversational line that restates the user’s question.  
        2. Give a detailed, logically structured answer (IRAC only if the user asks).  
        3. Explain legal jargon in plain English.  
        5. Keep tone peer-to-peer, confident, concise.

        (NO CITATION ⇒ NO CLAIM.)
        """.strip()

        if st.session_state.persona:
            sys_prompt += f" Adopt persona: {st.session_state.persona}."        

        messages = [SystemMessage(content=sys_prompt)]

        # ① last 8 turns verbatim  (higher fidelity)
        win_hist = st.session_state.window_memory.load_memory_variables({}).get("history", [])
        messages.extend(win_hist)

        # ② long-term summary      (older context, no duplication risk)
        sum_hist = st.session_state.summary_memory.load_memory_variables({}).get("history", [])
        messages.extend(sum_hist)

        # 2️⃣  retrieved document context
        if context:
            messages.append(SystemMessage(content=f"Context:\n{context}"))

        # 3️⃣  stored permanent / session facts
        for f in st.session_state.memory_facts:
            messages.append(SystemMessage(content=f"Remembered fact: {f}"))
        for f in st.session_state.session_facts:
            messages.append(SystemMessage(content=f"Session fact: {f}"))

        # 4️⃣  current user turn
        messages.append(HumanMessage(content=txt))

        # ── Guard: empty knowledge ------------------------------------------------
        if not (docs or st.session_state.memory_facts or st.session_state.session_facts):
            st.warning("⚠️ Not enough info to answer.")
        else:
            resp = chat_llm.invoke(messages)

            bad = [n for n in extract_citation_numbers(resp.content) if n not in snippet_map]
            if bad:
                resp.content = "I can’t find the sources for some citations, so I can’t answer that."
            else:
                # save the response to the rolling memory and summary memory
                st.session_state.window_memory.save_context(
                    inputs={"input": txt},
                    outputs={"output": resp.content},
                )
                st.session_state.summary_memory.save_context(
                    inputs={"input": txt},
                    outputs={"output": resp.content},
                )
                
            # still push to chat_history so your UI can render it as before
            st.session_state.chat_history.append({"speaker": "User", "text": txt})
            st.session_state.chat_history.append({
                "speaker": "Assistant",
                "text": resp.content,
                "snippets": snippet_map,
            })


# ─── Render the chat history ──────────────────────────────────────────────
for entry in st.session_state.chat_history:
    # backward-compat: tuple → dict
    if isinstance(entry, tuple):
        speaker, text = entry
        entry = {"speaker": speaker, "text": text}

    if entry["speaker"] == "Assistant":
        highlighted = entry["text"]
        cites = extract_citation_numbers(entry["text"])

        with st.chat_message("assistant"):
            st.markdown(highlighted, unsafe_allow_html=True)

        if cites:
            pill = ", ".join(f"#{n}" for n in cites)
            with st.expander(f"Sources used: {pill}", expanded=False):
                seen = set()
                for n in cites:
                    if n in seen:
                        continue                   # skip duplicates
                    seen.add(n)

                    info = entry.get("snippets", {}).get(n)
                    if not info:
                        st.write(f"• [#{n}] – (not in this context?)")
                        continue

                    # -------- build display ----------
                    label = f"**[#{n}]** – {info['source']}"
                    page  = f"p.{info['page'] + 1}" if info.get("page") is not None else ""
                    raw   = info.get("full", info["preview"])
                    quote = raw.replace("\n", " ")[:550]   # clip very long pages

                    st.markdown(
                        f"{label}<br>"
                        f"<span style='color:gray;font-size:0.85rem'>{page}</span><br>"
                        f"<blockquote style='margin-top:6px'>{quote}</blockquote>",
                        unsafe_allow_html=True,
                    )
    else:
        st.chat_message("user").write(entry["text"])
