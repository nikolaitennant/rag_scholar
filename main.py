import streamlit as st
from langchain_openai import ChatOpenAI, OpenAIEmbeddings
from langchain_community.vectorstores import FAISS
from langchain_community.document_loaders import TextLoader, PyPDFLoader
from langchain_core.messages import SystemMessage, HumanMessage
from dotenv import load_dotenv
import os
import tempfile

# Load env variables
load_dotenv()
api_key = os.getenv("OPENAI_API_KEY")

# Initialize or load persistent memory for "remembered" facts and default context index
if "memory_store" not in st.session_state:
    st.session_state["memory_facts"] = []  # permanent facts
if "session_facts" not in st.session_state:
    st.session_state["session_facts"] = []  # one-off facts
if "persona" not in st.session_state:
    st.session_state["persona"] = None

# Load and index default documents once
@st.cache_resource(show_spinner=False)
def load_and_index_defaults(folder="default_context"):
    docs = []
    if os.path.exists(folder):
        for fname in os.listdir(folder):
            path = os.path.join(folder, fname)
            loader = PyPDFLoader(path) if fname.lower().endswith(".pdf") else TextLoader(path)
            docs.extend(loader.load())
    embeddings = OpenAIEmbeddings(api_key=api_key)
    return FAISS.from_documents(docs, embeddings)

def load_uploaded_files(uploaded_files):
    if not uploaded_files:
        return []
    tmp = tempfile.mkdtemp()
    docs = []
    for f in uploaded_files:
        fp = os.path.join(tmp, f.name)
        with open(fp, "wb") as out:
            out.write(f.getbuffer())
        loader = PyPDFLoader(fp) if f.name.lower().endswith(".pdf") else TextLoader(fp)
        docs.extend(loader.load())
    return docs

st.set_page_config(page_title="Giulia's Law AI Assistant", page_icon="🤖")
st.title("🤖 Giulia's Law AI Assistant")

# Sidebar: uploads + persona + fact input
uploaded_files = st.sidebar.file_uploader(
    "Upload PDF or text files (persistent)", type=["pdf","txt"], accept_multiple_files=True
)
new_fact = st.sidebar.text_input("Add fact (memo: or remember: prefix)")
persona_input = st.sidebar.text_input("Set persona (role: prefix)")

# Process fact or persona commands
if new_fact:
    if new_fact.lower().startswith("remember:"):
        st.session_state.memory_facts.append(new_fact.split("remember:",1)[1].strip())
        st.success("Fact remembered permanently.")
    elif new_fact.lower().startswith("memo:"):
        st.session_state.session_facts.append(new_fact.split("memo:",1)[1].strip())
        st.info("Session fact added.")

if persona_input and persona_input.lower().startswith("role:"):
    st.session_state.persona = persona_input.split("role:",1)[1].strip()
    st.success(f"Persona set to {st.session_state.persona}.")

# Build retriever combining default + uploads + memory facts
default_index = load_and_index_defaults()
uploaded_docs = load_uploaded_files(uploaded_files)
combined_docs = []
if uploaded_docs:
    combined_docs.extend(uploaded_docs)
if st.session_state.memory_facts:
    # wrap memory facts as simple text docs
    combined_docs.extend([type("Doc", (), {"page_content": fact})() for fact in st.session_state.memory_facts])

# Rebuild index if new docs or facts added
@st.cache_resource(show_spinner=False, suppress_st_warning=True)
def build_vectorstore(default_index, dynamic_docs):
    vs = default_index
    if dynamic_docs:
        embeddings = OpenAIEmbeddings(api_key=api_key)
        vs = FAISS.from_documents(dynamic_docs, embeddings, index=default_index.index)
    return vs

vector_store = build_vectorstore(default_index, combined_docs)
retriever = vector_store.as_retriever()
llm = ChatOpenAI(api_key=api_key, model="gpt-4o-mini", temperature=0.0)

# Chat interface
if default_index.docstore._len == 0 and not uploaded_docs:
    st.info("Upload at least one document or add facts to start.")
else:
    st.success("Ready! Ask about your docs, remembered facts, or session facts below.")
    user_input = st.chat_input("Your question...")
    if user_input:
        # perform retrieval
        docs = retriever.invoke(user_input)
        context = "\n\n".join(d.page_content for d in docs)
        # collect user facts from prompt
        inline_facts = []
        # no splitting on sentences here, assume prompt facts remain present
        # Build prompt
        sys_msgs = []
        base = "You are a helpful legal assistant that answers strictly using provided context, remembered facts, session facts, and any facts stated in the current prompt. Do not hallucinate or invent any information."
        if st.session_state.persona:
            base += f" You should adopt the persona: {st.session_state.persona}."
        sys_msgs.append(SystemMessage(content=base))
        if context.strip():
            sys_msgs.append(SystemMessage(content=f"Context:\n{context}"))
        # add memory facts
        for fact in st.session_state.memory_facts:
            sys_msgs.append(SystemMessage(content=f"Remembered fact: {fact}"))
        # add session facts
        for fact in st.session_state.session_facts:
            sys_msgs.append(SystemMessage(content=f"Session fact: {fact}"))
        # add user inline prompt as human message
        sys_msgs.append(HumanMessage(content=user_input))
        # fallback if no context & no facts
        if not context.strip() and not st.session_state.memory_facts and not st.session_state.session_facts:
            st.warning("Sorry, there is not enough information in the documents or user input to answer your request.")
        else:
            response = llm.invoke(sys_msgs)
            st.session_state.chat_history = st.session_state.get("chat_history", []) + [("User", user_input), ("Assistant", response.content)]

    # display chat history
    for speaker, text in st.session_state.get("chat_history", []):
        st.chat_message("user" if speaker=="User" else "assistant").write(text)