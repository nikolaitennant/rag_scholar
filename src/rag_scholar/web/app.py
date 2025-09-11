"""Beautiful modern Streamlit UI for RAG Scholar."""

import asyncio
import os
from datetime import datetime

import httpx
import streamlit as st

from rag_scholar.config.settings import DomainType, get_settings

# Initialize settings
settings = get_settings()
API_BASE = f"http://localhost:{settings.api_port}{settings.api_prefix}"

# Domain colors and icons (configurable)
DOMAIN_CONFIG = {
    DomainType.GENERAL: {"icon": "General", "color": "#4A90E2"},
    DomainType.LAW: {"icon": "Law", "color": "#8B4513"},
    DomainType.SCIENCE: {"icon": "Science", "color": "#2E7D32"},
    DomainType.MEDICINE: {"icon": "Medicine", "color": "#D32F2F"},
    DomainType.BUSINESS: {"icon": "Business", "color": "#FF6F00"},
    DomainType.HUMANITIES: {"icon": "Humanities", "color": "#6A1B9A"},
    DomainType.COMPUTER_SCIENCE: {"icon": "Computer Science", "color": "#00897B"},
}


def setup_page():
    """Configure page with beautiful styling."""
    st.set_page_config(
        page_title=settings.ui_title,
        page_icon=settings.ui_page_icon,
        layout="wide",
        initial_sidebar_state="expanded",
    )
    
    # Modern CSS styling
    st.markdown("""
    <style>
    /* Import Google Fonts */
    @import url('https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700&display=swap');
    
    /* Global styles */
    .stApp {
        font-family: 'Inter', sans-serif;
    }
    
    /* Main container styling */
    .main {
        padding: 2rem;
        max-width: 1400px;
        margin: 0 auto;
    }
    
    /* Header styling */
    h1 {
        font-weight: 700;
        background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
        -webkit-background-clip: text;
        -webkit-text-fill-color: transparent;
        padding-bottom: 1rem;
    }
    
    h2, h3 {
        font-weight: 600;
        color: #2D3748;
    }
    
    /* Card styling */
    .css-1r6slb0 {
        background: white;
        border-radius: 12px;
        box-shadow: 0 4px 6px rgba(0, 0, 0, 0.07);
        padding: 1.5rem;
        border: 1px solid #E2E8F0;
    }
    
    /* Button styling */
    .stButton > button {
        background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
        color: white;
        border: none;
        padding: 0.5rem 1.5rem;
        border-radius: 8px;
        font-weight: 500;
        transition: transform 0.2s, box-shadow 0.2s;
    }
    
    .stButton > button:hover {
        transform: translateY(-2px);
        box-shadow: 0 6px 12px rgba(102, 126, 234, 0.3);
    }
    
    /* Primary button */
    [data-testid="stButton"] [kind="primary"] {
        background: linear-gradient(135deg, #48bb78 0%, #38a169 100%);
    }
    
    /* Chat message styling */
    .stChatMessage {
        background: white;
        border-radius: 12px;
        padding: 1rem;
        margin: 0.5rem 0;
        box-shadow: 0 2px 4px rgba(0, 0, 0, 0.05);
        border: 1px solid #E2E8F0;
    }
    
    /* Chat message styling with proper alignment */
    .stChatMessage {
        margin: 0.5rem 0 !important;
    }
    
    /* User messages - right aligned */
    .stChatMessage:has([data-testid="user"]) {
        display: flex !important;
        justify-content: flex-end !important;
        margin-left: 25% !important;
    }
    
    .stChatMessage:has([data-testid="user"]) > div {
        background: linear-gradient(135deg, #667eea 0%, #764ba2 100%) !important;
        color: white !important;
        border-radius: 18px 18px 4px 18px !important;
        padding: 12px 16px !important;
        max-width: 75% !important;
        text-align: left !important;
    }
    
    /* Assistant messages - left aligned */  
    .stChatMessage:has([data-testid="assistant"]) {
        display: flex !important;
        justify-content: flex-start !important;
        margin-right: 25% !important;
    }
    
    .stChatMessage:has([data-testid="assistant"]) > div {
        background: linear-gradient(135deg, #f8f9fa 0%, #e9ecef 100%) !important;
        color: #2D3748 !important;
        border-radius: 18px 18px 18px 4px !important;
        padding: 12px 16px !important;
        max-width: 75% !important;
        border: 1px solid #E2E8F0 !important;
    }
    
    /* Auto scroll to bottom */
    [data-testid="stChatMessageContainer"] {
        scroll-behavior: smooth !important;
    }
    </style>
    
    <style>
    /* Citation card */
    .citation-card {
        background: linear-gradient(135deg, #f0f4f8 0%, #e2e8f0 100%);
        border-radius: 8px;
        padding: 12px;
        margin: 8px 0;
        border-left: 3px solid #667eea;
        transition: transform 0.2s;
    }
    
    .citation-card:hover {
        transform: translateX(4px);
        box-shadow: 0 2px 8px rgba(0, 0, 0, 0.1);
    }
    
    /* Command hint card */
    .command-card {
        background: linear-gradient(135deg, #e6f7ff 0%, #bae7ff 100%);
        border-radius: 8px;
        padding: 1rem;
        margin: 1rem 0;
        border-left: 3px solid #1890ff;
    }
    
    /* Domain badge */
    .domain-badge {
        display: inline-block;
        padding: 6px 12px;
        border-radius: 20px;
        font-size: 0.875rem;
        font-weight: 600;
        margin: 4px;
    }
    
    /* Info cards */
    .info-card {
        background: white;
        border-radius: 8px;
        padding: 1rem;
        box-shadow: 0 2px 4px rgba(0, 0, 0, 0.05);
        border: 1px solid #E2E8F0;
        margin: 0.5rem 0;
    }
    
    .info-card-header {
        font-size: 0.75rem;
        font-weight: 600;
        text-transform: uppercase;
        color: #718096;
        margin-bottom: 4px;
    }
    
    .info-card-value {
        font-size: 1.125rem;
        font-weight: 700;
        color: #2D3748;
    }
    
    /* Sidebar styling */
    .css-1d391kg {
        background: linear-gradient(180deg, #f7fafc 0%, #edf2f7 100%);
        padding: 2rem 1rem;
    }
    
    /* Select box styling */
    .stSelectbox > div > div {
        background: white;
        border-radius: 8px;
        border: 1px solid #CBD5E0;
    }
    
    /* Input styling */
    .stTextInput > div > div > input {
        border-radius: 8px;
        border: 1px solid #CBD5E0;
    }
    
    /* File uploader */
    .stFileUploader > div {
        background: white;
        border-radius: 8px;
        border: 2px dashed #CBD5E0;
        transition: border-color 0.2s;
    }
    
    .stFileUploader > div:hover {
        border-color: #667eea;
    }
    
    /* Expander styling */
    .streamlit-expanderHeader {
        background: linear-gradient(135deg, #f7fafc 0%, #edf2f7 100%);
        border-radius: 8px;
        font-weight: 500;
    }
    
    /* Metrics styling */
    [data-testid="metric-container"] {
        background: white;
        padding: 1rem;
        border-radius: 8px;
        box-shadow: 0 2px 4px rgba(0, 0, 0, 0.05);
    }
    
    /* Tab styling */
    .stTabs [data-baseweb="tab-list"] {
        gap: 8px;
    }
    
    .stTabs [data-baseweb="tab"] {
        background: white;
        border-radius: 8px;
        padding: 8px 16px;
        border: 1px solid #E2E8F0;
    }
    
    .stTabs [aria-selected="true"] {
        background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
        color: white;
    }
    
    /* Spinner */
    .stSpinner > div {
        border-color: #667eea;
    }
    
    /* Success/Error/Warning/Info messages */
    .stAlert {
        border-radius: 8px;
        border-left: 4px solid;
    }
    
    [data-testid="stAlert"] [kind="success"] {
        background: #f0fdf4;
        border-left-color: #48bb78;
    }
    
    [data-testid="stAlert"] [kind="error"] {
        background: #fef2f2;
        border-left-color: #f56565;
    }
    
    [data-testid="stAlert"] [kind="warning"] {
        background: #fffbeb;
        border-left-color: #f59e0b;
    }
    
    [data-testid="stAlert"] [kind="info"] {
        background: #eff6ff;
        border-left-color: #3b82f6;
    }
    
    /* Markdown content */
    .stMarkdown {
        line-height: 1.6;
    }
    
    /* Code blocks */
    .stCodeBlock {
        border-radius: 8px;
        background: #1e1e1e;
    }
    
    /* Progress bar */
    .stProgress > div > div > div {
        background: linear-gradient(90deg, #667eea 0%, #764ba2 100%);
    }
    
    /* Divider */
    hr {
        border: none;
        border-top: 1px solid #E2E8F0;
        margin: 1.5rem 0;
    }
    
    /* Chat input positioning - simple responsive approach */
    .stChatInput {
        position: fixed !important;
        bottom: 30px !important;
        left: 20px !important;
        right: 20px !important;
        width: auto !important;
        max-width: 600px !important;
        margin: 0 auto !important;
        background: white !important;
        border: 1px solid #E2E8F0 !important;
        border-radius: 12px !important;
        padding: 8px !important;
        z-index: 1000 !important;
        box-shadow: 0 4px 12px rgba(0, 0, 0, 0.15) !important;
    }
    
    /* Add some breathing room around the input */
    .stChatInput > div {
        margin: 0;
        padding: 4px;
    }
    
    /* Chat container with space for fixed input */
    .main .block-container {
        padding-bottom: 120px;
        max-width: none;
    }
    
    /* Ensure messages container has proper spacing */
    [data-testid="stChatMessageContainer"] {
        margin-bottom: 20px;
    }
    </style>
    """, unsafe_allow_html=True)


