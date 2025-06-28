# ───────────────────────── law_ai_assistant_advanced.py (v1.4) ─────────────────────────
"""
Self-contained Streamlit RAG app for law-exam prep that works on **any** recent
LangChain version (≥0.1) with *no version pin* headaches.

Key points
──────────
• Universal import shim for `BM25Retriever` and `EnsembleRetriever`; falls back
to dense-only retrieval if either class is missing.
• Structure-aware chunking, optional hybrid BM25, optional cross-encoder
re-rank, IRAC answer scaffold, OCR for images, citation validator.
• Zero reliance on `.to_openai()` – we convert messages manually.

Run:
    pip install streamlit openai python-dotenv pillow pytesseract faiss-cpu \
                langchain langchain-openai sentence-transformers rank_bm25 \
                unstructured[all-docs,powerpoint]
    streamlit run law_ai_assistant_advanced.py
"""

import os, io, re, base64, tempfile
from typing import List, Dict, Union

import streamlit as st
from dotenv import load_dotenv
from PIL import Image
import pytesseract

from openai import OpenAI

from langchain_openai import OpenAIEmbeddings
from langchain_community.vectorstores import FAISS
from langchain_community.document_loaders import (
    PyPDFLoader, UnstructuredPowerPointLoader, Docx2txtLoader,
    UnstructuredWordDocumentLoader, TextLoader, CSVLoader, UnstructuredImageLoader,
)
from langchain_core.documents import Document
from langchain.text_splitter import RecursiveCharacterTextSplitter
from langchain_core.messages import SystemMessage, HumanMessage

# ════════════ 1. UNIVERSAL IMPORT SHIM ═══════════════════════════════════════════════════

def _import(cls_name: str):
    """Try community → core paths; return class or None."""
    for path in ("langchain_community.retrievers", "langchain.retrievers"):
        try:
            module = __import__(path, fromlist=[cls_name])
            return getattr(module, cls_name)
        except (ImportError, AttributeError):
            continue
    return None

BM25Retriever     = _import("BM25Retriever")
EnsembleRetriever = _import("EnsembleRetriever")

# Optional cross-encoder
try:
    from sentence_transformers import CrossEncoder  # type: ignore
except ImportError:
    CrossEncoder = None

# ════════════ 2. ENV & CLIENT ════════════════════════════════════════════════════════════
load_dotenv()
OPENAI_API_KEY = os.getenv("OPENAI_API_KEY")
if not OPENAI_API_KEY:
    st.error("OPENAI_API_KEY not set")
    st.stop()

client = OpenAI(api_key=OPENAI_API_KEY)
EMBED_MODEL = "text-embedding-3-small"
LLM_MODEL   = "gpt-4o-mini"

# ════════════ 3. CONSTANTS ═══════════════════════════════════════════════════════════════
CTX_DIR   = "default_context"
CHUNK_SZ  = 900
CHUNK_OV  = 120
FIRST_K   = 20
FINAL_K   = 6

# ════════════ 4. HELPERS ════════════════════════════════════════════════════════════════
SEC_PAT = re.compile(r"^(Section|Article|Clause|§)\s+\d+[\w.\-]*", re.I)

def split_legal(text: str) -> List[str]:
    lines, buf, out = text.splitlines(), [], []
    for ln in lines:
        if SEC_PAT.match(ln) and buf:
            out.append("\n".join(buf)); buf = [ln]
        else:
            buf.append(ln)
    if buf: out.append("\n".join(buf))
    splitter = RecursiveCharacterTextSplitter(chunk_size=CHUNK_SZ, chunk_overlap=CHUNK_OV)
    chunks = []
    for sect in out: chunks.extend(splitter.split_text(sect))
    return chunks

LOADER_MAP = {
    "pdf":  PyPDFLoader,
    "docx": Docx2txtLoader,
    "doc":  UnstructuredWordDocumentLoader,
    "pptx": UnstructuredPowerPointLoader,
    "csv":  CSVLoader,
    "txt":  TextLoader,
    "png":  UnstructuredImageLoader,
    "jpg":  UnstructuredImageLoader,
    "jpeg": UnstructuredImageLoader,
}

def load_and_split(path: str) -> List[Document]:
    ext = path.lower().split(".")[-1]
    loader_cls = LOADER_MAP.get(ext)
    if not loader_cls:
        return []
    docs = loader_cls(path).load()
    out = []
    for d in docs:
        meta = d.metadata or {}; meta["source_file"] = os.path.basename(path)
        for chunk in split_legal(d.page_content):
            out.append(Document(page_content=chunk, metadata=meta))
    return out

@st.cache_resource(show_spinner=False)
def base_corpus_vs():
    corpus = []
    if os.path.exists(CTX_DIR):
        for fn in os.listdir(CTX_DIR):
            corpus.extend(load_and_split(os.path.join(CTX_DIR, fn)))
    vs = FAISS.from_documents(corpus, OpenAIEmbeddings(model=EMBED_MODEL))
    return corpus, vs

@st.cache_resource(show_spinner=False)
def get_cross_encoder():
    if CrossEncoder is None:
        return None
    try:
        return CrossEncoder("mixedbread-ai/mxbai-rerank-base-v1")
    except Exception:
        st.warning("Cross-encoder weights unavailable – skipping re-rank.")
        return None


