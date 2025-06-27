from langchain_openai import ChatOpenAI
from langchain_openai import OpenAIEmbeddings
from langchain_community.vectorstores import FAISS
from langchain_community.document_loaders import TextLoader
import os
from dotenv import load_dotenv

load_dotenv()  # Loads the .env file

# load API key from env
api_key = os.getenv("OPENAI_API_KEY")

# initialize LLM 
llm = ChatOpenAI(
    api_key=api_key,        
    model="gpt-4o-mini",  
    temperature=0.3,
)

# load documents
text_folder = "rag_files"
all_documents = []
for filename in os.listdir(text_folder):
    if filename.lower().endswith(".txt"):
        loader = TextLoader(os.path.join(text_folder, filename))
        all_documents.extend(loader.load())

# embeddings + FAISS
embeddings = OpenAIEmbeddings(api_key=api_key) 
vector_store = FAISS.from_documents(all_documents, embeddings)
retriever = vector_store.as_retriever()

from langchain_core.messages import SystemMessage, HumanMessage

def main():
    print("Welcome to the RAG Assistant. Type 'exit' to quit.\n")
    while True:
        user_input = input("You: ").strip()
        if user_input.lower() == "exit":
            print("Exiting…")
            break

        # NEW retriever method
        docs = retriever.invoke(user_input)
        context = "\n\n".join(d.page_content for d in docs)

        system_prompt = (
            "You are a helpful assistant. "
            "Use ONLY the following knowledge base context to answer the user. "
            "If the answer is not in the context, say you don't know.\n\n"
            f"Context:\n{context}"
        )

        # Use LC message objects
        messages = [
            SystemMessage(content=system_prompt),
            HumanMessage(content=user_input),
        ]

        result = llm.invoke(messages)
        print(f"\nAssistant: {result.content}\n")

if __name__ == "__main__":
    main()