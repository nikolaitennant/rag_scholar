import streamlit as st
import requests
import json
import base64
from dotenv import load_dotenv
from openai import OpenAI
from langchain_openai import ChatOpenAI, OpenAIEmbeddings
from langchain_community.vectorstores import FAISS
from langchain_community.document_loaders import PyPDFLoader
from langchain.document_loaders import (
    Docx2txtLoader,
    UnstructuredWordDocumentLoader,
    UnstructuredPowerPointLoader,
    CSVLoader,
    TextLoader,
    UnstructuredImageLoader
)
from langchain_core.messages import SystemMessage, HumanMessage
import os
import tempfile

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
    if session_docs:
        embeddings = OpenAIEmbeddings(api_key=api_key)
        return FAISS.from_documents(default_docs + session_docs, embeddings)
    return default_index

# ─── Streamlit UI setup ───────────────────────────────────────────────────
st.set_page_config(page_title="Giulia's AI Law Assistant", page_icon="🤖")
st.title("🤖 Giulia's AI Law Assistant")

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

upload_mode = st.sidebar.radio("Save conversation for later?:", ("No, this session only", "Yes, remember for next time"), index=0)
mode = st.sidebar.radio("Media Type:", ("Text only", "Image/Chart"), index=0)
inline_files = st.sidebar.file_uploader("Upload document:", type=["pdf","txt","docx","doc","pptx","csv"], accept_multiple_files=True)
image_file = st.sidebar.file_uploader("Upload image/chart:", type=["png","jpg","jpeg"])

if upload_mode == "Yes, remember for next time" and inline_files:
    os.makedirs("default_context", exist_ok=True)
    for f in inline_files:
        dest = os.path.join("default_context", f.name)
        if not os.path.exists(dest):
            with open(dest, "wb") as out:
                out.write(f.getbuffer())
    st.sidebar.success("✅ Documents saved for future sessions.")

st.markdown("""
<div class="info-box" style='margin:24px 0; padding:20px; background:#e7f3fc; border-left:7px solid #2574a9; color:#184361; border-radius:14px;'>
  <b style='font-size:1.13rem;'>ℹ️ How this assistant works:</b>
  <ul style='margin-left:1.1em; margin-top:12px;'>
    <li>📄 <b>Only your documents:</b> I read and answer using just the files you upload plus any built-in context. I don’t look up anything on the web.</li>
    <li>❓ <b>No surprises:</b> If the answer isn’t in your docs, I’ll tell you I don’t have enough information instead of making stuff up.</li>
    <li>📂 <b>All your files:</b> You can upload as many PDFs, Word docs, slides, spreadsheets, or images as you need—I'll consider them all together.</li>
  </ul>
  <b>✨ Tip:</b> To get the best answers, upload any notes, reports, or visuals related to your question so I have the full picture.
</div>
""", unsafe_allow_html=True)

# ─── Build or update RAG index ────────────────────────────────────────────
default_docs, default_index = load_and_index_defaults()
session_docs = load_uploaded_files(inline_files)
vector_store = build_vectorstore(default_docs, default_index, session_docs)
retriever = vector_store.as_retriever()
chat_llm = ChatOpenAI(api_key=api_key, model="gpt-4o-mini", temperature=0.0)

# ─── Chat handler ─────────────────────────────────────────────────────────
user_input = st.chat_input("Type a question or use `remember:`, `memo:`, `role:`…")
if user_input:
    txt = user_input.strip()
    low = txt.lower()

    # ─ Vision branch ─────────────────────────
    if mode == "Image/Chart" and image_file:
        img_bytes = image_file.read()
        b64 = base64.b64encode(img_bytes).decode()
        ext = image_file.name.split('.')[-1]
        data_url = f"data:image/{ext};base64,{b64}"

        payload = {
            "model": "gpt-4o-mini",
            "messages": [
                {
                    "role": "user",
                    "content": [
                        {"type": "text",      "text": txt},
                        {"type": "image_url", "image_url": {"url": data_url}}
                    ]
                }
            ],
            "max_tokens": 300
        }
        headers = {"Authorization": f"Bearer {api_key}", "Content-Type": "application/json"}
        resp = requests.post("https://api.openai.com/v1/chat/completions", headers=headers, json=payload)
        if resp.status_code != 200:
            assistant_msg = f"⚠️ Vision API error {resp.status_code}: {resp.text}"
        else:
            assistant_msg = resp.json()["choices"][0]["message"]["content"]

        st.session_state.chat_history.append(("User", txt))
        st.session_state.chat_history.append(("Assistant", assistant_msg))

    # ─ Command branches ───────────────────────
    elif low.startswith("remember:"):
        fact = txt.split(":", 1)[1].strip()
        st.session_state.memory_facts.append(fact)
        # only the assistant confirmation goes into chat_history:
        st.session_state.chat_history.append(("Assistant", "✅ Fact remembered permanently."))

    elif low.startswith("memo:"):
        fact = txt.split(":", 1)[1].strip()
        st.session_state.session_facts.append(fact)
        st.session_state.chat_history.append(("Assistant", "ℹ️ Session-only fact added."))

    elif low.startswith("role:"):
        persona = txt.split(":", 1)[1].strip()
        st.session_state.persona = persona
        st.session_state.chat_history.append(("Assistant", f"👤 Persona set: {persona}"))

    # ─ RAG / LLM branch ───────────────────────
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

# ─── Render the chat history ───────────────────────────────────────────────
for speaker, text in st.session_state.chat_history:
    role = "user" if speaker == "User" else "assistant"
    st.chat_message(role).write(text)
