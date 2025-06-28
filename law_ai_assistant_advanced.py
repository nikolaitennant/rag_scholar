# ────────────────────────────── law_ai_assistant_advanced.py ──────────────────────────────
"""
Improved RAG pipeline for law-exam prep.
Adds structure-aware chunking, hybrid (dense+BM25) retrieval, cross-encoder
re-ranking, IRAC scaffolding, and a citation validator – building on the
previous single-file Streamlit app.

Run with:
    streamlit run law_ai_assistant_advanced.py
Requires packages in requirements_advanced.txt (see README / chat).
"""

# ── Imports ───────────────────────────────────────────────────────────────────────────────
import os, io, re, base64, tempfile, uuid
from typing import List, Tuple

import streamlit as st
from dotenv import load_dotenv
from PIL import Image
import pytesseract

from openai import OpenAI

from langchain_openai import OpenAIEmbeddings
from langchain_community.vectorstores import FAISS
from langchain_community.document_loaders import (
    PyPDFLoader, UnstructuredPowerPointLoader, Docx2txtLoader,
    UnstructuredWordDocumentLoader, TextLoader, CSVLoader,
    UnstructuredImageLoader
)
from langchain.text_splitter import RecursiveCharacterTextSplitter
from langchain.retrievers import BM25Retriever, EnsembleRetriever

# cross-encoder re-ranker (tiny version – swap for bge-reranker-large if RAM allows)
from sentence_transformers import CrossEncoder

from langchain_core.messages import SystemMessage, HumanMessage

# ── Environment & OpenAI client ───────────────────────────────────────────────────────────
load_dotenv()
OPENAI_API_KEY = os.getenv("OPENAI_API_KEY")
if not OPENAI_API_KEY:
    st.error("OPENAI_API_KEY not set")
    st.stop()
client = OpenAI(api_key=OPENAI_API_KEY)
EMBED_MODEL = "text-embedding-3-small"
LLM_MODEL   = "gpt-4o-mini"

# ── Constants ─────────────────────────────────────────────────────────────────────────────
CTX_DIR = "default_context"
CHUNK_SZ = 900
CHUNK_OV = 120
DENSE_K  = 20            # first-pass candidates
FINAL_K  = 6             # after re-rank

# ── Structure-aware chunker ───────────────────────────────────────────────────────────────
SEC_PAT = re.compile(r"^(Section|Article|Clause|§)\s+\d+[A-Za-z0-9.\-]*", re.I)

def structure_aware_split(doc_text: str) -> List[str]:
    """Split on legal headings if present, else fallback to size-based chunks."""
    lines = doc_text.splitlines()
    chunks, buff = [], []
    for ln in lines:
        if SEC_PAT.match(ln) and buff:
            chunks.append("\n".join(buff))
            buff = [ln]
        else:
            buff.append(ln)
    if buff:
        chunks.append("\n".join(buff))
    # secondary split for oversize pieces
    splitter = RecursiveCharacterTextSplitter(chunk_size=CHUNK_SZ, chunk_overlap=CHUNK_OV)
    out = []
    for ch in chunks:
        out.extend(splitter.split_text(ch))
    return out

# ── Loaders ───────────────────────────────────────────────────────────────────────────────
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
        # attach filename metadata for better citations
        meta = d.metadata or {}
        meta.update({"source_file": os.path.basename(path)})
        for chunk in structure_aware_split(d.page_content):
            out.append(chunk)
    return out

# ── Build base index (cached) ─────────────────────────────────────────────────────────────
@st.cache_resource(show_spinner=False)
def base_index_and_docs():
    base_docs = []
    if os.path.exists(CTX_DIR):
        for f in os.listdir(CTX_DIR):
            base_docs.extend(load_and_split(os.path.join(CTX_DIR, f)))
    embeddings = OpenAIEmbeddings(model=EMBED_MODEL)
    vs = FAISS.from_texts(base_docs, embeddings)
    return base_docs, vs

# ── Cross-encoder instance ────────────────────────────────────────────────────────────────
@st.cache_resource(show_spinner=False)
def cross_encoder_model():
    return CrossEncoder("mixedbread-ai/mxbai-rerank-base-v1")

# ── Retrieval pipeline helpers ────────────────────────────────────────────────────────────

def make_hybrid_retriever(dense_vs: FAISS, all_docs: List[str]):
    dense = dense_vs.as_retriever(search_kwargs={"k": DENSE_K})
    bm25  = BM25Retriever.from_texts(all_docs)
    return EnsembleRetriever(retrievers=[dense, bm25], weights=[0.7, 0.3])


def rerank(query: str, docs) -> List:
    """Use cross-encoder re-ranker to sort docs by semantic relevance."""
    model = cross_encoder_model()
    pairs = [[query, d.page_content] for d in docs]
    scores = model.predict(pairs)
    for d, s in zip(docs, scores):
        d.metadata["rerank_score"] = float(s)
    return sorted(docs, key=lambda x: x.metadata["rerank_score"], reverse=True)[:FINAL_K]

