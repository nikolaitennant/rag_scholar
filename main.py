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
    UnstructuredImageLoader,
    PyPDFLoader
)
from langchain_core.messages import SystemMessage, HumanMessage
import os
import tempfile
import shutil

# ─── Load environment variables ─────────────────────────────────────────────
load_dotenv()
api_key = os.getenv("OPENAI_API_KEY")
client = OpenAI(api_key=api_key)

# ─── Streamlit session state ───────────────────────────────────────────────
for key in ("memory_facts", "session_facts", "chat_history"):
    if key not in st.session_state:
        st.session_state[key] = []
if "persona" not in st.session_state:
    st.session_state.persona = None

# ─── Helpers: load & index default docs ────────────────────────────────────
@st.cache_resource(show_spinner=False)
def load_and_index_defaults(folder: str = "default_context"):
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
        if not lower.endswith((".pdf",".txt",".docx",".doc",".pptx",".csv")):
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

# ─── Streamlit UI setup ───────────────────────────────────────────────────
st.set_page_config("Giulia's (🐀) Law AI Assistant", "⚖️")
 
st.markdown("""
<style>
/* stretch content edge-to-edge */
section.main > div { max-width: 1200px; }

/* info-panel look */
.info-panel {
  padding:24px 28px;
  border-radius:14px;
  font-size:1.05rem;
  line-height:1.7;
}
html[data-theme="light"] .info-panel{
  background:#e7f3fc; color:#184361;
  border-left:7px solid #2574a9;
  box-shadow:0 1px 8px #eef4fa;
}
html[data-theme="dark"]  .info-panel{
  background:#2b2b2b; color:#ddd;
  border-left:7px solid #bb86fc;
  box-shadow:0 1px 8px rgba(0,0,0,.5);
}
html[data-theme="dark"]  .info-panel b{color:#fff}
html[data-theme="dark"]  .info-panel a{color:#a0d6ff}
</style>
""", unsafe_allow_html=True)

st.title("⚖️ Giulia's Law AI Assistant!")

# Sidebar
st.sidebar.header("📂 File Uploads & Additional Info")
with st.sidebar.expander("🎯 Quick Tips (commands & scope)", expanded=False):
    st.markdown("""
| **Command** | **What it Does**               | **Scope**           |
|------------:|--------------------------------|---------------------|
| `remember:` | Store a fact permanently       | Across sessions     |
| `memo:`     | Store a fact this session only | Single session      |
| `role:`     | Set the assistant’s persona    | Single session      |
""", unsafe_allow_html=True)

LLM_MODEL   = "gpt-4o-mini"
CTX_DIR   = "default_context"
INDEX_DIR = "faiss_store"
FIRST_K   = 30
FINAL_K   = 4

# ---------------- Sidebar: default_context browser -----------------
with st.sidebar.expander("📁 default_context files", expanded=False):
    if not os.path.exists(CTX_DIR):
        st.write("_Folder does not exist yet_")
    else:
        files = sorted(os.listdir(CTX_DIR))
        if not files:
            st.write("_Folder is empty_")
        else:
            for fn in files:
                col1, col2, col3 = st.columns([4, 1, 1])
                col1.write(fn)
                # download link
                with open(os.path.join(CTX_DIR, fn), "rb") as f:
                    col2.download_button(
                        label="⬇️",
                        data=f,
                        file_name=fn,
                        mime="application/octet-stream",
                        key=f"dl_{fn}",
                    )
                # delete button
                if col3.button("🗑️", key=f"del_{fn}"):
                    os.remove(os.path.join(CTX_DIR, fn))
                    shutil.rmtree(INDEX_DIR, ignore_errors=True)
                    st.rerun()                 # ← was st.experimental_rerun()


LOADER_MAP = {
    "pdf":  PyPDFLoader,  "docx": Docx2txtLoader, "doc":  TextLoader,  # treat old .doc as plain text fallback
    "pptx": UnstructuredPowerPointLoader, "csv":  CSVLoader, "txt":  TextLoader,
}

uploaded_docs = st.sidebar.file_uploader("Upload legal docs", type=list(LOADER_MAP.keys()), accept_multiple_files=True)
if st.sidebar.button("💾 Save uploads to default_context"):
    if uploaded_docs:
        os.makedirs(CTX_DIR, exist_ok=True)
        for uf in uploaded_docs:
            dest = os.path.join(CTX_DIR, uf.name)
            with open(dest,"wb") as out: out.write(uf.getbuffer())
        shutil.rmtree(INDEX_DIR, ignore_errors=True)
        st.success("Files saved! Reload to re-index.")
    else: st.info("No docs to save.")

