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

def to_dict(m): return {"role":"user" if isinstance(m,HumanMessage) else "system","content":m.content}

# ── UI ───────────────────────────────────────────────────────────────────────
st.set_page_config("Giulia's (🐀) Law AI Assistant", "⚖️")
 
st.markdown("""
<style>
/* stretch content edge-to-edge */
section.main > div { max-width: 1200px; }

/* info-panel look */
.info-panel {
  padding:24px 28px;
  border-radius:14px;
  font-size:1.05rem;
  line-height:1.7;
}
html[data-theme="light"] .info-panel{
  background:#e7f3fc; color:#184361;
  border-left:7px solid #2574a9;
  box-shadow:0 1px 8px #eef4fa;
}
html[data-theme="dark"]  .info-panel{
  background:#2b2b2b; color:#ddd;
  border-left:7px solid #bb86fc;
  box-shadow:0 1px 8px rgba(0,0,0,.5);
}
html[data-theme="dark"]  .info-panel b{color:#fff}
html[data-theme="dark"]  .info-panel a{color:#a0d6ff}
</style>
""", unsafe_allow_html=True)

st.title("⚖️ Giulia's Law AI Assistant!")

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

# ---------------- Sidebar: default_context browser -----------------
with st.sidebar.expander("📁 default_context files", expanded=False):
    if not os.path.exists(CTX_DIR):
        st.write("_Folder does not exist yet_")
    else:
        files = sorted(os.listdir(CTX_DIR))
        if not files:
            st.write("_Folder is empty_")
        else:
            for fn in files:
                col1, col2, col3 = st.columns([4, 1, 1])
                col1.write(fn)
                # download link
                with open(os.path.join(CTX_DIR, fn), "rb") as f:
                    col2.download_button(
                        label="⬇️",
                        data=f,
                        file_name=fn,
                        mime="application/octet-stream",
                        key=f"dl_{fn}",
                    )
                # delete button
                if col3.button("🗑️", key=f"del_{fn}"):
                    os.remove(os.path.join(CTX_DIR, fn))
                    # drop the index so it's rebuilt without the file
                    shutil.rmtree(INDEX_DIR, ignore_errors=True)
                    st.experimental_rerun()


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

# --------------- Sidebar: light-hearted disclaimer -----------------
with st.sidebar.expander("⚖️ Disclaimer", expanded=False):
    st.markdown(
        """
I’m an AI study buddy, **not** your solicitor or lecturer.  
By using this tool you agree that:

* I might be wrong, out-of-date, or miss a key authority.
* Your exam results remain **your** responsibility.
* If you flunk, you’ve implicitly waived all claims in tort, contract,
  equity, and any other jurisdiction you can think of&nbsp;😉

In short: double-check everything before relying on it.
""",
        unsafe_allow_html=True,
    )

with st.expander("ℹ️  How this assistant works", expanded=True):
    st.markdown(
        """
<div class="info-panel">
<b>📚 What you should know</b>
<ul style="margin-left:1.1em;margin-top:12px">
  <li>📄 <b>Document-only answers</b> – I draw <em>only</em> on the files you upload or facts you store with <code>remember:</code>. No internet look-ups.</li>

  <li>🔍 <b>Citations matter</b> – each legal rule or fact ends with a tag such as <code>[#3]</code>.  
      A yellow badge warns you if something looks uncited.</li>

  <li>📂 <b>Uploads</b>
      <ul>
        <li><b>Session-only</b> – just drop files in the sidebar. They disappear when you refresh.</li>
        <li><b>Keep forever</b> – after uploading, click <strong>“💾 Save uploads”</strong>. I’ll remember them in future sessions.<br>
            (Need to remove one later? Use the 🗑️ icon in the sidebar list.)</li>
      </ul></li>

  <li>🖼 <b>Images (beta)</b> – PNG/JPG diagrams go through OCR. Handwritten or tiny text may be mis-read.</li>

  <li>🚦 <b>Limits & tips</b>
      <ul>
        <li>Up to ~4 000 chunks (≈ 350 docs) runs smoothly on a typical laptop or Streamlit Cloud.</li>
        <li>If a new file isn’t cited, click <strong>“🔄 Rebuild index”</strong> in the sidebar.</li>
      </ul></li>

  <li>⚖️ <b>Disclaimer</b> – I’m an AI study buddy, not your solicitor. Double-check everything before you rely on it!</li>
</ul>

<b>Pro tip ✨</b> Type <code>show snippet [#2]</code> and I’ll reveal the exact passage I used.
</div>
        """,
        unsafe_allow_html=True,
    )

query = st.chat_input("Ask anything")

