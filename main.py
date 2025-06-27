import streamlit as st
from langchain_openai import ChatOpenAI, OpenAIEmbeddings
from langchain_community.vectorstores import FAISS
from langchain_community.document_loaders import TextLoader, PyPDFLoader
from langchain_core.messages import SystemMessage, HumanMessage
from dotenv import load_dotenv
import os
import tempfile

# ─── Load env variables ────────────────────────────────────────────────────────
load_dotenv()
api_key = os.getenv("OPENAI_API_KEY")

# ─── Initialize session state ─────────────────────────────────────────────────
if "memory_facts" not in st.session_state:
    st.session_state.memory_facts = []    # permanent “remember:” facts
if "session_facts" not in st.session_state:
    st.session_state.session_facts = []   # one-off “memo:” facts
if "persona" not in st.session_state:
    st.session_state.persona = None       # “role:” persona
if "chat_history" not in st.session_state:
    st.session_state.chat_history = []    # for displaying Q&A

# ─── Helpers: load & index docs ───────────────────────────────────────────────
@st.cache_resource(show_spinner=False)
def load_and_index_defaults(folder="default_context"):
    """Load your pre-baked PDFs/TXTs from disk and build a FAISS index."""
    docs = []
    if os.path.exists(folder):
        for fname in os.listdir(folder):
            path = os.path.join(folder, fname)
            loader = PyPDFLoader(path) if fname.lower().endswith(".pdf") else TextLoader(path)
            docs.extend(loader.load())
    embeddings = OpenAIEmbeddings(api_key=api_key)
    return FAISS.from_documents(docs, embeddings)

def load_uploaded_files(uploaded_files):
    """Take Streamlit file_uploader() output, write to temp, load as docs."""
    if not uploaded_files:
        return []
    tmp = tempfile.mkdtemp()
    docs = []
    for f in uploaded_files:
        fp = os.path.join(tmp, f.name)
        with open(fp, "wb") as out:
            out.write(f.getbuffer())
        loader = PyPDFLoader(fp) if f.name.lower().endswith(".pdf") else TextLoader(fp)
        docs.extend(loader.load())
    return docs

def build_vectorstore(default_index, dynamic_docs):
    """Re-index any newly uploaded docs + remembered-facts on top of defaults."""
    vs = default_index
    if dynamic_docs:
        embeddings = OpenAIEmbeddings(api_key=api_key)
        # Passing index=default_index.index appends to the existing index
        vs = FAISS.from_documents(dynamic_docs, embeddings, index=default_index.index)
    return vs

# ─── Streamlit page setup & UI ────────────────────────────────────────────────
st.set_page_config(page_title="Giulia's Law AI Assistant", page_icon="🤖")
st.title("🤖 Giulia's Law AI Assistant")

# Instructions/info box
st.markdown("""
<div style='
    margin-bottom:24px;
    padding:26px 28px;
    background:#e7f3fc;
    border-radius:14px;
    border-left:7px solid #2574a9;
    color:#184361;
    font-size:1.08rem;
    box-shadow:0 1px 8px #eef4fa;
    line-height:1.6;
'>
  <b style='font-size:1.13rem;'>ℹ️  This assistant uses ONLY your uploaded documents, remembered facts, and default context.</b>
  <ul style='margin-left:1.1em;margin-top:12px;'>
    <li>If the answer is <b>not</b> in your docs or remembered facts, you'll see a warning.</li>
    <li style='margin-top:8px;'><span style='color:#d97706;font-weight:600;'>No hallucination—nothing invented.</span></li>
    <li style='margin-top:8px;'>Upload multiple files; their content is combined for retrieval.</li>
  </ul>
  <p style='margin-top:12px;'>
    <b>✨ Tip:</b> <code>remember:</code> for permanent facts, <code>memo:</code> for session facts, <code>role:</code> to set persona.
  </p>
</div>
""", unsafe_allow_html=True)

# Sidebar: file upload + fact/persona inputs
uploaded_files = st.sidebar.file_uploader(
    "Upload PDF or text files (persistent)", type=["pdf","txt"], accept_multiple_files=True
)
new_fact = st.sidebar.text_input("Add fact (memo: or remember: prefix)")
persona_input = st.sidebar.text_input("Set persona (role: prefix)")

# Process fact/persona commands immediately when entered
if new_fact:
    txt = new_fact.strip()
    if txt.lower().startswith("remember:"):
        fact = txt.split(":",1)[1].strip()
        st.session_state.memory_facts.append(fact)
        st.success("✅ Fact remembered permanently.")
    elif txt.lower().startswith("memo:"):
        fact = txt.split(":",1)[1].strip()
        st.session_state.session_facts.append(fact)
        st.info("ℹ️ Session-only fact added.")

if persona_input and persona_input.lower().startswith("role:"):
    persona = persona_input.split(":",1)[1].strip()
    st.session_state.persona = persona
    st.success(f"👤 Persona set to: {persona}")

# Build/rebuild the vector store
default_index = load_and_index_defaults()
uploaded_docs  = load_uploaded_files(uploaded_files)
# Wrap permanent facts as tiny LangChain docs
memory_docs    = [type("Doc", (), {"page_content": f})() for f in st.session_state.memory_facts]
dynamic_docs   = uploaded_docs + memory_docs

vector_store = build_vectorstore(default_index, dynamic_docs)
retriever    = vector_store.as_retriever()
llm          = ChatOpenAI(api_key=api_key, model="gpt-4o-mini", temperature=0.0)

# Main chat interface
has_any_context = (
    default_index.docstore._len > 0
    or uploaded_docs
    or st.session_state.memory_facts
)
if not has_any_context:
    st.info("📂 Upload docs or add facts to get started.")
else:
    st.success("✅ Ready! Ask a question below.")
    user_input = st.chat_input("Ask about your documents or facts…")
    if user_input:
        # 1) retrieve
        docs = retriever.invoke(user_input)
        context = "\n\n".join(d.page_content for d in docs)

        # 2) build system prompt
        sys_prompt = (
            "You are a helpful legal assistant. Answer strictly using the provided context, "
            "remembered facts, session facts, and any facts stated inline in the current prompt. "
            "Do not hallucinate or invent any information."
        )
        if st.session_state.persona:
            sys_prompt += f" Adopt the persona: {st.session_state.persona}."

        messages = [SystemMessage(content=sys_prompt)]
        if context:
            messages.append(SystemMessage(content=f"Context:\n{context}"))
        for f in st.session_state.memory_facts:
            messages.append(SystemMessage(content=f"Remembered fact: {f}"))
        for f in st.session_state.session_facts:
            messages.append(SystemMessage(content=f"Session fact: {f}"))

        messages.append(HumanMessage(content=user_input))

        # 3) fallback or call LLM
        if not context and not st.session_state.memory_facts and not st.session_state.session_facts:
            st.warning("⚠️ Sorry, there is not enough information in the documents or user input to answer your request.")
        else:
            resp = llm.invoke(messages)
            st.session_state.chat_history.append(("User", user_input))
            st.session_state.chat_history.append(("Assistant", resp.content))

    # 4) render history
    for speaker, text in st.session_state.chat_history:
        role = "user" if speaker == "User" else "assistant"
        st.chat_message(role).write(text)