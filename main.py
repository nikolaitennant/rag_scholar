import streamlit as st
from langchain_openai import ChatOpenAI, OpenAIEmbeddings
from langchain_community.vectorstores import FAISS
from langchain_community.document_loaders import TextLoader, PyPDFLoader
from langchain_core.messages import SystemMessage, HumanMessage
from dotenv import load_dotenv
import os
import tempfile

# Load env variables
load_dotenv()
api_key = os.getenv("OPENAI_API_KEY")

# Initialize or load persistent memory for "remembered" facts and default context index
if "memory_facts" not in st.session_state:
    st.session_state["memory_facts"] = []  # permanent facts
if "session_facts" not in st.session_state:
    st.session_state["session_facts"] = []  # one-off facts
if "persona" not in st.session_state:
    st.session_state["persona"] = None
if "chat_history" not in st.session_state:
    st.session_state["chat_history"] = []

# Load and index default documents once
@st.cache_resource(show_spinner=False)
def load_and_index_defaults(folder="default_context"):
    docs = []
    if os.path.exists(folder):
        for fname in os.listdir(folder):
            path = os.path.join(folder, fname)
            loader = PyPDFLoader(path) if fname.lower().endswith(".pdf") else TextLoader(path)
            docs.extend(loader.load())
    embeddings = OpenAIEmbeddings(api_key=api_key)
    return FAISS.from_documents(docs, embeddings)

# Load user-uploaded files
def load_uploaded_files(uploaded_files):
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

# Page layout
st.set_page_config(page_title="Giulia's Law AI Assistant", page_icon="🤖")
st.title("🤖 Giulia's Law AI Assistant")

# Instructions/info box
st.markdown("""
<div style='margin-bottom:24px;padding:26px 28px;background:#e7f3fc;border-radius:14px;border-left:7px solid #2574a9;color:#184361;font-size:1.08rem;box-shadow:0 1px 8px #eef4fa;line-height:1.7;'>
  <b style='font-size:1.13rem;'>ℹ️  This assistant ONLY uses information from your uploaded documents and
  <span style='color:#1c853b;'>preloaded default context</span> (CV, course info, etc—no need to upload).</b>
  <ul style='margin-left:1.1em;margin-top:12px;'>
    <li>If the answer is <b>not present</b> in your documents or remembered facts, you'll see a warning.</li>
    <li style='margin-top:8px;'><span style='color:#d97706;font-weight:600;'>It will <u>not</u> invent information.</span></li>
    <li style='margin-top:8px;'>Upload multiple files; their content is combined for retrieval.</li>
  </ul>
  <p style='margin-top:12px;'><b>✨ Tip:</b> Use <code>remember:</code> for persistent facts, <code>memo:</code> for session-only facts, and <code>role:</code> to set persona.</p>
</div>
""", unsafe_allow_html=True)

# Sidebar UI
uploaded_files = st.sidebar.file_uploader(
    "Upload PDF or text files (persistent)", type=["pdf","txt"], accept_multiple_files=True
)
new_fact = st.sidebar.text_input("Add fact (memo: or remember: prefix)")
persona_input = st.sidebar.text_input("Set persona (role: prefix)")

# Process fact/persona commands
if new_fact:
    text = new_fact.strip()
    if text.lower().startswith("remember:"):
        st.session_state.memory_facts.append(text.split(':',1)[1].strip())
        st.success("✅ Fact remembered permanently.")
    elif text.lower().startswith("memo:"):
        st.session_state.session_facts.append(text.split(':',1)[1].strip())
        st.info("ℹ️ Session fact added.")

if persona_input and persona_input.lower().startswith("role:"):
    st.session_state.persona = persona_input.split(':',1)[1].strip()
    st.success(f"👤 Persona set to: {st.session_state.persona}")

# Build retriever
default_index = load_and_index_defaults()
uploaded_docs = load_uploaded_files(uploaded_files)
# Wrap memory facts as docs
memory_docs = [type("Doc", (), {"page_content": f})() for f in st.session_state.memory_facts]
all_dynamic = uploaded_docs + memory_docs

@st.cache_resource(show_spinner=False, suppress_st_warning=True)
def build_vectorstore(default_index, dynamic_docs):
    vs = default_index
    if dynamic_docs:
        embeddings = OpenAIEmbeddings(api_key=api_key)
        vs = FAISS.from_documents(dynamic_docs, embeddings, index=default_index.index)
    return vs

vector_store = build_vectorstore(default_index, all_dynamic)
retriever = vector_store.as_retriever()
llm = ChatOpenAI(api_key=api_key, model="gpt-4o-mini", temperature=0.0)

# Main chat UI
if default_index.docstore._len == 0 and not uploaded_docs and not st.session_state.memory_facts:
    st.info("Upload docs or add facts to get started.")
else:
    st.success("Ready! Ask a question below.")
    user_input = st.chat_input("Ask about your documents or facts...")
    if user_input:
        # Retrieve
        docs = retriever.invoke(user_input)
        context = "\n\n".join(d.page_content for d in docs)
        # Build prompt
        msgs = []
        prompt = ("You are a helpful legal assistant. Answer only using provided context, "
                  "remembered facts, session facts, and any facts stated inline in the current prompt. "
                  "Do not hallucinate.")
        if st.session_state.persona:
            prompt += f" Adopt the persona: {st.session_state.persona}."
        msgs.append(SystemMessage(content=prompt))
        if context:
            msgs.append(SystemMessage(content=f"Context:\n{context}"))
        for f in st.session_state.memory_facts:
            msgs.append(SystemMessage(content=f"Remembered fact: {f}"))
        for f in st.session_state.session_facts:
            msgs.append(SystemMessage(content=f"Session fact: {f}"))
        msgs.append(HumanMessage(content=user_input))
        # Fallback
        if not context and not st.session_state.memory_facts and not st.session_state.session_facts:
            st.warning("Sorry, there is not enough information in the documents or user input to answer your request.")
        else:
            res = llm.invoke(msgs)
            st.session_state.chat_history.append(("User", user_input))
            st.session_state.chat_history.append(("Assistant", res.content))

    # Display history
    for speaker, text in st.session_state.chat_history:
        st.chat_message("user" if speaker == "User" else "assistant").write(text)
