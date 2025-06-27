# import streamlit as st
# from langchain_openai import ChatOpenAI, OpenAIEmbeddings
# from langchain_community.vectorstores import FAISS
# from langchain_community.document_loaders import TextLoader, PyPDFLoader
# from langchain_core.messages import SystemMessage, HumanMessage
# from dotenv import load_dotenv
# import os
# import tempfile

# # Load env variables
# load_dotenv()
# api_key = os.getenv("OPENAI_API_KEY")

# st.set_page_config(page_title="Giulia's Law AI Assistant", page_icon="🤖")
# st.title("🤖 Giulia's Law AI Assistant")

# # Spacing before info boxes
# st.markdown("<div style='height: 18px;'></div>", unsafe_allow_html=True)

# # Blue info box (with better padding, spacing, and sections)
# st.markdown("""
# <div style='
#     margin-bottom: 24px;
#     padding: 26px 28px 20px 28px;
#     background: #e7f3fc;
#     border-radius: 14px;
#     border-left: 7px solid #2574a9;
#     color: #184361;
#     font-size: 1.08rem;
#     box-shadow: 0 1px 8px #eef4fa;
#     line-height: 1.7;
# '>
#   <b style='font-size: 1.13rem;'>ℹ️  This assistant ONLY uses information from your uploaded documents and 
#   <span style="color:#1c853b;">preloaded default context</span>
#   <span style="font-weight:500; font-size: 1.01rem;'">
#     (such as your CV and course info—already included,
#     <u>no need to upload</u>).
#   </span>
#   </b>
#   <div style='height: 14px;'></div>
#   <ul style="margin-left: 1.1em; margin-bottom: 0.5em;">
#     <li>
#       If the answer is <b>not present</b> in your documents or the preloaded context, it will let you know.
#     </li>
#     <li style="margin-top: 8px;">
#       <span style="color:#d97706; font-weight:600;">It will <u>not</u> invent or make up any information.</span>
#     </li>
#     <li style="margin-top: 8px;">
#       You can upload multiple files at once, and their content will be <b>combined</b> for answering your questions.
#     </li>
#   </ul>
#   <div style='height: 7px;'></div>
#   <b>✨ Tip:</b> For best results, upload documents that contain the details you want to ask about.
# </div>
# """, unsafe_allow_html=True)

# # --- Functions to load documents ---

# def load_uploaded_files(uploaded_files):
#     temp_folder = tempfile.mkdtemp()
#     all_documents = []
#     for uploaded_file in uploaded_files:
#         file_path = os.path.join(temp_folder, uploaded_file.name)
#         with open(file_path, "wb") as f:
#             f.write(uploaded_file.getbuffer())
#         if uploaded_file.name.lower().endswith(".pdf"):
#             loader = PyPDFLoader(file_path)
#             all_documents.extend(loader.load())
#         else:
#             loader = TextLoader(file_path)
#             all_documents.extend(loader.load())
#     return all_documents

# def load_default_context(folder="default_context"):
#     all_documents = []
#     if not os.path.exists(folder):
#         return all_documents
#     for filename in os.listdir(folder):
#         file_path = os.path.join(folder, filename)
#         if filename.lower().endswith(".pdf"):
#             loader = PyPDFLoader(file_path)
#             all_documents.extend(loader.load())
#         elif filename.lower().endswith(".txt"):
#             loader = TextLoader(file_path)
#             all_documents.extend(loader.load())
#     return all_documents

# # --- File upload UI ---

# uploaded_files = st.sidebar.file_uploader(
#     "Upload your text or PDF files here", type=["txt", "pdf"], accept_multiple_files=True
# )

# # --- Chat history state ---
# if "chat_history" not in st.session_state:
#     st.session_state.chat_history = []

# # --- Main logic ---
# default_documents = load_default_context("default_context")
# uploaded_documents = load_uploaded_files(uploaded_files) if uploaded_files else []
# all_documents = default_documents + uploaded_documents

# if all_documents:
#     embeddings = OpenAIEmbeddings(api_key=api_key)
#     vector_store = FAISS.from_documents(all_documents, embeddings)
#     retriever = vector_store.as_retriever()
#     llm = ChatOpenAI(api_key=api_key, model="gpt-4o-mini", temperature=0.3)
    