# --- Sidebar: narrow or prioritise docs ---------------------------------
all_files = sorted(os.listdir(CTX_DIR)) if os.path.exists(CTX_DIR) else []

sel_docs = st.sidebar.multiselect(
    "📑 Select docs to focus on (optional)", 
    all_files
)

mode = st.sidebar.radio(
    "↳ How should I use the selected docs?",
    ["Prioritise (default)", "Only these docs"],
    horizontal=True
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

with st.expander("ℹ️  How this assistant works", expanded=True):
    st.markdown(
        """
<div class="info-panel">

**📚 Quick overview**

<ul style="margin-left:1.1em;margin-top:12px">

  <li><b>Document-only answers</b> – I rely <em>solely</em> on the files you upload or facts you store with remember/memo or user queries. No web searching!.</li>

  <li><b>Citations</b> – every legal rule or fact ends with a tag such as [#3].  
      A yellow badge appears if something looks uncited.</li>
      

  <li><b>Uploads</b>
      <ul>
        <li><b>Session-only</b> – drag files into the sidebar. They vanish when you refresh.</li>
        <li><b>Keep forever</b> – after uploading, click <strong>“💾 Save uploads”</strong>.  
            Need to remove one later? Use the <strong>🗑️</strong> icon in the sidebar list.</li>
      </ul>
  </li>

  <li><b>Images (beta)</b> – PNG / JPG diagrams are OCR’d. Very small or handwritten text may mis-read.</li>

  <li><b>Limits &amp; tips</b>
      <ul>
        <li>Handles ≈ 4000 text chunks (about 350 average docs) comfortably.</li>
      </ul>
  </li>
  
  <li>📌 <b>Prioritise docs</b> – use the sidebar checklist to tell the assistant which
    files matter most for this question. I’ll look there first, then widen the net.</li>

</ul>

**Pro tip ✨**  Type "show snippet [#2]" and I’ll reveal the exact passage I used.

</div>
        """,
        unsafe_allow_html=True,
    )

# ─── Build or load FAISS index ────────────────────────────────────────────
embeddings = OpenAIEmbeddings(api_key=api_key)

if os.path.exists(INDEX_DIR):
    # fast path: load a saved index you created earlier
    vector_store = FAISS.load_local(
        INDEX_DIR,
        embeddings,
        allow_dangerous_deserialization=True
    )
else:
    default_docs, default_index = load_and_index_defaults()
    session_docs  = load_uploaded_files(uploaded_docs)
    vector_store  = build_vectorstore(default_docs, default_index, session_docs)
    vector_store.save_local(INDEX_DIR)

chat_llm = ChatOpenAI(api_key=api_key, model=LLM_MODEL, temperature=0.0)

# ─── Chat handler ─────────────────────────────────────────────────────────
user_input = st.chat_input("Ask anything")
if user_input:
    txt = user_input.strip()
    low = txt.lower()

    # -------- choose retrieval strategy (sidebar controls) ----------------
    full_retriever = vector_store.as_retriever(
        search_kwargs={"k": FIRST_K}
    )

    if sel_docs:
        sel_set = set(sel_docs)

        def _in_selection(meta: dict) -> bool:      # meta is a dict
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
        primary   = focus_retriever.invoke(txt)
        secondary = [d for d in full_retriever.invoke(txt)
                     if d not in primary][: max(0, FINAL_K - len(primary))]
        docs = primary + secondary
    else:
        docs = full_retriever.invoke(txt)
    # ---------------------------------------------------------------------

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
        st.session_state.chat_history.append(
            ("Assistant", f"👤 Persona set: {persona}")
        )

    # ─ RAG / LLM answer branch ───────────────────────────────────────────
    else:
        context = "\n\n".join(d.page_content for d in docs)

        # sys_prompt = (
        #     "You are a helpful legal assistant. Answer using provided context, remembered facts, "
        #     "and session facts. Do not invent information."
        # )

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

        if context:
            messages.append(SystemMessage(content=f"Context:\n{context}"))

        for f in st.session_state.memory_facts:
            messages.append(SystemMessage(content=f"Remembered fact: {f}"))
        for f in st.session_state.session_facts:
            messages.append(SystemMessage(content=f"Session fact: {f}"))

        messages.append(HumanMessage(content=txt))

        if not (docs or st.session_state.memory_facts or st.session_state.session_facts):
            st.warning("⚠️ Not enough info to answer.")
        else:
            resp = chat_llm.invoke(messages)
            st.session_state.chat_history.append(("User", txt))
            st.session_state.chat_history.append(("Assistant", resp.content))

# ─── Render the chat history ──────────────────────────────────────────────
for speaker, text in st.session_state.chat_history:
    role = "user" if speaker == "User" else "assistant"
    st.chat_message(role).write(text)