# ── OCR helper ────────────────────────────────────────────────────────────────────────────

def ocr_image(bytes_: bytes) -> str:
    try:
        img = Image.open(io.BytesIO(bytes_))
        return pytesseract.image_to_string(img)
    except Exception:
        return ""

# ── Citation validator ────────────────────────────────────────────────────────────────────

def uncited_sentences(txt: str) -> List[str]:
    sents = re.split(r"(?<=[.!?])\s+", txt)
    return [s for s in sents if s.strip() and "[#" not in s]

# ── Streamlit UI ──────────────────────────────────────────────────────────────────────────
st.set_page_config("Law AI Assistant – Advanced", "⚖️")
st.title("⚖️ Law AI Assistant – Advanced")

uploaded_docs = st.sidebar.file_uploader("Upload legal documents", type=list(LOADER_MAP.keys()), accept_multiple_files=True)
image_file    = st.sidebar.file_uploader("Optional image/chart", type=["png","jpg","jpeg"])
query         = st.chat_input("Ask a question or use commands (remember:/memo:/role:)")

# session-state scaffolding
for k, d in {"perm":[], "sess":[], "persona":None, "hist":[]}.items():
    st.session_state.setdefault(k, d)

# ── Command handler ───────────────────────────────────────────────────────────────────────
if query:
    txt = query.strip()
    low = txt.lower()

    if low.startswith("remember:"):
        fact = txt.partition(":")[2].strip()
        st.session_state.perm.append(fact)
        st.session_state.hist.append(("assistant", "✅ Remembered."))
        st.rerun()

    elif low.startswith("memo:"):
        fact = txt.partition(":")[2].strip()
        st.session_state.sess.append(fact)
        st.session_state.hist.append(("assistant", "🗒️ Noted for this session."))
        st.rerun()

    elif low.startswith("role:"):
        st.session_state.persona = txt.partition(":")[2].strip()
        st.session_state.hist.append(("assistant", f"👤 Persona set → {st.session_state.persona}"))
        st.rerun()

    else:
        # ── Build / merge corpus ──────────────────────────────────────────────────────────
        base_docs, base_vs = base_index_and_docs()
        extra_docs = []
        if uploaded_docs:
            tmp = tempfile.mkdtemp()
            for uf in uploaded_docs:
                p = os.path.join(tmp, uf.name)
                with open(p, "wb") as out:
                    out.write(uf.getbuffer())
                extra_docs.extend(load_and_split(p))
            # add to index
            base_vs.add_texts(extra_docs)
            base_docs.extend(extra_docs)

        retriever = make_hybrid_retriever(base_vs, base_docs)
        initial_hits = retriever.invoke(txt)
        top_docs = rerank(txt, initial_hits)

        # OCR if image supplied
        ocr_text = ""
        if image_file:
            ocr_text = ocr_image(image_file.getvalue())

        # format snippets
        snippets = []
        for i, d in enumerate(top_docs, 1):
            snippet = re.sub(r"\s+", " ", d.page_content)[:1000]
            src = d.metadata.get("source_file", "doc")
            snippets.append(f"[#${i}] ({src}) {snippet}")

        # ── Prompt build ───────────────────────────────────────────────────────────────────
        sys = (
            "You are a meticulous legal assistant. \n"  # core role
            "Answer using IRAC format (Issue, Rule, Application, Conclusion).\n"
            "Every statement in Rule or Application MUST end with a snippet citation like [#2].\n"
            "If information is missing, say so; never fabricate cases or statutes."
        )
        if st.session_state.persona:
            sys += f" Adopt this persona: {st.session_state.persona}."

        messages = [SystemMessage(content=sys)]
        if snippets:
            messages.append(SystemMessage(content="Snippets:\n" + "\n\n".join(snippets)))
        for f in st.session_state.perm + st.session_state.sess:
            messages.append(SystemMessage(content=f"Fact: {f}"))
        if ocr_text.strip():
            messages.append(SystemMessage(content=f"OCR:\n{ocr_text.strip()}"))
        messages.append(HumanMessage(content=txt))

        # add multimodal image if present
        if image_file:
            img64 = base64.b64encode(image_file.getvalue()).decode()
            messages[-1].content = [
                {"type": "text", "text": txt},
                {"type": "image_url", "image_url": {"url": f"data:image/png;base64,{img64}"}}
            ]

        with st.spinner("Thinking…"):
            resp = client.chat.completions.create(
                model=LLM_MODEL,
                messages=[m.to_openai() for m in messages],
                temperature=0.0,
                max_tokens=800,
            )
        ans = resp.choices[0].message.content.strip()

        # post-answer citation audit
        missing = uncited_sentences(ans)
        if missing:
            st.warning("⚠️ Some statements lack citations – double-check: " + "; ".join(missing[:3]))

        # save & render
        st.session_state.hist.append(("user", txt))
        st.session_state.hist.append(("assistant", ans))

# ── Chat history display ─────────────────────────────────────────────────────────────────
for role, msg in st.session_state.hist:
    st.chat_message(role).write(msg)