#     if default_documents and uploaded_documents:
#         st.success("Default and uploaded documents loaded! Ask your questions below:")
#     elif default_documents:
#         st.success("Default context loaded (CV, course info, etc)! Ask your questions below:")
#     elif uploaded_documents:
#         st.success("Uploaded documents loaded! Ask your questions below:")

#     user_input = st.chat_input("Ask something about your docs...")
#     if user_input:
#         docs = retriever.invoke(user_input)
#         context = "\n\n".join(d.page_content for d in docs)
#         if not context.strip():
#             # No info found: allow LLM to use just what the user said
#             system_prompt = (
#                 "You are a helpful assistant. "
#                 "You have ONLY the following information from the user to work with. "
#                 "Use ONLY this information to answer. Do not use any outside knowledge.\n\n"
#                 f"User info:\n{user_input}"
#             )
#         else:
#             system_prompt = (
#                 "You are a helpful assistant. "
#                 "You must answer using ONLY the provided knowledge base context and any facts the user provides about themselves in their current prompt. "
#                 "If there is not enough information to fulfill the user's request, respond with the following:\n"
#                 "'Sorry, there is not enough information in the documents or user input to answer your request.'\n"
#                 "Do not make up or invent any information or details beyond what is in the context or the user's current prompt.\n\n"
#                 f"Context:\n{context}"
#             )
#         messages = [
#             SystemMessage(content=system_prompt),
#             HumanMessage(content=user_input)
#         ]
#         result = llm.invoke(messages)
#         st.session_state.chat_history.append(("You", user_input))
#         st.session_state.chat_history.append(("Assistant", result.content))
        
#     # Display chat history
#     for role, message in st.session_state.chat_history:
#         if role == "You":
#             st.chat_message("user").write(message)
#         else:
#             st.chat_message("assistant").write(message)
# else:
#     st.info("Upload at least one .txt or .pdf file to start chatting.")




# giulia_law_ai.py
"""
Streamlit RAG assistant for exam prep
– Default context loaded once
– Upload additional PDFs/TXTs any time
– memo:  = session-only fact
– remember: = persistent fact
– role:  = adopt persona for the session
"""
import os, tempfile, streamlit as st
from dotenv import load_dotenv

from langchain_openai import ChatOpenAI, OpenAIEmbeddings
from langchain_community.vectorstores import FAISS
from langchain_community.document_loaders import TextLoader, PyPDFLoader
from langchain.docstore.document import Document
from langchain.memory import ConversationSummaryBufferMemory
from langchain.chains import ConversationalRetrievalChain

# ---------- config ----------
load_dotenv()
API_KEY   = os.getenv("OPENAI_API_KEY")
EMBEDDER  = OpenAIEmbeddings(api_key=API_KEY)
INDEX_DIR = "faiss_index"          # folder that stores FAISS + metadata
FLAG      = ".defaults_loaded"     # sentinel file so we add default docs only once

st.set_page_config("Giulia Law AI", "🤖")
st.title("🤖 Giulia's Law AI Assistant")

# ---------- helpers ----------
def load_docs_from_upload(files):
    """Return list[Document] from Streamlit uploads."""
    tmp = tempfile.mkdtemp()
    docs = []
    for up in files:
        path = os.path.join(tmp, up.name)
        with open(path, "wb") as f: f.write(up.getbuffer())
        loader = PyPDFLoader(path) if up.name.lower().endswith(".pdf") else TextLoader(path)
        docs.extend(loader.load())
    return docs

def load_default_context(folder="default_context"):
    docs = []
    if not os.path.exists(folder): return docs
    for fname in os.listdir(folder):
        path = os.path.join(folder, fname)
        loader = PyPDFLoader(path) if fname.lower().endswith(".pdf") else TextLoader(path)
        docs.extend(loader.load())
    return docs

def ensure_vstore_exists(docs):
    """
    Return a vector store.
    If an on-disk index exists, load it.
    Else, if `docs` is non-empty, create a new store from them and save.
    Else, return None.
    """
    if os.path.exists(INDEX_DIR):
        return FAISS.load_local(INDEX_DIR, EMBEDDER)
    elif docs:
        vs = FAISS.from_documents(docs, EMBEDDER)
        vs.save_local(INDEX_DIR)
        return vs
    return None

