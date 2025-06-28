# ─────────────────────────── law_ai_assistant.py (v1.6) ───────────────────────────
"""
Streamlit RAG assistant for law-exam prep, scaled for ~350 docs.

Changes v1.6
• Adds “💾 Save uploads to default_context” sidebar button.
• Conversational citation prompt (no forced IRAC).
• Embeddings persisted to faiss_store/; memory-mapped on reload.
"""

import os, io, re, base64, tempfile, shutil
from typing import List, Dict, Union

import streamlit as st
from dotenv import load_dotenv
from PIL import Image
import pytesseract
import faiss
import nltk, ssl
ssl._create_default_https_context = ssl._create_unverified_context  # avoids SSL issues on some hosts
nltk.download("punkt", quiet=True)
nltk.download("punkt_tab", quiet=True)   # <-- NEW — satisfies latest NLTK

from openai import OpenAI

# ── LangChain (version-agnostic retriever import shim) ────────────────────────
def _import(cls):
    for p in ("langchain_community.retrievers", "langchain.retrievers"):
        try:
            return getattr(__import__(p, fromlist=[cls]), cls)
        except (ImportError, AttributeError):
            continue
    return None
BM25Retriever     = _import("BM25Retriever")
EnsembleRetriever = _import("EnsembleRetriever")

from langchain_openai import OpenAIEmbeddings
from langchain_community.vectorstores import FAISS
from langchain_community.document_loaders import (
    PyPDFLoader, UnstructuredPowerPointLoader, Docx2txtLoader,
    UnstructuredWordDocumentLoader, TextLoader, CSVLoader, UnstructuredImageLoader,
)
from langchain_core.documents import Document
from langchain.text_splitter import RecursiveCharacterTextSplitter
from langchain_core.messages import SystemMessage, HumanMessage

try:
    from sentence_transformers import CrossEncoder
except ImportError:
    CrossEncoder = None

# Optional Word parser fallback
try: import docx2txt  # noqa: F401
except ImportError:
    Docx2txtLoader = TextLoader
    UnstructuredWordDocumentLoader = TextLoader

# ── Keys & constants ─────────────────────────────────────────────────────────
load_dotenv()
OPENAI_API_KEY = os.getenv("OPENAI_API_KEY")
if not OPENAI_API_KEY: st.error("OPENAI_API_KEY not set"); st.stop()

client      = OpenAI(api_key=OPENAI_API_KEY)
EMBED_MODEL = "text-embedding-3-small"
LLM_MODEL   = "gpt-4o-mini"

CTX_DIR   = "default_context"
INDEX_DIR = "faiss_store"
CHUNK_SZ  = 600
CHUNK_OV  = 100
FIRST_K   = 30
FINAL_K   = 4
MAX_TURNS = 30  # keep chat history light

# ── Helpers ──────────────────────────────────────────────────────────────────
SEC_PAT = re.compile(r"^(Section|Article|Clause|§)\s+\d+[\w.\-]*", re.I)

def split_legal(text: str) -> List[str]:
    lines, buf, out = text.splitlines(), [], []
    for ln in lines:
        if SEC_PAT.match(ln) and buf:
            out.append("\n".join(buf)); buf = [ln]
        else: buf.append(ln)
    if buf: out.append("\n".join(buf))
    splitter = RecursiveCharacterTextSplitter(chunk_size=CHUNK_SZ, chunk_overlap=CHUNK_OV)
    chunks = []
    for part in out: chunks.extend(splitter.split_text(part))
    return chunks

LOADER_MAP = {
    "pdf":  PyPDFLoader,  "docx": Docx2txtLoader, "doc":  UnstructuredWordDocumentLoader,
    "pptx": UnstructuredPowerPointLoader, "csv":  CSVLoader, "txt":  TextLoader,
    "png":  UnstructuredImageLoader,     "jpg":  UnstructuredImageLoader,  "jpeg": UnstructuredImageLoader,
}

def load_and_split(path: str) -> List[Document]:
    ext = path.lower().split(".")[-1]; loader_cls = LOADER_MAP.get(ext)
    if not loader_cls: return []
    docs = loader_cls(path).load(); out = []
    for d in docs:
        meta = d.metadata or {}; meta["source_file"] = os.path.basename(path)
        for chunk in split_legal(d.page_content):
            out.append(Document(page_content=chunk, metadata=meta))
    return out

@st.cache_resource(show_spinner=False)
def embeddings(): return OpenAIEmbeddings(model=EMBED_MODEL)

