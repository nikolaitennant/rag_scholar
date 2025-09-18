# RAG Scholar: Comprehensive Architecture Documentation

## Overview

RAG Scholar is a professional research assistant application built using Retrieval-Augmented Generation (RAG) technology. It allows users to upload documents, create topic-specific classes, and interact with their knowledge base through an intelligent chat interface.

## System Architecture

### High-Level Architecture

```
Frontend (React/TypeScript)
    ↓ HTTP/WebSocket
Backend (FastAPI/Python)
    ↓ API Calls
LangChain Framework
    ↓ Vector Operations
Google Firestore (Vector Store)
    ↓ Authentication
Firebase Auth
    ↓ Embeddings
OpenAI API
```

### Core Technologies

**Backend Stack:**
- **FastAPI**: Modern Python web framework for APIs
- **LangChain**: Framework for building applications with large language models
- **Google Firestore**: NoSQL document database with native vector search capabilities
- **OpenAI**: Embeddings and language model provider
- **Firebase Auth**: Authentication and user management
- **Structlog**: Structured logging for debugging and monitoring

**Frontend Stack:**
- **React 18**: Modern JavaScript library for building user interfaces
- **TypeScript**: Type-safe JavaScript development
- **Tailwind CSS**: Utility-first CSS framework
- **Lucide React**: Modern icon library
- **React Context API**: State management

## Data Storage Architecture

### Firestore Document Structure

RAG Scholar uses a user-scoped data architecture in Google Firestore:

```
users/
  {user_id}/
    documents/
      {document_id}
        - filename: string
        - document_id: string
        - upload_date: timestamp
        - file_type: string
        - chunks_count: number
        - assigned_classes: string[]
        - metadata: object

    chunks/
      {chunk_id}
        - content: string (document text chunk)
        - metadata: object
        - embedding: vector[1536] (OpenAI embedding)
        - document_id: string
        - class_filter: string[]

    classes/
      {class_id}
        - name: string
        - type: DomainType
        - description: string
        - document_ids: string[]
        - created_at: timestamp

    profile/
      - stats: UserStats
      - achievements: Achievement[]
      - preferences: object
      - created_at: timestamp
```

### Vector Storage

**Embedding Model**: OpenAI `text-embedding-ada-002` (1536 dimensions)

**Chunking Strategy**:
- Chunk Size: 1000 characters
- Chunk Overlap: 200 characters
- Separators: `["\n\n", "\n", " ", ""]`

**Vector Search**: Firestore's native vector similarity search with cosine similarity

## Core Features

### 1. Document Management

**Supported File Types**:
- PDF (.pdf)
- Microsoft Word (.docx)
- Plain Text (.txt)
- Markdown (.md)
- CSV (.csv)
- Google Cloud Storage files

**Processing Pipeline**:
1. File upload via multipart form data
2. Document loading using LangChain loaders
3. Text splitting into semantic chunks
4. Embedding generation via OpenAI API
5. Storage in user-scoped Firestore collection
6. Metadata indexing for retrieval

### 2. Class-Based Organization

**Domain Types**:
- General
- Law
- Science
- Medicine
- Business
- Humanities
- Computer Science

**Class Features**:
- Document assignment and filtering
- Topic-specific retrieval
- Contextual chat sessions
- Performance analytics per class

### 3. RAG Chat Interface

**Chat Flow**:
1. User submits query
2. Query embedding generation
3. Vector similarity search in user's chunks
4. Context retrieval with relevance scoring
5. Prompt construction with retrieved context
6. LLM response generation
7. Citation and source attribution

**Retrieval Parameters**:
- Default k=5 most relevant chunks
- Class-based filtering when active
- Relevance score threshold
- Context window optimization

### 4. Authentication & User Management

**Firebase Auth Integration**:
- Email/password authentication
- JWT token validation
- User session management
- Secure API access control

**User Profiles**:
- Research activity tracking
- Achievement system
- Preference management
- Usage analytics

## LangChain Integration

### Key Components

**Document Loaders**:
```python
loader_map = {
    ".pdf": PyPDFLoader,
    ".docx": Docx2txtLoader,
    ".txt": TextLoader,
    ".md": UnstructuredMarkdownLoader,
    ".csv": CSVLoader,
}
```