def init_session_state():
    """Initialize session state."""
    defaults = {
        "session_id": os.urandom(16).hex(),
        "messages": [],
        "current_domain": DomainType.GENERAL,
        "active_class": "default",
        "selected_documents": [],
    }
    
    for key, value in defaults.items():
        if key not in st.session_state:
            st.session_state[key] = value


async def call_api(endpoint: str, method: str = "GET", **kwargs) -> dict:
    """Generic API caller."""
    async with httpx.AsyncClient(timeout=30.0) as client:
        func = getattr(client, method.lower())
        response = await func(f"{API_BASE}{endpoint}", **kwargs)
        return response.json() if response.status_code == 200 else None


def render_header():
    """Render beautiful header."""
    domain_config = DOMAIN_CONFIG[st.session_state.current_domain]
    
    col1, col2, col3 = st.columns([1, 3, 1])
    with col2:
        st.markdown(
            f"""
            <div style="text-align: center; padding: 2rem 0;">
                <h1 style="font-size: 2.5rem; margin-bottom: 0.5rem;">
                    {domain_config['icon']} RAG Scholar
                </h1>
                <p style="color: #718096; font-size: 1.125rem;">
                    Professional Research Assistant for {st.session_state.current_domain.value.replace('_', ' ').title()}
                </p>
            </div>
            """,
            unsafe_allow_html=True
        )