def build_or_load_index(corpus: List[Document]):
    if os.path.exists(INDEX_DIR):
        try: return FAISS.load_local(INDEX_DIR, embeddings(), allow_dangerous_deserialization=True)
        except Exception: pass
    vs = FAISS.from_documents(corpus, embeddings())
    vs.save_local(INDEX_DIR); return vs

@st.cache_resource(show_spinner=False)
def get_cross_encoder():
    if CrossEncoder is None: return None
    try: return CrossEncoder("mixedbread-ai/mxbai-rerank-base-v1")
    except Exception: return None

def hybrid_retriever(vs: FAISS, docs: List[Document]):
    dense = vs.as_retriever(search_kwargs={"k": FIRST_K})
    if not (BM25Retriever and EnsembleRetriever): return dense
    bm25 = BM25Retriever.from_texts([d.page_content for d in docs])
    return EnsembleRetriever(retrievers=[dense, bm25], weights=[0.7, 0.3])

def rerank(q: str, docs: List[Document]):
    ce = get_cross_encoder()
    if not ce or not docs: return docs[:FINAL_K]
    scores = ce.predict([[q, d.page_content] for d in docs])
    for d,s in zip(docs,scores): d.metadata["ce"]=float(s)
    return sorted(docs,key=lambda d:d.metadata["ce"],reverse=True)[:FINAL_K]

def ocr_bytes(b:bytes)->str:
    try: return pytesseract.image_to_string(Image.open(io.BytesIO(b)),lang='eng',config='--psm 6')
    except Exception: return ""

# def uncited(txt:str): return [s for s in re.split(r"(?<=[.!?])\\s+",txt) if s.strip() and "[#" not in s]

def to_dict(m): return {"role":"user" if isinstance(m,HumanMessage) else "system","content":m.content}

# ── UI ───────────────────────────────────────────────────────────────────────
st.set_page_config("Giulia's Law AI Assistant", "⚖️")
st.title("⚖️ Giulia's Law AI Assistant!")

uploaded_docs = st.sidebar.file_uploader("Upload legal docs", type=list(LOADER_MAP.keys()), accept_multiple_files=True)
image_file    = st.sidebar.file_uploader("Optional image / chart", type=["png","jpg","jpeg"])
if st.sidebar.button("💾 Save uploads to default_context"):
    if uploaded_docs:
        os.makedirs(CTX_DIR, exist_ok=True)
        for uf in uploaded_docs:
            dest = os.path.join(CTX_DIR, uf.name)
            with open(dest,"wb") as out: out.write(uf.getbuffer())
        shutil.rmtree(INDEX_DIR, ignore_errors=True)
        st.success("Files saved! Reload to re-index.")
    else: st.info("No docs to save.")

query = st.chat_input("Ask anything")

for k,d in {"perm":[], "sess":[], "persona":None, "hist":[], "last_img":None}.items():
    st.session_state.setdefault(k,d)

if image_file is not None: st.session_state["last_img"]=image_file
img_file = image_file or st.session_state["last_img"]

# ── Build / load index once ────────────────────────────────────────────────
base_docs=[]
if os.path.exists(CTX_DIR):
    for f in os.listdir(CTX_DIR):
        base_docs.extend(load_and_split(os.path.join(CTX_DIR,f)))
vs = build_or_load_index(base_docs)

LEGAL_KEYWORDS = {
    # words / phrases that usually indicate a rule, authority, or factual assertion
    "held", "holding", "ratio", "rule", "principle", "because", "therefore",
    "thus", "however", "applies", "application", "statute", "section", "§",
    "case", "authority", "precedent", "duty", "breach", "liable", "liability",
    "defence", "defense", "test", "standard", "requirement", "requires",
    "must", "shall", "may", "where", "if", "unless"
}

CITE_PAT   = re.compile(r"\[#\d+\]")
ALPHA_PAT  = re.compile(r"[A-Za-z]")          # ignore empty punctuation blobs

def uncited_substantive(text: str) -> list[str]:
    """
    Return sentences that (a) look substantive and (b) lack a [#n] citation.
    Uses NLTK's Punkt tokenizer for reasonably accurate segmentation.
    """
    from nltk.tokenize import sent_tokenize

    offenders = []
    for sent in sent_tokenize(text):
        s_clean = sent.strip()
        if not ALPHA_PAT.search(s_clean):          # skip whitespace / emoji only
            continue
        if CITE_PAT.search(s_clean):               # already cited
            continue
        # substantiveness heuristic: any legal keyword or > 12 words
        word_count = len(s_clean.split())
        if word_count > 12 or any(k in s_clean.lower() for k in LEGAL_KEYWORDS):
            offenders.append(s_clean)
    return offenders