def hybrid_retriever(vs: FAISS, docs: List[Document]):
    dense = vs.as_retriever(search_kwargs={"k": FIRST_K})
    if not (BM25Retriever and EnsembleRetriever):
        return dense  # fallback
    bm25 = BM25Retriever.from_texts([d.page_content for d in docs]) if BM25Retriever else None
    if not bm25:
        return dense
    return EnsembleRetriever(retrievers=[dense, bm25], weights=[0.7, 0.3])


def rerank(query: str, docs: List[Document]) -> List[Document]:
    ce = get_cross_encoder()
    if not ce or not docs:
        return docs[:FINAL_K]
    scores = ce.predict([[query, d.page_content] for d in docs])
    for d, s in zip(docs, scores):
        d.metadata["ce_score"] = float(s)
    return sorted(docs, key=lambda d: d.metadata["ce_score"], reverse=True)[:FINAL_K]


def ocr_bytes(data: bytes) -> str:
    try:
        img = Image.open(io.BytesIO(data))
        return pytesseract.image_to_string(img)
    except Exception:
        return ""


def uncited_sents(txt: str) -> List[str]:
    return [s for s in re.split(r"(?<=[.!?])\s+", txt) if s.strip() and "[#" not in s]


def lc_to_dict(msg: Union[SystemMessage, HumanMessage]) -> Dict:
    if isinstance(msg.content, list):
        return {"role": "user", "content": msg.content}
    role = "system" if isinstance(msg, SystemMessage) else "user"
    return {"role": role, "content": msg.content}

# ════════════ 5. STREAMLIT UI ════════════════════════════════════════════════════════════
st.set_page_config("Law AI Assistant", "⚖️")
st.title("⚖️ Law AI Assistant (no-pins edition)")

uploaded_docs = st.sidebar.file_uploader("Upload legal docs", type=list(LOADER_MAP.keys()), accept_multiple_files=True)
image_file    = st.sidebar.file_uploader("Optional image / chart", type=["png","jpg","jpeg"])
query         = st.chat_input("Ask or use remember:/memo:/role:")

for k, d in {"perm":[], "sess":[], "persona":None, "hist":[]}.items():
    st.session_state.setdefault(k, d)

# ════════════ 6. MAIN LOOP ═══════════════════════════════════════════════════════════════
if query:
    txt = query.strip(); low = txt.lower()

    # Commands
    if low.startswith("remember:"):
        st.session_state.perm.append(txt.partition(":")[2].strip())
        st.session_state.hist.append(("assistant", "✅ Remembered.")); st.rerun()
    elif low.startswith("memo:"):
        st.session_state.sess.append(txt.partition(":")[2].strip())
        st.session_state.hist.append(("assistant", "🗒️ Noted (session).")); st.rerun()
    elif low.startswith("role:"):
        st.session_state.persona = txt.partition(":")[2].strip()
        st.session_state.hist.append(("assistant", f"👤 Persona set → {st.session_state.persona}")); st.rerun()

    # Question answering
    else:
        corpus, vs = base_corpus_vs()
        # dynamic uploads
        if uploaded_docs:
            tmp = tempfile.mkdtemp(); new_docs = []
            for uf in uploaded_docs:
                p = os.path.join(tmp, uf.name); open(p, "wb").write(uf.getbuffer())
                new_docs.extend(load_and_split(p))
            vs.add_documents(new_docs); corpus.extend(new_docs)

        retriever = hybrid_retriever(vs, corpus)
        initial_hits = retriever.invoke(txt)
        top_docs = rerank(txt, initial_hits)

        # Image branch
        ocr_text = ""; img_payload = None
        if image_file:
            b = image_file.getvalue(); ocr_text = ocr_bytes(b)
            img_payload = {"type":"image_url","image_url":{"url":f"data:image/png;base64,{base64.b64encode(b).decode()}"}}

        # Snippets
        snippets = []
        for i, d in enumerate(top_docs, 1):
            snippet = re.sub(r"\s+"," ", d.page_content)[:1000]
            src = d.metadata.get("source_file","doc")
            snippets.append(f"[#${i}] ({src}) {snippet}")

        sys = "You are a meticulous legal assistant. Answer in IRAC format. Cite snippets [#n]. If info missing, say so."
        if st.session_state.persona: sys += f" Adopt persona: {st.session_state.persona}."

        msgs: List[Union[SystemMessage, HumanMessage]] = [SystemMessage(content=sys)]
        if snippets:
            msgs.append(SystemMessage(content="Snippets:\n"+"\n\n".join(snippets)))
        for f in st.session_state.perm + st.session_state.sess:
            msgs.append(SystemMessage(content=f"Fact: {f}"))
        if ocr_text.strip(): msgs.append(SystemMessage(content=f"OCR:\n{ocr_text.strip()}"))
        # user
        if img_payload:
            msgs.append(HumanMessage(content=[{"type":"text","text":txt}, img_payload]))
        else:
            msgs.append(HumanMessage(content=txt))

        with st.spinner("Thinking …"):
            resp = client.chat.completions.create(
                model=LLM_MODEL,
                messages=[lc_to_dict(m) for m in msgs],
                temperature=0.0,
                max_tokens=800,
            )
        answer = resp.choices[0].message.content.strip()
        if uncited_sents(answer):
            st.warning("⚠️ Some statements may lack citations – review recommended.")

        st.session_state.hist.append(("user", txt))
        st.session_state.hist.append(("assistant", answer))

# Render chat
for role, msg in st.session_state.hist:
    st.chat_message(role).write(msg)