def render_sidebar():
    """Render beautiful sidebar."""
    with st.sidebar:
        # Logo section
        st.markdown(
            f"""
            <div style="text-align: center; padding: 1rem 0;">
                <h2 style="color: #2D3748;">{settings.app_name}</h2>
                <p style="color: #718096; font-size: 0.875rem;">
                    Advanced Research Assistant
                </p>
            </div>
            """,
            unsafe_allow_html=True
        )
        
        st.divider()
        
        # Domain selector
        st.markdown("### Research Domain")
        
        cols = st.columns(2)
        for i, domain in enumerate(DomainType):
            config = DOMAIN_CONFIG[domain]
            with cols[i % 2]:
                if st.button(
                    config['icon'],
                    key=f"domain_{domain.value}",
                    use_container_width=True,
                    type="primary" if domain == st.session_state.current_domain else "secondary",
                ):
                    st.session_state.current_domain = domain
                    st.rerun()
        
        st.divider()
        
        # Document Collections
        with st.expander("Document Collections", expanded=True):
            collections = asyncio.run(call_api("/documents/collections"))
            
            if collections:
                active_class = st.selectbox(
                    "Active Collection",
                    options=collections,
                    index=collections.index(st.session_state.active_class)
                    if st.session_state.active_class in collections else 0,
                    help="Select the document collection to work with",
                )
                
                if active_class != st.session_state.active_class:
                    st.session_state.active_class = active_class
                    st.rerun()
            
            # Create new collection
            with st.expander("+ Create New Collection"):
                new_collection = st.text_input("Collection Name")
                if st.button("Create", type="primary", use_container_width=True):
                    if new_collection:
                        st.success(f"Created: {new_collection}")
        
        # Document Library  
        with st.expander("Document Library", expanded=True):
            tab1, tab2 = st.tabs(["Upload", "Manage"])
            
            # UPLOAD TAB
            with tab1:
                st.markdown("**Upload Documents**")
                
                # Get allowed extensions without dots for streamlit
                allowed_types = [ext.lstrip('.') for ext in settings.allowed_file_types]
                
                uploaded_file = st.file_uploader(
                    "Choose file",
                    type=allowed_types,
                    help=f"Supported: {', '.join(settings.allowed_file_types)}",
                    key="doc_uploader"
                )
                
                if uploaded_file:
                    st.info(f"**{uploaded_file.name}** ({uploaded_file.size//1024}KB)")
                    st.caption(f"Will upload to: **{st.session_state.active_class}**")
                    
                    if st.button("Upload", type="primary", use_container_width=True):
                        with st.spinner("Processing document..."):
                            result = asyncio.run(
                                call_api(
                                    "/documents/upload",
                                    method="POST",
                                    files={"file": (uploaded_file.name, uploaded_file.read())},
                                    params={"collection": st.session_state.active_class},
                                )
                            )
                            if result:
                                st.success(f"Uploaded to {st.session_state.active_class}!")
                                st.rerun()
                            else:
                                st.error("Upload failed")
            
            # MANAGE TAB  
            with tab2:
                st.markdown("**Document Library**")
                
                if st.session_state.active_class:
                    documents = asyncio.run(call_api(f"/documents/collections/{st.session_state.active_class}/documents"))
                    
                    if documents:
                        st.caption(f"{len(documents)} documents in **{st.session_state.active_class}**")
                        
                        for doc in documents:
                            with st.container():
                                col1, col2, col3 = st.columns([2, 1, 1])
                                
                                with col1:
                                    # Clean filename display
                                    display_name = doc['filename'][:25] + "..." if len(doc['filename']) > 25 else doc['filename']
                                    st.markdown(f"**{display_name}**")
                                    st.caption(f"{doc['chunks']} chunks • {doc['size']//1024}KB • {doc['status']}")
                                
                                with col2:
                                    if st.button("🗑️", key=f"del_{doc['id']}", help="Delete", use_container_width=True):
                                        asyncio.run(call_api(
                                            f"/documents/collections/{st.session_state.active_class}/documents/{doc['id']}",
                                            method="DELETE"
                                        ))
                                        st.success("🗑️ Deleted!")
                                        st.rerun()
                                
                                with col3:
                                    if st.button("ℹ️", key=f"info_{doc['id']}", help="Info", use_container_width=True):
                                        st.info(f"""
                                        **{doc['filename']}**
                                        • Size: {doc['size']//1024}KB
                                        • Chunks: {doc['chunks']}
                                        • Status: {doc['status']}
                                        • ID: {doc['id'][:8]}...
                                        """)
                        
                        st.divider()
                        
                        # Collection actions
                        col1, col2 = st.columns(2)
                        with col1:
                            if st.button("🔄 Reindex", use_container_width=True):
                                with st.spinner("Reindexing collection..."):
                                    result = asyncio.run(call_api(
                                        f"/documents/collections/{st.session_state.active_class}/reindex",
                                        method="POST"
                                    ))
                                    if result:
                                        st.success(f"✅ {result['total_chunks']} chunks indexed")
                        
                        with col2:
                            if st.button("Stats", use_container_width=True):
                                total_size = sum(doc['size'] for doc in documents)
                                total_chunks = sum(doc['chunks'] for doc in documents)
                                st.info(f"{len(documents)} docs • {total_chunks} chunks • {total_size//1024}KB total")
                    else:
                        st.info("No documents in this collection")
                        st.caption("Upload documents using the Upload tab above")
                else:
                    st.warning("Select a collection first")
        
        # Session management
        with st.expander("Session", expanded=True):
            col1, col2 = st.columns(2)
            with col1:
                if st.button("🗑️ Clear Chat", use_container_width=True):
                    st.session_state.messages = []
                    st.rerun()
            
            with col2:
                if st.button("🆕 New Session", use_container_width=True):
                    st.session_state.session_id = os.urandom(16).hex()
                    st.session_state.messages = []
                    st.rerun()
            
            # Session info
            st.markdown(
                f"""
                <div class="info-card" style="margin-top: 1rem;">
                    <div class="info-card-header">Session ID</div>
                    <div class="info-card-value" style="font-size: 0.75rem; font-family: monospace;">
                        {st.session_state.session_id[:8]}...
                    </div>
                </div>
                """,
                unsafe_allow_html=True
            )
        
        # Special commands - moved to end per user request
        with st.expander("Special Commands", expanded=False):
            commands = [
                ("remember:", "Save fact permanently", "remember: Key fact here"),
                ("memo:", "Save for session only", "memo: Temporary note"),
                ("role:", "Set AI persona", "role: Expert professor"),
                ("background:", "General knowledge", "background: Explain concept"),
            ]
            
            for cmd, desc, example in commands:
                st.markdown(
                    f"""
                    <div class="command-card" style="margin: 0.5rem 0;">
                        <strong>{cmd}</strong><br>
                        <small style="color: #4A5568;">{desc}</small><br>
                        <code style="background: rgba(0,0,0,0.05); padding: 2px 4px; border-radius: 4px;">
                            {example}
                        </code>
                    </div>
                    """,
                    unsafe_allow_html=True
                )


