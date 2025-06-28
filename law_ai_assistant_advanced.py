# ───────────────────────────── law_ai_assistant.py ─────────────────────────────
"""
Streamlit RAG assistant for law-exam prep, version-agnostic: no pin-chasing.

Features
────────
• Upload PDFs, DOC/DOCX, PPTX, CSV, TXT, PNG/JPG diagrams.
• Structure-aware chunking → FAISS embeddings (OpenAI).
• Optional hybrid (BM25 + dense) retrieval, optional cross-encoder re-rank.
• Image OCR + GPT-4o multimodal, IRAC answer scaffold, citation check.
• `remember:`, `memo:`, `role:` commands.
"""

import os, io, re, base64, tempfile
from typing import List, Dict, Union

import streamlit as st
from dotenv import load_dotenv
from PIL import Image
import pytesseract
import textwrap


from openai import OpenAI

# ═══════════════════════════ universal LangChain imports ══════════════════════
def _import(cls_name: str):
    """Try community → core; return class or None."""
    for path in ("langchain_community.retrievers", "langchain.retrievers"):
        try:
            module = __import__(path, fromlist=[cls_name])
            return getattr(module, cls_name)
        except (ImportError, AttributeError):
            continue
    return None

BM25Retriever     = _import("BM25Retriever")
EnsembleRetriever = _import("EnsembleRetriever")

from langchain_openai import OpenAIEmbeddings
from langchain_community.vectorstores import FAISS
from langchain_community.document_loaders import (
    PyPDFLoader, UnstructuredPowerPointLoader, Docx2txtLoader,
    UnstructuredWordDocumentLoader, TextLoader, CSVLoader,
    UnstructuredImageLoader,
)
from langchain_core.documents import Document
from langchain.text_splitter import RecursiveCharacterTextSplitter
from langchain_core.messages import SystemMessage, HumanMessage

# optional cross-encoder
try:
    from sentence_transformers import CrossEncoder          # type: ignore
except ImportError:
    CrossEncoder = None

# try docx2txt (Word loader); if missing, treat Word files as plain text
try:
    import docx2txt  # noqa: F401
except ImportError:
    st.warning("docx2txt not found – DOC/DOCX will be read as plain text.")
    Docx2txtLoader = TextLoader
    UnstructuredWordDocumentLoader = TextLoader

# ═══════════════════════════ env & client ═════════════════════════════════════
load_dotenv()
OPENAI_API_KEY = os.getenv("OPENAI_API_KEY")
if not OPENAI_API_KEY:
    st.error("🔑  OPENAI_API_KEY not set"); st.stop()

client = OpenAI(api_key=OPENAI_API_KEY)
EMBED_MODEL = "text-embedding-3-small"
LLM_MODEL   = "gpt-4o-mini"

# ═══════════════════════════ constants ════════════════════════════════════════
CTX_DIR  = "default_context"
CHUNK_SZ = 900
CHUNK_OV = 120
FIRST_K  = 20
FINAL_K  = 6

# ═══════════════════════════ helpers ═════════════════════════════════════════
SEC_PAT = re.compile(r"^(Section|Article|Clause|§)\s+\d+[\w.\-]*", re.I)

def split_legal(text: str) -> List[str]:
    """Prefer § headings; fallback to size-based chunks."""
    lines, buf, out = text.splitlines(), [], []
    for ln in lines:
        if SEC_PAT.match(ln) and buf:
            out.append("\n".join(buf)); buf = [ln]
        else:
            buf.append(ln)
    if buf: out.append("\n".join(buf))
    splitter = RecursiveCharacterTextSplitter(chunk_size=CHUNK_SZ,
                                              chunk_overlap=CHUNK_OV)
    chunks = []
    for part in out:
        chunks.extend(splitter.split_text(part))
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
    out: List[Document] = []
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
        return dense
    bm25 = BM25Retriever.from_texts([d.page_content for d in docs])
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

def uncited(txt: str) -> List[str]:
    return [s for s in re.split(r"(?<=[.!?])\s+", txt) if s.strip() and "[#" not in s]

def lc_to_dict(msg: Union[SystemMessage, HumanMessage]) -> Dict:
    if isinstance(msg.content, list):  # multimodal user
        return {"role": "user", "content": msg.content}
    role = "system" if isinstance(msg, SystemMessage) else "user"
    return {"role": role, "content": msg.content}

# ═══════════════════════════ UI ══════════════════════════════════════════════
st.set_page_config("Giulia's Law AI Assistant!", "⚖️")
st.title("⚖️ Giulia's Law AI Assistant!")

uploader = st.sidebar.file_uploader
uploaded_docs = uploader("Upload legal docs",
                         type=list(LOADER_MAP.keys()), accept_multiple_files=True)
