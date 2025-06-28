# ────────────────────────────── law_ai_assistant_advanced.py ──────────────────────────────
"""
Improved RAG pipeline for law‑exam prep (v1.2).

Fixes the crash:
    AttributeError: 'SystemMessage' object has no attribute 'to_openai'
by converting LangChain messages → OpenAI‑SDK dicts manually.
Also:
• Updates BM25 import path to `langchain_community.retrievers` (removes deprecation warnings).
• Keeps graceful fallback when *rank_bm25* is missing.
"""

# ── Imports ───────────────────────────────────────────────────────────────────────────────
import os, io, re, base64, tempfile
from typing import List, Dict, Union

import streamlit as st
from dotenv import load_dotenv
from PIL import Image
import pytesseract

from openai import OpenAI

# ── Universal LangChain import shim ─────────────────────────────
# Works on both pre-v0.3.27 and newer “community” split builds.
def _import_retrievers():
    try:                                # ≥ 0.3.27
        from langchain_community.retrievers import BM25Retriever, EnsembleRetriever
    except ImportError:
        try:                            # 0.2 – 0.3.26
            from langchain.retrievers import BM25Retriever, EnsembleRetriever
        except ImportError:
            # BM25 not available (rank_bm25 wheel missing)
            from langchain.retrievers import EnsembleRetriever  # type: ignore
            BM25Retriever = None
    return BM25Retriever, EnsembleRetriever

BM25Retriever, EnsembleRetriever = _import_retrievers()
# ────────────────────────────────────────────────────────────────
from langchain_openai import OpenAIEmbeddings
from langchain_community.vectorstores import FAISS
from langchain_community.document_loaders import (
    PyPDFLoader, UnstructuredPowerPointLoader, Docx2txtLoader,
    UnstructuredWordDocumentLoader, TextLoader, CSVLoader,
    UnstructuredImageLoader,
)
from langchain.text_splitter import RecursiveCharacterTextSplitter

from sentence_transformers import CrossEncoder
from langchain_core.messages import SystemMessage, HumanMessage

# ── Environment ───────────────────────────────────────────────────────────────────────────
load_dotenv()
OPENAI_API_KEY = os.getenv("OPENAI_API_KEY")
if not OPENAI_API_KEY:
    st.error("OPENAI_API_KEY not set.")
    st.stop()

client = OpenAI(api_key=OPENAI_API_KEY)
EMBED_MODEL = "text-embedding-3-small"
LLM_MODEL   = "gpt-4o-mini"

# ── Constants ─────────────────────────────────────────────────────────────────────────────
CTX_DIR  = "default_context"
CHUNK_SZ = 900
CHUNK_OV = 120
DENSE_K  = 20   # first‑pass hits
FINAL_K  = 6    # after cross‑encoder

# ── Structure‑aware chunker ───────────────────────────────────────────────────────────────
SEC_PAT = re.compile(r"^(Section|Article|Clause|§)\s+\d+[A-Za-z0-9.\-]*", re.I)

def structure_aware_split(text: str) -> List[str]:
    """Split on legal headings; fallback to size chunks."""
    lines, buffer, chunks = text.splitlines(), [], []
    for ln in lines:
        if SEC_PAT.match(ln) and buffer:
            chunks.append("\n".join(buffer))
            buffer = [ln]
        else:
            buffer.append(ln)
    if buffer:
        chunks.append("\n".join(buffer))
    splitter = RecursiveCharacterTextSplitter(chunk_size=CHUNK_SZ, chunk_overlap=CHUNK_OV)
    out = []
    for ch in chunks:
        out.extend(splitter.split_text(ch))
    return out

# ── File loaders ──────────────────────────────────────────────────────────────────────────
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

def load_and_split(path: str):
    ext = path.lower().split(".")[-1]
    loader_cls = LOADER_MAP.get(ext)
    if not loader_cls:
        return []
    docs = loader_cls(path).load()
    out = []
    for d in docs:
        meta = d.metadata or {}
        meta["source_file"] = os.path.basename(path)
        for chunk in structure_aware_split(d.page_content):
            out.append(type(d)(page_content=chunk, metadata=meta))
    return out

# ── Corpus & embedding store (cached) ─────────────────────────────────────────────────────
@st.cache_resource(show_spinner=False)
def base_corpus_vs():
    docs = []
    if os.path.exists(CTX_DIR):
        for f in os.listdir(CTX_DIR):
            docs.extend(load_and_split(os.path.join(CTX_DIR, f)))
    vs = FAISS.from_documents(docs, OpenAIEmbeddings(model=EMBED_MODEL))
    return docs, vs

# ── Cross‑encoder (cached) ────────────────────────────────────────────────────────────────
@st.cache_resource(show_spinner=False)
def cross_encoder_model():
    return CrossEncoder("mixedbread-ai/mxbai-rerank-base-v1")

# ── Retrieval helpers ─────────────────────────────────────────────────────────────────────

def make_hybrid_retriever(dense_vs: FAISS, docs: List[str]):
    dense = dense_vs.as_retriever(search_kwargs={"k": DENSE_K})
    if BM25Retriever is None:
        st.warning("rank_bm25 not installed – using dense‑only retrieval. Run `pip install rank_bm25` for best results.")
        return dense
    bm25 = BM25Retriever.from_texts(docs)
    return EnsembleRetriever(retrievers=[dense, bm25], weights=[0.7, 0.3])

def rerank(query: str, docs):
    ce = cross_encoder_model()
    scores = ce.predict([[query, d.page_content] for d in docs])
    for d, s in zip(docs, scores):
        d.metadata["ce_score"] = float(s)
    return sorted(docs, key=lambda d: d.metadata["ce_score"], reverse=True)[:FINAL_K]