for k, d in {
    "perm": [], "sess": [], "persona": None,
    "hist": [], "last_img": None,
    "user_snips": []          # NEW
}.items():
    st.session_state.setdefault(k, d)

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
    Flag sentences that look like real legal content but have no [#] citation.
    • Legal keyword  → must cite
    • Long sentence (>25 words) → must cite
    Casual greetings or short factual bios no longer trigger a warning.
    """
    from nltk.tokenize import sent_tokenize

    offenders = []
    for sent in sent_tokenize(text):
        s = sent.strip()
        if not ALPHA_PAT.search(s):                 # punctuation / emoji only
            continue
        if CITE_PAT.search(s):                      # already cited
            continue
        words = len(s.split())
        if words > 25 or any(k in s.lower() for k in LEGAL_KEYWORDS):
            offenders.append(s)
    return offenders

# ── MAIN LOOP ──────────────────────────────────────────────────────────────
if query:
    txt=query.strip(); low=txt.lower()

    if not txt.lower().startswith(("remember:", "memo:", "role:")):
        st.session_state.user_snips.append(txt)
        st.session_state.user_snips = st.session_state.user_snips[-10:]  # keep last 10

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

        # user snippets
        offset = len(snippets)
        for i, us in enumerate(st.session_state.user_snips, 1):
            snippets.append(f"[#U{i}] (user) {us}")
        
        # image branch
        ocr=""; img_payload=None
        if img_file:
            b=img_file.getvalue(); ocr=ocr_bytes(b)
            img_payload={"type":"image_url","image_url":{"url":f"data:image/png;base64,{base64.b64encode(b).decode()}"}}

    # ── Prompt -----------------------------------------------------------------
    prompt = """
    You are Giulia’s friendly but meticulous law-exam assistant.

    GROUND RULES
    • Your knowledge source hierarchy, in order of authority:  
    1. **Provided Snippets** (numbered [#n]).  
    2. **Stored facts** added with remember:/memo:.  
    3. Generally known public facts *only* if obviously harmless
        (e.g., “LSE stands for London School of Economics”).  
    • Every sentence that states a legal rule, holding, statute section, date,
    or anything that might be challenged in an exam answer must end with its
    citation [#n].  
    • If the necessary information is not present in 1 or 2, respond exactly with:  
    “I don’t have enough information in the provided material to answer that.”

    STYLE
    1. Begin with one conversational line that restates the user’s question.  
    2. Give a detailed, logically structured answer (IRAC only if the user asks).  
    3. Explain legal jargon in plain English.  
    5. Keep tone peer-to-peer, confident, concise.

    (NO CITATION ⇒ NO CLAIM.)
    """.strip()

    # ── Final prompt (add persona if any) ───────────────────────────────
    if st.session_state.persona:
        prompt += f" Adopt persona: {st.session_state.persona}."

    # ── Build message list ──────────────────────────────────────────────
    msgs: List[Union[SystemMessage, HumanMessage]] = [SystemMessage(content=prompt)]

    if snippets:
        msgs.append(SystemMessage(content="Snippets:\n" + "\n\n".join(snippets)))

    for fact in st.session_state.perm + st.session_state.sess:
        msgs.append(SystemMessage(content=f"Fact: {fact}"))

    if ocr.strip():
        msgs.append(SystemMessage(content=f"OCR:\n{ocr.strip()}"))

    # user message (multimodal if image present)
    user_payload = [{"type": "text", "text": txt}, img_payload] if img_payload else txt
    msgs.append(HumanMessage(content=user_payload))

    # ── Call the model ──────────────────────────────────────────────────
    with st.spinner("Thinking …"):
        res = client.chat.completions.create(
            model       = LLM_MODEL,
            messages    = [to_dict(m) for m in msgs],
            temperature = 0.0,
            max_tokens  = 800,
        )

    answer = res.choices[0].message.content.strip()

    if snippets and len(snippets) == 1 and not CITE_PAT.search(answer):
        # snippets[0] is like "[#3] (source) …", so we pull out "#3"
        answer += f" [{snippets[0].split(']')[0][1:]}]"

    # ── Citation check & refusal ────────────────────────────────────────
    missing = uncited_substantive(answer)
    if missing:
        st.warning("⚠️ Sentences without citations: " + " | ".join(missing[:3]))

    # ── Update history (cap at MAX_TURNS) ───────────────────────────────
    st.session_state.hist.extend([("user", txt), ("assistant", answer)])
    st.session_state.hist = st.session_state.hist[-MAX_TURNS * 2:]

    # ── Render chat ─────────────────────────────────────────────────────
    for role, msg in st.session_state.hist:
        st.chat_message(role).write(msg)