def render_chat():
    """Render beautiful chat interface."""
    
    # Beautiful info cards
    col1, col2, col3, col4 = st.columns(4)
    
    domain_config = DOMAIN_CONFIG[st.session_state.current_domain]
    
    with col1:
        st.markdown(
            f"""
            <div class="info-card">
                <div class="info-card-header">Domain</div>
                <div class="info-card-value" style="color: {domain_config['color']};">
                    {domain_config['icon']}
                </div>
            </div>
            """,
            unsafe_allow_html=True
        )
    
    with col2:
        st.markdown(
            f"""
            <div class="info-card">
                <div class="info-card-header">Collection</div>
                <div class="info-card-value">
                    📁 {st.session_state.active_class}
                </div>
            </div>
            """,
            unsafe_allow_html=True
        )
    
    with col3:
        doc_count = len(st.session_state.selected_documents)
        st.markdown(
            f"""
            <div class="info-card">
                <div class="info-card-header">Documents</div>
                <div class="info-card-value">
                    📄 {doc_count if doc_count > 0 else 'All'}
                </div>
            </div>
            """,
            unsafe_allow_html=True
        )
    
    with col4:
        msg_count = len(st.session_state.messages)
        st.markdown(
            f"""
            <div class="info-card">
                <div class="info-card-header">Messages</div>
                <div class="info-card-value">
                    💬 {msg_count}
                </div>
            </div>
            """,
            unsafe_allow_html=True
        )
    
    st.divider()
    
    # Chat messages
    for msg in st.session_state.messages:
        with st.chat_message(msg["role"], avatar="🧑" if msg["role"] == "user" else "🎓"):
            st.markdown(msg["content"])
            
            # Beautiful citations
            if "citations" in msg and msg["citations"]:
                with st.expander(f"📎 View {len(msg['citations'])} Citations"):
                    for cite in msg["citations"]:
                        st.markdown(
                            f"""
                            <div class="citation-card">
                                <strong style="color: #2D3748;">
                                    [{cite['id']}] {cite['source']}
                                    {f" - Page {cite['page']}" if cite.get('page') else ""}
                                </strong><br>
                                <p style="margin-top: 8px; color: #4A5568; font-size: 0.9rem;">
                                    {cite['preview']}
                                </p>
                                <small style="color: #718096;">
                                    Relevance: {cite.get('relevance_score', 0):.2%}
                                </small>
                            </div>
                            """,
                            unsafe_allow_html=True
                        )
    
    # Push chat input to bottom
    st.markdown("<div style='margin-top: 10px;'></div>", unsafe_allow_html=True)
    
    # Chat input at bottom
    if prompt := st.chat_input("💭 Ask your research question or use a command..."):
        # Add user message
        st.session_state.messages.append({"role": "user", "content": prompt})
        
        with st.chat_message("user", avatar="🧑"):
            st.markdown(prompt)
        
        # Get response
        with st.chat_message("assistant", avatar="🎓"):
            with st.spinner("Researching..."):
                response = asyncio.run(
                    call_api(
                        "/chat/query",
                        method="POST",
                        json={
                            "query": prompt,
                            "domain": st.session_state.current_domain.value,
                            "session_id": st.session_state.session_id,
                            "selected_documents": st.session_state.selected_documents,
                        }
                    )
                )
                
                if response:
                    st.markdown(response["answer"])
                    
                    st.session_state.messages.append({
                        "role": "assistant",
                        "content": response["answer"],
                        "citations": response.get("citations", []),
                    })
                    
                    # Show citations
                    if response.get("citations"):
                        with st.expander(f"📎 View {len(response['citations'])} Citations"):
                            for cite in response["citations"]:
                                page_info = f" - Page {cite['page']}" if cite.get('page') else ""
                                st.markdown(
                                    f"""
                                    <div class="citation-card">
                                        <div style="color: #2D3748; font-weight: bold;">
                                            [{cite['id']}] {cite['source']}{page_info}
                                        </div>
                                        <div style="margin-top: 8px; color: #4A5568; font-size: 0.9rem;">
                                            {cite['preview']}
                                        </div>
                                        <div style="color: #718096; font-size: 0.8rem; margin-top: 4px;">
                                            Relevance: {cite.get('relevance_score', 0):.1%}
                                        </div>
                                    </div>
                                    """,
                                    unsafe_allow_html=True
                                )
                else:
                    st.error("Failed to get response. Please check the API connection.")


def main():
    """Main application."""
    setup_page()
    init_session_state()
    
    # Check API health
    try:
        health = asyncio.run(call_api("/health/"))
        if not health or health.get("status") != "healthy":
            st.error("❌ API is not healthy. Please check the backend.")
            st.stop()
    except:
        st.error("🔴 Cannot connect to API. Please start the backend server.")
        st.code("python -m rag_scholar.main", language="bash")
        st.stop()
    
    # Render UI
    render_header()
    render_sidebar()
    
    # Main chat area
    with st.container():
        render_chat()


if __name__ == "__main__":
    main()