# ── MAIN LOOP ──────────────────────────────────────────────────────────────
if query:
    txt=query.strip(); low=txt.lower()

    if low.startswith("remember:"):
        st.session_state.perm.append(txt.partition(":")[2].strip())
        st.session_state.hist.append(("assistant","✅ Remembered.")); st.rerun()

    elif low.startswith("memo:"):
        st.session_state.sess.append(txt.partition(":")[2].strip())
        st.session_state.hist.append(("assistant","🗒️ Noted (session).")); st.rerun()

    elif low.startswith("role:"):
        st.session_state.persona=txt.partition(":")[2].strip()
        st.session_state.hist.append(("assistant",f"👤 Persona → {st.session_state.persona}")); st.rerun()

    else:
        # merge uploaded docs (session-only unless saved)
        extra_docs=[]
        if uploaded_docs:
            tmp=tempfile.mkdtemp()
            for uf in uploaded_docs:
                p=os.path.join(tmp,uf.name); open(p,"wb").write(uf.getbuffer())
                extra_docs.extend(load_and_split(p))
            vs.add_documents(extra_docs); base_docs.extend(extra_docs)

        docs=rerank(txt, hybrid_retriever(vs, base_docs).invoke(txt))

        # snippet build
        snippets=[]
        for i,d in enumerate(docs,1):
            snippets.append(f"[#{i}] ({d.metadata.get('source_file','doc')}) {re.sub(r'\\s+',' ',d.page_content)[:1000]}")

        # image branch
        ocr=""; img_payload=None
        if img_file:
            b=img_file.getvalue(); ocr=ocr_bytes(b)
            img_payload={"type":"image_url","image_url":{"url":f"data:image/png;base64,{base64.b64encode(b).decode()}"}}

    # ── Prompt -----------------------------------------------------------------
    prompt = """
    You are a conversational but rigorous law-exam assistant.

    GROUND RULES
    • Only use the *Provided Snippets* or stored facts.  
    • Cite each borrowed idea with [#n].  
    • If info is missing, say so.  (NO CITATION ⇒ NO CLAIM.)

    STYLE
    1. Start with one friendly line that restates the user’s question.  
    2. Give a detailed answer with clear reasoning.
    3. Use plain English; explain legal jargon. 
    3. Cite sources in the answer with [#n] (e.g., “As per [#1] …”).
    4. End with a friendly line that invites follow-up questions.
    5. Use the IRAC format only if explicitly asked for it.
    6. Use the provided snippets and stored facts to answer the question.
        
    Tone: clear, confident, peer-to-peer.  Explain jargon in plain English.
    """.strip()

    # Persona injection (optional)
    if st.session_state.persona:
        prompt += f" Adopt persona: {st.session_state.persona}."

    # ── Build message list ------------------------------------------------------
    msgs: List[Union[SystemMessage, HumanMessage]] = [SystemMessage(content=prompt)]

    if snippets:
        msgs.append(SystemMessage(content="Snippets:\n" + "\n\n".join(snippets)))

    for fact in st.session_state.perm + st.session_state.sess:
        msgs.append(SystemMessage(content=f"Fact: {fact}"))

    if ocr.strip():
        msgs.append(SystemMessage(content=f"OCR:\n{ocr.strip()}"))

    # User message (multimodal if image is present)
    user_content = [{"type": "text", "text": txt}, img_payload] if img_payload else txt
    msgs.append(HumanMessage(content=user_content))

    # ── Call the model ----------------------------------------------------------
    with st.spinner("Thinking …"):
        res = client.chat.completions.create(
            model       = LLM_MODEL,
            messages    = [to_dict(m) for m in msgs],
            temperature = 0.0,
            max_tokens  = 800,
        )

    answer = res.choices[0].message.content.strip()

    missing = uncited_substantive(answer)
    if missing:
        preview = " | ".join(missing[:3]) + (" …" if len(missing) > 3 else "")
        st.warning(f"⚠️ Missing citations in: {preview}")
    
    # ── Update chat history (cap at MAX_TURNS) ----------------------------------
    st.session_state.hist.extend([("user", txt), ("assistant", answer)])
    st.session_state.hist = st.session_state.hist[-MAX_TURNS * 2:]

    # ── Render chat -------------------------------------------------------------
    for role, msg in st.session_state.hist:
        st.chat_message(role).write(msg)
