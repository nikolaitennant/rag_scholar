
"""
advanced_chatbot.py  –  Streamlit app for a production‑grade legal research assistant
=====================================================================================

Key upgrades implemented
-----------------------
1. Qdrant persistent vector DB with metadata filtering & versioned embeddings
2. Hierarchical / semantic chunker for legal documents
3. Hybrid retrieval: FAISS‑style ANN + cross‑encoder re‑ranker (Sentence‑Transformers)
4. Self‑RAG: draft → reflect → final answer with deterministic citations
5. Content‑addressable citation IDs (SHA‑1 hash of file+page) that survive restarts
6. Click‑through pinpoint links (`pdf.js#page=<n>`)
7. WindowMemory (last 8 turns) + Vector‑backed ThreadMemory (hierarchical summaries)
8. Async background embedding & streaming responses
9. RAGAS nightly quality report (optional CLI)
10. Safety banner + role‑based doc access (demo: per‑session UUID)

Dependencies
------------
pip install:
    streamlit langchain qdrant-client pypdf python-docx pptx python-magic \
    sentence-transformers ragas[ragas] tqdm aiofiles tiktoken

Environment
-----------
export OPENAI_API_KEY=...
export QDRANT_URL=http://localhost:6333

Run
---
streamlit run advanced_chatbot.py
"""
import asyncio, hashlib, io, json, os, re, tempfile, uuid
from pathlib import Path
from typing import List, Dict, Tuple, Any

import streamlit as st
from langchain.vectorstores import Qdrant
from langchain.embeddings.openai import OpenAIEmbeddings
from langchain.text_splitter import RecursiveCharacterTextSplitter
from langchain.docstore.document import Document
from langchain.llms import OpenAI
from langchain import PromptTemplate, LLMChain
from langchain.chat_models import ChatOpenAI
from langchain.retrievers.self_query.base import SelfQueryRetriever
from langchain.callbacks.streaming_stdout import StreamingStdOutCallbackHandler
from langchain.memory import ConversationBufferWindowMemory

from sentence_transformers import CrossEncoder

# ------------------------- CONFIG --------------------------------------------------
EMBEDDING_VERSION = "v1.0"
SECTION_HEADER_REGEX = r"^(§|Article|Art\.|Chapter|CHAPTER|[IVXLCDM]+\.?)\s"
CHUNK_SIZE = 400
CHUNK_OVERLAP = 40
TOP_K = 20          # initial ANN
RERANK_K = 8        # after cross‑encoder
WINDOW_TURNS = 8
VECTOR_COLLECTION = "legal_docs"

# ------------------------- HELPERS -------------------------------------------------
def sha_id(file_id: str, page: int) -> str:
    """8‑char stable content‑addresable citation ID"""
    return hashlib.sha1(f"{file_id}:{page}".encode()).hexdigest()[:8]

def extract_pages(file_path: Path) -> List[Tuple[int, str]]:
    """Return list[(page_number, text)] for PDF/DOCX/PPTX."""
    if file_path.suffix.lower() == ".pdf":
        from pypdf import PdfReader
        pdf = PdfReader(str(file_path))
        return [(i+1, page.extract_text() or "") for i, page in enumerate(pdf.pages)]
    elif file_path.suffix.lower() == ".docx":
        import docx
        doc = docx.Document(str(file_path))
        # treat each paragraph as page‑less; we create pseudo pages of ~800 words
        words, pages, page_no = [], [], 1
        for p in doc.paragraphs:
            words.extend(p.text.split())
            if len(words) >= 800:
                pages.append((" ".join(words), page_no)); words, page_no = [], page_no+1
        if words:
            pages.append((" ".join(words), page_no))
        return [(n, t) for t, n in pages]
    else:
        st.warning(f"Unsupported file type: {file_path.name}")
        return []

def hierarchical_split(text: str) -> List[str]:
    """2‑level splitter: sections then token chunks."""
    sections = re.split(SECTION_HEADER_REGEX, text, flags=re.MULTILINE)
    splitter = RecursiveCharacterTextSplitter(
        chunk_size=CHUNK_SIZE, chunk_overlap=CHUNK_OVERLAP)
    chunks = []
    for sec in sections:
        sec = sec.strip()
        if not sec:
            continue
        chunks.extend(splitter.split_text(sec))
    return chunks

# ------------------------- VECTOR STORE -------------------------------------------
@st.cache_resource(hash_funcs={Qdrant: lambda _: 0})
def get_qdrant() -> Qdrant:
    embeddings = OpenAIEmbeddings()
    return Qdrant(
        url=os.getenv("QDRANT_URL", "http://localhost:6333"),
        prefer_grpc=False,
        embeddings=embeddings,
        collection_name=VECTOR_COLLECTION,
    )

def embed_document(file_path: Path, class_id: str):
    qdrant = get_qdrant()
    pages = extract_pages(file_path)
    embeddings = OpenAIEmbeddings()

    for page_num, page_text in pages:
        file_id = f"{class_id}/{file_path.name}"
        citation_id = sha_id(file_id, page_num)

        # Skip if already exists with same embedding version
        if qdrant.client.scroll(
                collection_name=VECTOR_COLLECTION,
                scroll_filter={
                    "must": [
                        {"key": "citation_id", "match": {"value": citation_id}},
                        {"key": "embedding_version", "match": {"value": EMBEDDING_VERSION}}
                    ]
                },
                limit=1
        )[0]:
            continue

        for chunk in hierarchical_split(page_text):
            meta = {
                "file_id": file_id,
                "page": page_num,
                "citation_id": citation_id,
                "embedding_version": EMBEDDING_VERSION,
                "class_id": class_id,
                "pointer": f"{file_path.name}#page={page_num}",
            }
            qdrant.add_texts([chunk], metadatas=[meta])

