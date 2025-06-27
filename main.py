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
st.set_page_config(page_title="Giulia's Law AI Assistant", page_icon="🤖")
st.title("🤖 Giulia's Law AI Assistant")

# Simple, unstyled upload instruction
st.markdown("Upload your .txt or .pdf documents and chat with them!")

# Blue info box with styling
st.markdown("""
<div style='margin-top: 20px; padding: 16px 18px; background: #e7f3fc; border-radius: 9px; border-left: 5px solid #2574a9; color: #184361; font-size: 1.05rem;'>
  <b>ℹ️  This assistant ONLY uses information from your uploaded documents and <span style="color:#1c853b;">preloaded default context</span> (such as your CV and course info—already included, <u>no need to upload</u>).</b>
  <br><br>
    If the answer is not present in your documents or the preloaded context, it will let you know.<br>
    <span style="color:#d97706;"><b>It will <u>not</u> invent or make up any information.</b></span><br>
    You can upload multiple files at once, and their content will be combined for answering your questions.<br>
    <br>
    <b>✨ Tip:</b> For the best results, upload documents that contain the details you want to ask about.
  </div>
</div>
""", unsafe_allow_html=True)

# --- Functions to load documents ---

def load_uploaded_files(uploaded_files):
    temp_folder = tempfile.mkdtemp()
    all_documents = []
    for uploaded_file in uploaded_files:
        file_path = os.path.join(temp_folder, uploaded_file.name)
        with open(file_path, "wb") as f:
            f.write(uploaded_file.getbuffer())
        if uploaded_file.name.lower().endswith(".pdf"):
            loader = PyPDFLoader(file_path)
            all_documents.extend(loader.load())
        else:
            loader = TextLoader(file_path)
            all_documents.extend(loader.load())
    return all_documents

def load_default_context(folder="default_context"):
    all_documents = []
    if not os.path.exists(folder):
        return all_documents
    for filename in os.listdir(folder):
        file_path = os.path.join(folder, filename)
        if filename.lower().endswith(".pdf"):
            loader = PyPDFLoader(file_path)
            all_documents.extend(loader.load())
        elif filename.lower().endswith(".txt"):
            loader = TextLoader(file_path)
            all_documents.extend(loader.load())
    return all_documents

# --- File upload UI ---

uploaded_files = st.sidebar.file_uploader(
    "Upload your text or PDF files here", type=["txt", "pdf"], accept_multiple_files=True
)

# --- Chat history state ---
if "chat_history" not in st.session_state:
    st.session_state.chat_history = []

# --- Main logic ---
default_documents = load_default_context("default_context")
uploaded_documents = load_uploaded_files(uploaded_files) if uploaded_files else []
all_documents = default_documents + uploaded_documents

if all_documents:
    embeddings = OpenAIEmbeddings(api_key=api_key)
    vector_store = FAISS.from_documents(all_documents, embeddings)
    retriever = vector_store.as_retriever()
    llm = ChatOpenAI(api_key=api_key, model="gpt-4o-mini", temperature=0.3)
    
    if default_documents and uploaded_documents:
        st.success("Default and uploaded documents loaded! Ask your questions below:")
    elif default_documents:
        st.success("Default context loaded (CV, course info, etc)! Ask your questions below:")
    elif uploaded_documents:
        st.success("Uploaded documents loaded! Ask your questions below:")

    user_input = st.chat_input("Ask something about your docs...")
    if user_input:
        docs = retriever.invoke(user_input)
        context = "\n\n".join(d.page_content for d in docs)
        system_prompt = (
            "You are a helpful assistant. "
            "You must answer ONLY using the provided knowledge base context. "
            "If there is not enough information to fulfill the user's request, respond with the following:\n"
            "'Sorry, there is not enough information in the documents to answer your request.'\n"
            "Do not make up or invent any information or details. Only use what is present in the context below.\n\n"
            f"Context:\n{context}"
        )
        messages = [
            SystemMessage(content=system_prompt),
            HumanMessage(content=user_input)
        ]
        result = llm.invoke(messages)
        st.session_state.chat_history.append(("You", user_input))
        st.session_state.chat_history.append(("Assistant", result.content))
    
    # Display chat history
    for role, message in st.session_state.chat_history:
        if role == "You":
            st.chat_message("user").write(message)
        else:
            st.chat_message("assistant").write(message)
else:
    st.info("Upload at least one .txt or .pdf file to start chatting.")