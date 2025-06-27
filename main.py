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
    docs = []
    if os.path.exists(folder):
        for fname in os.listdir(folder):
            if not fname.lower().endswith((".pdf", ".txt")):
                continue
            path = os.path.join(folder, fname)
            loader = PyPDFLoader(path) if fname.lower().endswith(".pdf") else TextLoader(path)
            docs.extend(loader.load())
    embeddings = OpenAIEmbeddings(api_key=api_key)
    return FAISS.from_documents(docs, embeddings)

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


def build_vectorstore(default_index, dynamic_docs):
    vs = default_index
    if dynamic_docs:
        embeddings = OpenAIEmbeddings(api_key=api_key)
        vs = FAISS.from_documents(dynamic_docs, embeddings, index=default_index.index)
    return vs

# ─── Streamlit page setup & UI ────────────────────────────────────────────────
st.set_page_config(page_title="Giulia's Law AI Assistant", page_icon="🤖")
st.title("🤖 Giulia's Law AI Assistant")

# Introductory info box
st.markdown("""
<div style='   
    margin-bottom: 24px;
    padding: 26px 28px 20px 28px;
    background: #e7f3fc;
    border-radius: 14px;
    border-left: 7px solid #2574a9;
    color: #184361;
    font-size: 1.08rem;
    box-shadow: 0 1px 8px #eef4fa;
    line-height: 1.7;
'>
  <b style='font-size: 1.13rem;'>ℹ️  This assistant ONLY uses information from your uploaded documents and 
  <span style="color:#1c853b;">preloaded default context</span>
  <span style="font-weight:500; font-size: 1.01rem;'">
    (such as your CV and course info—already included,
    <u>no need to upload</u>).
  </span>
  </b>
  <div style='height: 14px;'></div>
  <ul style="margin-left: 1.1em; margin-bottom: 0.5em;">
    <li>
      If the answer is <b>not present</b> in your documents or the preloaded context, it will let you know.
    </li>
    <li style="margin-top: 8px;">
      <span style="color:#d97706; font-weight:600;">It will <u>not</u> invent or make up any information.</span>
    </li>
    <li style="margin-top: 8px;">
      You can upload multiple files at once, and their content will be <b>combined</b> for answering your questions.
    </li>
  </ul>
  <div style='height: 7px;'></div>
  <b>✨ Tip:</b> For best results, upload documents that contain the details you want to ask about.
</div>
""", unsafe_allow_html=True)

# Quick Tips section
st.markdown("## 🎯 Quick Tips")
st.markdown("""
| **Command**     | **What it Does**                       | **Scope**            |
| --------------- | -------------------------------------- | -------------------- |
| `remember:`     | Store a fact **permanently**           | Across all sessions  |
| `memo:`         | Store a fact **for this session only** | Single session       |
| `role:`         | Set your assistant’s **persona/role**  | N/A                  |

> **How to use:**  
> Just start your line with the prefix above—no extra formatting needed.
"" ")
""")

# File uploader
uploaded_files = st.sidebar.file_uploader(
    "Upload PDF or text files", type=["pdf","txt"], accept_multiple_files=True
)

# Build vector store
default_index  = load_and_index_defaults()
uploaded_docs  = load_uploaded_files(uploaded_files)
memory_docs    = [type("Doc", (), {"page_content": f})() for f in st.session_state.memory_facts]
dynamic_docs   = uploaded_docs + memory_docs

vector_store = build_vectorstore(default_index, dynamic_docs)
retriever    = vector_store.as_retriever()
llm          = ChatOpenAI(api_key=api_key, model="gpt-4o-mini", temperature=0.0)

# Check for any available context
default_folder = "default_context"
default_files = []
if os.path.exists(default_folder):
    default_files = [
        f for f in os.listdir(default_folder)
        if f.lower().endswith((".pdf", ".txt"))
    ]
has_any_context = bool(default_files) or bool(uploaded_docs) or bool(st.session_state.memory_facts)

# Main Chat Interface
if not has_any_context:
    st.info("📂 Upload docs or add facts to get started.")
else:
    st.success("✅ Ready! Ask a question or enter a command below.")
    user_input = st.chat_input("Type a question or use `remember:`, `memo:`, `role:`…")
    if user_input:
        txt = user_input.strip()
        low = txt.lower()

        # Intercept special commands
        if low.startswith("remember:"):
            fact = txt.split(":",1)[1].strip()
            st.session_state.memory_facts.append(fact)
            st.success("✅ Fact remembered permanently.")
            st.experimental_rerun()

        if low.startswith("memo:"):
            fact = txt.split(":",1)[1].strip()
            st.session_state.session_facts.append(fact)
            st.info("ℹ️ Session-only fact added.")
            st.experimental_rerun()

        if low.startswith("role:"):
            persona = txt.split(":",1)[1].strip()
            st.session_state.persona = persona
            st.success(f"👤 Persona set to: {persona}")
            st.experimental_rerun()

        # Otherwise, treat as a normal query
        docs = retriever.invoke(txt)
        context = "\n\n".join(d.page_content for d in docs)

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
        messages.append(HumanMessage(content=txt))

        # Make sure we have something to answer from
        if not (context or st.session_state.memory_facts or st.session_state.session_facts):
            st.warning("⚠️ Sorry, there is not enough information to answer your request.")
        else:
            resp = llm.invoke(messages)
            st.session_state.chat_history.append(("User", txt))
            st.session_state.chat_history.append(("Assistant", resp.content))

    # Render chat history
    for speaker, text in st.session_state.chat_history:
        role = "user" if speaker == "User" else "assistant"
        st.chat_message(role).write(text)