image_file = uploader("Optional image / chart (beta)", type=["png", "jpg", "jpeg"])

query = st.chat_input("Ask or use remember:/memo:/role:")

# session defaults
for k, d in {"perm": [], "sess": [], "persona": None, "hist": [],
             "last_image": None}.items():
    st.session_state.setdefault(k, d)

# cache most recent image
if image_file is not None:
    st.session_state["last_image"] = image_file
img_file = image_file or st.session_state["last_image"]

# ═══════════════════════════ MAIN LOOP ═══════════════════════════════════════
if query:
    txt = query.strip(); low = txt.lower()

    if low.startswith("remember:"):
        st.session_state.perm.append(txt.partition(":")[2].strip())
        st.session_state.hist.append(("assistant", "✅ Remembered.")); st.rerun()

    elif low.startswith("memo:"):
        st.session_state.sess.append(txt.partition(":")[2].strip())
        st.session_state.hist.append(("assistant", "🗒️ Noted (session).")); st.rerun()

    elif low.startswith("role:"):
        st.session_state.persona = txt.partition(":")[2].strip()
        st.session_state.hist.append(("assistant",
                                      f"👤 Persona set → {st.session_state.persona}")); st.rerun()

    else:  # question
        corpus, vs = base_corpus_vs()

        if uploaded_docs:
            tmp = tempfile.mkdtemp(); new_docs = []
            for uf in uploaded_docs:
                p = os.path.join(tmp, uf.name); open(p, "wb").write(uf.getbuffer())
                new_docs.extend(load_and_split(p))
            vs.add_documents(new_docs); corpus.extend(new_docs)

        retriever = hybrid_retriever(vs, corpus)
        hits = rerank(txt, retriever.invoke(txt))

        # image
        ocr_text = ""; img_payload = None
        if img_file:
            b = img_file.getvalue(); ocr_text = ocr_bytes(b)
            img_payload = {"type": "image_url",
                           "image_url": {"url":
                                         f"data:image/png;base64,{base64.b64encode(b).decode()}" }}

        # snippets
        snippets = []
        for i, d in enumerate(hits, 1):
            snippet = re.sub(r"\s+", " ", d.page_content)[:1000]
            src = d.metadata.get("source_file", "doc")
            snippets.append(f"[#{i}] ({src}) {snippet}")

        sys_txt = textwrap.dedent("""
            You are a friendly but precise law-exam assistant.

            Ground rules
            • Only use the *Provided Snippets* or stored facts.
            • When you rely on a snippet, cite it with [#n].
            • If the material is missing, tell the user you don’t have enough information.

            Style
            1. Begin with one conversational line that restates the user’s question in your own words.
            – Example: “Sure — the issue you’re raising is how promissory estoppel works in contract renegotiations.”
            2. Then deliver the substantive answer:
            • **Definitions** – one clear sentence.
            • **Case / statute / principle** – 2–3 concise sentences: facts → holding / rule → takeaway.
            • **Problem / fact pattern** – a short paragraph explaining how the rule applies to the facts.
            3. Close, if helpful, with a one-line exam tip or common pitfall.

            Tone: conversational, confident, and exam-ready—like a gifted upper-year student helping a classmate revise. Keep jargon minimal; explain any Latin or technical terms in plain English.

            Remember: no citation → no claim.
        """).strip()

        # OPTIONAL persona injection
        if st.session_state.get("persona"):
            sys_txt += f" Adopt persona: {st.session_state['persona']}."
            

        if st.session_state.persona:
            sys_txt += f" Adopt persona: {st.session_state.persona}."

        msgs: List[Union[SystemMessage, HumanMessage]] = [SystemMessage(content=sys_txt)]
        if snippets:
            msgs.append(SystemMessage(content="Snippets:\n" + "\n\n".join(snippets)))
        for f in st.session_state.perm + st.session_state.sess:
            msgs.append(SystemMessage(content=f"Fact: {f}"))
        if ocr_text.strip():
            msgs.append(SystemMessage(content=f"OCR:\n{ocr_text.strip()}"))

        # user message
        if img_payload:
            msgs.append(HumanMessage(content=[{"type": "text", "text": txt}, img_payload]))
        else:
            msgs.append(HumanMessage(content=txt))

        with st.spinner("Thinking…"):
            res = client.chat.completions.create(
                model=LLM_MODEL,
                messages=[lc_to_dict(m) for m in msgs],
                temperature=0.0,
                max_tokens=800,
            )
        answer = res.choices[0].message.content.strip()
        if uncited(answer):
            st.warning("⚠️ Some sentences lack [#] citations – review recommended.")

        st.session_state.hist.append(("user", txt))
        st.session_state.hist.append(("assistant", answer))

# render chat
for role, msg in st.session_state.hist:
    st.chat_message(role).write(msg)