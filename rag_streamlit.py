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

st.set_page_config(page_title="Guilia's AI Assistant", page_icon="🤖")
st.title("🤖 Guilia's AI Assistant")
st.markdown("Upload your `.txt` or `.pdf` documents below and chat with them!")

# Sidebar for file upload
st.markdown("""
Upload your `.txt` or `.pdf` documents below and chat with them!

:warning: **This assistant ONLY uses the information found in your uploaded documents.**
If the answer is not present in your documents, it will let you know.
""")

# Chat history for nicer UI
if "chat_history" not in st.session_state:
    st.session_state.chat_history = []

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

if uploaded_files:
    # Load and embed docs
    all_documents = load_uploaded_files(uploaded_files)
    embeddings = OpenAIEmbeddings(api_key=api_key)
    vector_store = FAISS.from_documents(all_documents, embeddings)
    retriever = vector_store.as_retriever()
    llm = ChatOpenAI(api_key=api_key, model="gpt-4o-mini", temperature=0.3)
    
    st.success("Documents uploaded and indexed! Ask your questions below:")

    # User chat input
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
        # Add to chat history
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