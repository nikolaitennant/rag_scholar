import streamlit as st
import openai
from dotenv import load_dotenv
from langchain_openai import ChatOpenAI, OpenAIEmbeddings
from langchain_community.vectorstores import FAISS
from langchain_community.document_loaders import TextLoader, PyPDFLoader
from langchain.document_loaders import (
    Docx2txtLoader,
    UnstructuredWordDocumentLoader,
    UnstructuredPowerPointLoader,
    CSVLoader,
    UnstructuredImageLoader
)
from langchain_core.messages import SystemMessage, HumanMessage
import os
import tempfile

# ─── Load env variables ────────────────────────────────────────────────────────
load_dotenv()
api_key = os.getenv("OPENAI_API_KEY")
openai.api_key = api_key

# ─── Initialize session state ─────────────────────────────────────────────────
for key in ("memory_facts", "session_facts", "chat_history"):
    if key not in st.session_state:
        st.session_state[key] = []
if "persona" not in st.session_state:
    st.session_state.persona = None

# ─── Helpers: load & index docs ───────────────────────────────────────────────
@st.cache_resource(show_spinner=False)
def load_and_index_defaults(folder="default_context"):
    """
    Load supported files from 'folder' and build FAISS index.
    Returns (docs_list, FAISS_index).
    """
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
            elif lower.endswith((".png", ".jpg", ".jpeg")):
                loader = UnstructuredImageLoader(path)
            elif lower.endswith(".txt"):
                loader = TextLoader(path)
            else:
                continue
            docs.extend(loader.load())
    embeddings = OpenAIEmbeddings(api_key=api_key)
    index = FAISS.from_documents(docs, embeddings)
    return docs, index


def load_uploaded_files(uploaded_files):
    """
    Load user-uploaded files into LangChain docs (in-memory).
    Supports PDF, TXT, DOC/DOCX, PPTX, CSV, PNG/JPG.
    """
    if not uploaded_files:
        return []
    tmp = tempfile.mkdtemp()
    docs = []
    for f in uploaded_files:
        lower = f.name.lower()
        if not lower.endswith((".pdf",".txt",".docx",".doc",".pptx",".csv",".png",".jpg",".jpeg")):
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
        elif lower.endswith((".png",".jpg",".jpeg")):
            loader = UnstructuredImageLoader(fp)
        else:
            loader = TextLoader(fp)
        docs.extend(loader.load())
    return docs


def build_vectorstore(default_docs, default_index, session_docs):
    """
    Rebuild FAISS index over default_docs + session_docs when uploads present; else return default_index.
    """
    if session_docs:
        embeddings = OpenAIEmbeddings(api_key=api_key)
        return FAISS.from_documents(default_docs + session_docs, embeddings)
    return default_index

# ─── Page config & title ─────────────────────────────────────────────────────
st.set_page_config(page_title="Giulia's Law AI Assistant", page_icon="🤖")
st.title("🤖 Giulia's Law AI Assistant")

# ─── Sidebar: uploader, image input & quick tips ─────────────────────────────
st.sidebar.header("📂 File Uploads & Tools")

# Mode toggle for doc uploads
upload_mode = st.sidebar.radio(
    "Upload scope:",
    ("Session only", "Persist across sessions"),
    index=0
)

# Document uploader
inline_files = st.sidebar.file_uploader(
    "Upload documents (for RAG):",
    type=["pdf","txt","docx","doc","pptx","csv"],
    accept_multiple_files=True,
    key="inline_uploader"
)

# Image uploader for GPT-Vision analysis
image_file = st.sidebar.file_uploader(
    "Upload image/chart (for vision):",
    type=["png","jpg","jpeg"],
    key="image_uploader"
)

# Quick Tips expander
with st.sidebar.expander("🎯 Quick Tips (commands & scope)", expanded=False):
    st.markdown("""
| **Command** | **What it Does**               | **Scope**           |
|------------:|--------------------------------|---------------------|
| `remember:` | Store a fact permanently       | Across sessions     |
| `memo:`     | Store a fact this session only | Single session      |
| `role:`     | Set the assistant’s persona    | N/A                 |
> Use **Session only** to avoid persisting docs across restarts.
""", unsafe_allow_html=True)

# Persist mode: copy docs into default_context
if upload_mode == "Persist across sessions" and inline_files:
    os.makedirs("default_context", exist_ok=True)
    for f in inline_files:
        dest = os.path.join("default_context", f.name)
        if not os.path.exists(dest):
            with open(dest, "wb") as out:
                out.write(f.getbuffer())
    st.sidebar.success("✅ Documents saved for future sessions.")