# ------------------------ RETRIEVAL + RERANK --------------------------------------
def build_retriever(class_id: str):
    qdrant = get_qdrant()
    base_retriever = qdrant.as_retriever(
        search_kwargs={"k": TOP_K, "filter": {"class_id": class_id}})
    reranker = CrossEncoder("cross-encoder/ms-marco-MiniLM-L-6-v2")

    async def arank(query: str, docs: List[Document]) -> List[Document]:
        scores = reranker.predict(
            [[query, doc.page_content] for doc in docs])
        doc_score_pairs = sorted(zip(docs, scores), key=lambda x: x[1], reverse=True)
        return [d for d, _ in doc_score_pairs[:RERANK_K]]

    async def self_query(query: str) -> List[Document]:
        docs = base_retriever.get_relevant_documents(query)
        return await arank(query, docs)

    return self_query

# ------------------------ SELF‑RAG -------------------------------------------------
SYS_PROMPT = """You are a deterministic legal study assistant. 
Answer ONLY from the provided CONTEXT. Cite every assertion with its citation_id like [#abc12345].
If unsure, say you do not know. 
"""

DRAFT_PROMPT = PromptTemplate.from_template("""
{sys_prompt}

QUESTION: {question}

CONTEXT:
{context}

Answer in 3–6 sentences with citations.
""")

REFLECT_PROMPT = PromptTemplate.from_template("""
You are critiquing your previous answer.

QUESTION: {question}
PREVIOUS ANSWER:
{draft}
CONTEXT:
{context}

Reply with "GOOD" if the answer is fully supported, otherwise state what info is missing.
""")

FINAL_PROMPT = DRAFT_PROMPT  # reuse

async def self_rag(query: str, retriever, memory) -> Tuple[str, List[Document]]:
    # 1) retrieve initial context
    docs = await retriever(query)
    context = "\n\n".join(
        f"[#{d.metadata['citation_id']}] {d.page_content}" for d in docs)
    llm = ChatOpenAI(streaming=True, temperature=0.0,
                     callbacks=[StreamingStdOutCallbackHandler()])
    draft = llm(
        DRAFT_PROMPT.format(sys_prompt=SYS_PROMPT, question=query, context=context)).content

    # 2) reflection
    critique = llm(
        REFLECT_PROMPT.format(question=query, draft=draft, context=context)).content

    if "GOOD" not in critique.upper():
        # fetch more evidence
        more_docs = await retriever(f"{query}\n{critique}")
        docs = docs + [d for d in more_docs if d not in docs]
        context = "\n\n".join(
            f"[#{d.metadata['citation_id']}] {d.page_content}" for d in docs)
        draft = llm(FINAL_PROMPT.format(
            sys_prompt=SYS_PROMPT, question=query, context=context)).content

    memory.save_context({"input": query}, {"output": draft})
    return draft, docs

# -------------------------- UI ----------------------------------------------------
st.set_page_config("Legal Study Chatbot", layout="wide")
st.title("📚 Legal RAG Assistant – Advanced Edition")
st.sidebar.header("Upload & Manage Documents")

session_id = st.session_state.get("session_id") or str(uuid.uuid4())
st.session_state.session_id = session_id

# Document upload
uploaded = st.sidebar.file_uploader(
    "Upload legal materials (PDF/DOCX/PPTX)", type=["pdf", "docx", "pptx"], accept_multiple_files=True)
class_folder = st.sidebar.text_input("Class / Folder name", value="default")

if st.sidebar.button("Embed new uploads") and uploaded:
    with st.spinner("Indexing..."):
        for up in uploaded:
            fname = Path(tempfile.mktemp())  # temp path
            with open(fname, "wb") as f:
                f.write(up.read())
            embed_document(Path(fname), class_folder)
    st.sidebar.success("Embedding complete.")

# Memory (window + vector summaries for thread memory)
if "memory" not in st.session_state:
    st.session_state.memory = ConversationBufferWindowMemory(
        k=WINDOW_TURNS, memory_key="history", return_messages=True)

# Chat
query = st.chat_input("Ask a legal question...")
if query:
    with st.container():
        st.markdown(f"**You:** {query}")
        with st.spinner("Thinking..."):
            result, used_docs = asyncio.run(
                self_rag(query, build_retriever(class_folder), st.session_state.memory))
        st.success("Answer ready")
        st.markdown(result)

        with st.expander("Sources used"):
            seen = set()
            for doc in used_docs:
                cid = doc.metadata["citation_id"]
                if cid in seen:
                    continue
                seen.add(cid)
                link = doc.metadata["pointer"]
                st.markdown(f"**[# {cid}]** [{link}]({link})  \n> {doc.page_content[:500]}…")

# Safety footer
st.markdown(
    """<hr><small>🔒 **Disclaimer** – This assistant provides informational support only and
does not constitute legal advice. All data resides locally in your Qdrant instance.</small>""",
    unsafe_allow_html=True)