# ── OCR ───────────────────────────────────────────────────────────────────────────────────

def ocr_bytes(data: bytes) -> str:
    try:
        img = Image.open(io.BytesIO(data))
        return pytesseract.image_to_string(img)
    except Exception:
        return ""

# ── Citation validator ────────────────────────────────────────────────────────────────────

def find_uncited_sentences(text: str) -> List[str]:
    return [s for s in re.split(r"(?<=[.!?])\s+", text) if s.strip() and "[#" not in s]

# ── Streamlit UI ──────────────────────────────────────────────────────────────────────────
st.set_page_config("Law AI Assistant – Advanced", "⚖️")
st.title("⚖️ Law AI Assistant  v1.2")

uploaded_docs = st.sidebar.file_uploader("Upload legal documents", type=list(LOADER_MAP), accept_multiple_files=True)
image_file    = st.sidebar.file_uploader("Optional image/chart", type=["png","jpg","jpeg"])
query         = st.chat_input("Ask a legal Q or use remember:/memo:/role:")

# Session state skeleton
for k, default in {"perm":[], "sess":[], "persona":None, "hist":[]}.items():
    st.session_state.setdefault(k, default)

# ── Helpers to convert LangChain message → OpenAI dict ────────────────────────────────
MessageDict = Dict[str, Union[str, List[Dict]]]

def lc_to_openai(msg) -> MessageDict:
    # Vision user message already a list of dicts
    if isinstance(msg.content, list):
        return {"role": "user", "content": msg.content}
    role = "system" if isinstance(msg, SystemMessage) else "user"
    if isinstance(msg, HumanMessage):
        role = "user"
    return {"role": role, "content": msg.content}

# ── Main interaction loop ───────────────────────────────────────────────────────────────
if query:
    text = query.strip()
    low  = text.lower()

    # ── Command branches ────────────────────────────────────────────────────────────────
    if low.startswith("remember:"):
        fact = text.partition(":")[2].strip()
        st.session_state.perm.append(fact)
        st.session_state.hist.append(("assistant", "✅ Fact remembered."))
        st.rerun()

    elif low.startswith("memo:"):
        fact = text.partition(":")[2].strip()
        st.session_state.sess.append(fact)
        st.session_state.hist.append(("assistant", "🗒️ Session memo stored."))
        st.rerun()

    elif low.startswith("role:"):
        st.session_state.persona = text.partition(":")[2].strip()
        st.session_state.hist.append(("assistant", f"👤 Persona set → {st.session_state.persona}"))
        st.rerun()

    # ── Q&A branch ───────────────────────────────────────────────────────────────────────
    else:
        base_docs, base_vs = base_corpus_vs()

        # add any newly uploaded docs
        if uploaded_docs:
            temp = tempfile.mkdtemp()
            new_docs = []
            for uf in uploaded_docs:
                tmp_path = os.path.join(temp, uf.name)
                with open(tmp_path, "wb") as fp:
                    fp.write(uf.getbuffer())
                new_docs.extend(load_and_split(tmp_path))
            base_vs.add_documents(new_docs)
            base_docs.extend(new_docs)

        retriever = make_hybrid_retriever(base_vs, base_docs)
        initial = retriever.invoke(text)
        top_docs = rerank(text, initial)

        # Vision branch -------------------------------------------------------------
        ocr_text = ocr_bytes(image_file.getvalue()) if image_file else ""

        snippets = []
        for i, d in enumerate(top_docs, 1):
            snippet = re.sub(r"\s+", " ", d.page_content)[:1000]
            src = d.metadata.get("source_file", "doc")
            snippets.append(f"[# {i}] ({src}) {snippet}")

        # build prompts -------------------------------------------------------------
        sys_prompt = (
            "You are a meticulous legal assistant. Answer using IRAC (Issue, Rule, Application, Conclusion). "
            "Every legal proposition must end with a bracket citation like [#3]. If information is missing, say so."
        )
        if st.session_state.persona:
            sys_prompt += f" Adopt this persona: {st.session_state.persona}."

        msgs = [SystemMessage(content=sys_prompt)]
        if snippets:
            msgs.append(SystemMessage(content="Snippets:\n" + "\n\n".join(snippets)))
        for fact in st.session_state.perm + st.session_state.sess:
            msgs.append(SystemMessage(content=f"Fact: {fact}"))
        if ocr_text.strip():
            msgs.append(SystemMessage(content=f"OCR:\n{ocr_text.strip()}"))
        msgs.append(HumanMessage(content=text))

        # If there is an image, replace the last HumanMessage content with multimodal list
        if image_file:
            img64 = base64.b64encode(image_file.getvalue()).decode()
            msgs[-1].content = [
                {"type": "text", "text": text},
                {"type": "image_url", "image_url": {"url": f"data:image/png;base64,{img64}"}},
            ]

        openai_messages = [lc_to_openai(m) for m in msgs]

        with st.spinner("Thinking …"):
            resp = client.chat.completions.create(
                model=LLM_MODEL,
                messages=openai_messages,
                temperature=0.0,
                max_tokens=900,
            )
        answer = resp.choices[0].message.content.strip()

        uncited = find_uncited_sentences(answer)
        if uncited:
            st.warning("⚠️ Sentences without citations: " + "; ".join(uncited[:3]))

        st.session_state.hist.append(("user", txt))
        st.session_state.hist.append(("assistant", answer))

# ── Render chat history ───────────────────────────────────────────────────────────────
for role, msg in st.session_state.hist:
    st.chat_message(role).write(msg)