def safe_add_documents(vs, new_docs, persist):
    """
    Add docs to vs. If vs is None, create it; if persist=True, save to disk.
    """
    if vs is None:
        vs = FAISS.from_documents(new_docs, EMBEDDER)
    else:
        vs.add_documents(new_docs)
    if persist:
        vs.save_local(INDEX_DIR)
    return vs

def maybe_persist_fact(msg, vs):
    """
    memo:      → session only
    remember:  → persist to disk
    Returns (handled: bool, new_vs)
    """
    for trig, persist in (("remember:", True), ("memo:", False)):
        if msg.lower().startswith(trig):
            fact = msg[len(trig):].strip()
            if fact:
                vs = safe_add_documents(vs, [Document(page_content=fact)], persist)
                return True, vs
    return False, vs

def maybe_set_role(msg):
    return msg[len("role:"):].strip() if msg.lower().startswith("role:") else None

# ---------- build / load vector store ----------
default_docs = load_default_context()
vstore = ensure_vstore_exists(default_docs)

# add default docs exactly once
if default_docs and not os.path.exists(FLAG):
    vstore = safe_add_documents(vstore, default_docs, persist=True)
    open(FLAG, "w").close()

# ---------- sidebar upload ----------
uploaded = st.sidebar.file_uploader("Upload PDFs / TXTs", ["pdf", "txt"], True)
if uploaded:
    new_docs = load_docs_from_upload(uploaded)
    vstore = safe_add_documents(vstore, new_docs, persist=True)
    st.sidebar.success(f"Added {len(uploaded)} new file(s) to the knowledge base.")

# ---------- retriever (only if we have a vector store) ----------
retriever = vstore.as_retriever(search_kwargs={"k": 6}) if vstore else None

# ---------- memory & QA chain ----------
memory = ConversationSummaryBufferMemory(
    llm=ChatOpenAI(api_key=API_KEY, model="gpt-4o-mini", temperature=0),
    max_token_limit=1500, return_messages=True,
)
llm = ChatOpenAI(api_key=API_KEY, model="gpt-4o-mini", temperature=0.1)

qa_chain = ConversationalRetrievalChain.from_llm(
    llm        = llm,
    retriever  = retriever,
    memory     = memory,
    combine_docs_chain_kwargs = {"prompt": None},  # we’ll overwrite per turn
)

# ---------- Streamlit session ----------
st.session_state.setdefault("persona", None)
st.session_state.setdefault("history", [])

# ---------- chat input ----------
msg = st.chat_input("Ask, or use memo:/remember:/role:")
if msg:
    # 1. persona?
    if (role := maybe_set_role(msg)):
        st.session_state.persona = role
        st.session_state.history.append(("assistant", f"✅ Persona set to **{role}**."))
    else:
        # 2. fact?
        handled, vstore = maybe_persist_fact(msg, vstore)
        if handled:
            reply = "📝 Stored permanently." if msg.lower().startswith("remember:") \
                    else "🗒️  Noted for this session."
            st.session_state.history.append(("assistant", reply))
        # 3. normal question
        else:
            if retriever is None and vstore:
                retriever = vstore.as_retriever(search_kwargs={"k": 6})
                qa_chain.retriever = retriever
            # guard: no docs at all
            if retriever is None:
                st.session_state.history.append(
                    ("assistant", "⚠️ No documents available. Upload a file first.")
                )
            else:
                # build system prompt
                system = ("Use ONLY the retrieved context and this conversation. "
                          "If you don’t have enough info, reply exactly:\n"
                          "`Sorry, there is not enough information in the documents or user input to answer your request.`")
                if st.session_state.persona:
                    system = f"You are replying *as* **{st.session_state.persona}**. " + system
                qa_chain.combine_docs_chain.llm_chain.prompt.messages[0].content = system

                answer = qa_chain.invoke({"question": msg})["answer"]
                st.session_state.history += [("user", msg), ("assistant", answer)]

# ---------- render history ----------
for role, content in st.session_state.history:
    st.chat_message(role).markdown(content)

if not st.session_state.history:
    st.info(
        "Upload docs or start chatting.\n\n"
        "* **memo:** fact for this session\n"
        "* **remember:** fact stored forever\n"
        "* **role:** adopt a persona"
    )