**Vector Store**:
```python
FirestoreVectorStore(
    collection=f"users/{user_id}/chunks",
    embedding=OpenAIEmbeddings(),
    distance_strategy=DistanceStrategy.COSINE
)
```

**Text Splitter**:
```python
RecursiveCharacterTextSplitter(
    chunk_size=1000,
    chunk_overlap=200,
    separators=["\n\n", "\n", " ", ""]
)
```

### Retrieval Chain

1. **Query Processing**: User query normalization and analysis
2. **Embedding**: Convert query to vector representation
3. **Vector Search**: Firestore similarity search with metadata filtering
4. **Context Assembly**: Combine relevant chunks with source attribution
5. **Prompt Engineering**: Structured prompt with context and instructions
6. **Generation**: OpenAI GPT response with citations
7. **Post-processing**: Format response and extract source references

## Security & Compliance

### Data Protection
- User data isolation through Firestore subcollections
- Firebase Auth JWT validation on all requests
- No cross-user data access possible
- Secure API key management
- HTTPS enforcement

### Privacy
- Documents stored encrypted in Firestore
- No document content shared between users
- User sessions managed securely
- Activity logging with privacy controls

## Performance Optimizations

### Backend
- **Per-request Initialization**: LangChain components initialized on demand
- **Connection Pooling**: Efficient Firestore connection management
- **Async Processing**: FastAPI async support for concurrent requests
- **Caching**: Response caching for repeated queries
- **Structured Logging**: Performance monitoring and debugging

### Frontend
- **Component Optimization**: React.memo and useMemo for expensive operations
- **State Management**: Efficient context-based state updates
- **Bundle Optimization**: Code splitting and lazy loading
- **Network Optimization**: Request batching and caching

### Database
- **Indexed Queries**: Firestore composite indexes for fast retrieval
- **Vector Search**: Native Firestore vector similarity search
- **Batch Operations**: Bulk document processing
- **Schema Optimization**: Efficient document structure

## Deployment Architecture

### Development
- Local FastAPI development server
- React development server with hot reload
- Local Firestore emulator for testing
- Environment variable configuration

### Production
- **Backend**: Cloud Run containerized deployment
- **Frontend**: Static hosting (Netlify/Vercel)
- **Database**: Production Firestore
- **CDN**: Global content delivery
- **Monitoring**: Cloud Logging and Error Reporting

## API Endpoints

### Authentication
- `GET /api/v1/me` - Get current user profile

### Document Management
- `POST /api/v1/documents/upload` - Upload new document
- `GET /api/v1/documents/` - List user documents
- `DELETE /api/v1/documents/{document_id}` - Delete document
- `GET /api/v1/documents/collections` - List document collections

### Chat & Retrieval
- `POST /api/v1/chat/chat` - Submit chat query with RAG
- `GET /api/v1/health/` - Health check endpoint

### System
- `GET /api/v1/health/ready` - Readiness probe

## Configuration

### Environment Variables

**Backend (.env)**:
```env
OPENAI_API_KEY=your_openai_key
GOOGLE_CLOUD_PROJECT=your_gcp_project
FIREBASE_CREDENTIALS_PATH=path_to_credentials
LOG_LEVEL=INFO
CHUNK_SIZE=1000
CHUNK_OVERLAP=200
EMBEDDING_MODEL=text-embedding-ada-002
```

**Frontend (.env)**:
```env
REACT_APP_API_URL=https://api.ragscholar.ai/api/v1
REACT_APP_FIREBASE_API_KEY=your_firebase_key
REACT_APP_FIREBASE_AUTH_DOMAIN=your_domain
REACT_APP_FIREBASE_PROJECT_ID=your_project_id
```

## Future Enhancements

### Planned Features
- **Advanced Analytics**: Usage patterns and research insights
- **Collaboration**: Shared classes and document collections
- **Export Options**: Research reports and citation management
- **Integration APIs**: Third-party research tool connections
- **Mobile App**: iOS and Android native applications
- **Advanced RAG**: Multi-modal document support and graph RAG

### Technical Improvements
- **Performance**: Query response optimization and caching
- **Scalability**: Multi-region deployment and load balancing
- **AI Capabilities**: Fine-tuned models and custom embeddings
- **Search Enhancement**: Hybrid search with keyword + vector
- **Real-time Features**: Live collaboration and notifications

---

*This documentation reflects the current architecture of RAG Scholar v2.0.0. For technical support or architecture questions, please refer to the development team.*