# ─── Introductory info box ────────────────────────────────────────────────────
st.markdown("""
<div style='margin-bottom:24px; padding:26px 28px; background:#e7f3fc; border-radius:14px; border-left:7px solid #2574a9; color:#184361; font-size:1.08rem; box-shadow:0 1px 8px #eef4fa; line-height:1.7;'>
  <b style='font-size:1.13rem;'>ℹ️ This assistant ONLY uses information from your uploaded documents and <span style='color:#1c853b;'>preloaded default context</span> (e.g., your CV & course info—already included).</b>
  <ul style='margin-left:1.1em; margin-top:12px;'>
    <li>If the answer is <b>not present</b> in your documents or context, it will let you know.</li>
    <li style='margin-top:8px;'><span style='color:#d97706; font-weight:600;'>It will <u>not</u> invent any information.</span></li>
    <li style='margin-top:8px;'>You can upload multiple files at once; their content is <b>combined</b> for answering.</li>
  </ul>
  <b>✨ Tip:</b> Upload documents that contain the details you want to ask about.
</div>
""", unsafe_allow_html=True)


st.markdown(
    """
    <style>
      .info-box {
        margin-bottom:24px;
        padding:26px 28px;
        background:#e7f3fc;
        border-radius:14px;
        border-left:7px solid #2574a9;
        color:#184361;
        font-size:1.08rem;
        box-shadow:0 1px 8px #eef4fa;
        line-height:1.7;
      }
      /* Dark‐mode overrides */
      @media (prefers-color-scheme: dark) {
        .info-box {
          background: #2b2b2b;
          color: #ddd;
          border-left-color: #bb86fc;
          box-shadow: 0 1px 8px rgba(0,0,0,0.5);
        }
        .info-box b { color: #fff; }
        .info-box a, .info-box span { color: #a0d6ff; }
      }
    </style>

    <div class="info-box">
      <b style='font-size:1.13rem;'>ℹ️ This assistant ONLY uses information from your uploaded documents and <span style='color:#1c853b;'>preloaded default context</span>.</b>
      <ul style='margin-left:1.1em; margin-top:12px;'>
        <li>If the answer is <b>not present</b> in your docs, it will let you know.</li>
        <li style='margin-top:8px;'><span style='color:#d97706; font-weight:600;'>It will <u>not</u> invent any information.</span></li>
        <li style='margin-top:8px;'>You can upload multiple files at once; their content is <b>combined</b> for answering.</li>
      </ul>
      <b>✨ Tip:</b> Upload documents that contain the details you want to ask about.
    </div>
    """,
    unsafe_allow_html=True,
)


# ─── Build vector store ───────────────────────────────────────────────────────
default_docs, default_index = load_and_index_defaults()
session_docs = load_uploaded_files(inline_files)
vector_store = build_vectorstore(default_docs, default_index, session_docs)
retriever = vector_store.as_retriever()
chat_llm = ChatOpenAI(api_key=api_key, model="gpt-4o-mini", temperature=0.0)

# ─── Handle user input & chat ────────────────────────────────────────────────
user_input = st.chat_input("Type a question or use `remember:`, `memo:`, `role:`…")
if user_input:
    txt = user_input.strip()
    low = txt.lower()

    # Image-analysis branch
    if image_file and low.startswith(("analyze image", "analyze graph", "interpret image", "what does this chart")):
        img_bytes = image_file.read()
        resp = openai.ChatCompletion.create(
            model="gpt-4o-mini-vision-preview",
            messages=[{"role":"user","content": txt}],
            files=[{"file": img_bytes, "filename": image_file.name}]
        )
        assistant_msg = resp.choices[0].message.content
        st.session_state.chat_history.append(("User", txt))
        st.session_state.chat_history.append(("Assistant", assistant_msg))

    # Command branches
    elif low.startswith("remember:"):
        st.session_state.memory_facts.append(txt.split(":",1)[1].strip())
        st.success("✅ Fact remembered permanently.")
    elif low.startswith("memo:"):
        st.session_state.session_facts.append(txt.split(":",1)[1].strip())
        st.info("ℹ️ Session-only fact added.")
    elif low.startswith("role:"):
        st.session_state.persona = txt.split(":",1)[1].strip()
        st.success(f"👤 Persona set: {st.session_state.persona}")

    # RAG (normal) branch
    else:
        docs = retriever.invoke(txt)
        context = "\n\n".join(d.page_content for d in docs)
        sys_prompt = (
            "You are a helpful legal assistant. Answer using provided context, remembered facts, "
            "and session facts. Do not invent information."
        )
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

# ─── Render chat history ───────────────────────────────────────────────────────
for speaker, text in st.session_state.chat_history:
    role = "user" if speaker == "User" else "assistant"
    st.chat_message(role).write(text)