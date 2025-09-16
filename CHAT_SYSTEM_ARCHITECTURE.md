# RAG Scholar Chat System Architecture

## Overview
The RAG Scholar chat system is a sophisticated document-based Q&A system that combines Retrieval Augmented Generation (RAG) with personalized user contexts, domain-specific prompting, and class-based document filtering.

## Core Concepts

### 1. Domain vs Class Architecture
- **Domains**: Determine the prompt variation that the RAG LLM receives (e.g., GENERAL, HISTORY, SCIENCE, LAW)
- **Classes**: User-created collections containing specific documents (e.g., "History 1201", "Biology 101", "Legal Research Project")
- **Relationship**: Each class belongs to a domain type, inheriting its prompt style while maintaining its own document collection

### 2. Session Management
Sessions store both domain and class information to ensure proper context restoration:
```typescript
interface Session {
  id: string;
  name: string;
  class_id: string;        // ID of the UserDomain/class
  class_name: string;      // Name of the class (e.g., "History 1201")
  domain: DomainType;      // Domain type for prompt variation
  messages: Message[];
  created_at: string;
  updated_at: string;
}
```

## System Flow

### 1. Session Creation
```typescript
// Frontend (App.tsx:194-199)
const newSession = await apiService.createSession(
  undefined,                           // name (auto-generated)
  activeDomain?.type || DomainType.GENERAL,  // domain type for prompting
  activeDomain?.id,                    // class ID for document filtering
  activeDomain?.name || 'General'      // class name for display
);
```

### 2. Chat Query Processing
```typescript
// Frontend sends (App.tsx:225-231)
const response = await apiService.chat({
  query: content,
  domain: activeDomain?.type || DomainType.GENERAL,    // Controls prompt variation
  session_id: effectiveSessionId,
  selected_documents: activeDomain?.documents || [],    // Specific documents if any
  active_class: activeDomain?.name || 'General',       // Controls document collection
  user_context: { /* user profile data */ }
});
```

### 3. Backend Processing (enhanced_chat_service.py:195-222)
1. **Domain Handler**: Gets domain-specific prompt enhancement
2. **Collection Selection**: Uses `active_class` as collection name for document filtering
3. **Document Retrieval**: Searches only within the specified class collection
4. **LLM Processing**: Combines domain-enhanced prompt with retrieved documents

```python
# Document retrieval is filtered by class
collection = active_class or session.get("active_class") or domain.value
retrieved_docs = await self.retrieval_service.retrieve(
    query=enhanced_query,
    collection=collection,        # Only searches this class's documents
    selected_files=selected_documents,
    k=self.settings.retrieval_k,
)
```

### 4. Session Restoration
When loading a saved session:
```typescript
// App.tsx:492-511
if (sessionData.class_id) {
  // Find the specific class/domain that was used in this session
  const sessionDomain = userDomains.find(domain => domain.id === sessionData.class_id);
  if (sessionDomain) {
    setActiveDomain(sessionDomain);  // Restores both domain and class context
  }
}
```

## RAG Context Components

### 1. Domain-Specific Prompting
Each domain type provides specialized prompt enhancements:
- **GENERAL**: Basic academic assistance
- **HISTORY**: Historical context and analysis
- **SCIENCE**: Scientific methodology and technical accuracy
- **LAW**: Legal reasoning and citation standards

### 2. User Context Integration
The system includes personalized context:
```typescript
user_context: {
  name: user.name,
  bio: user.profile?.bio || null,
  research_interests: user.profile?.research_interests || [],
  timezone: user.profile?.timezone || 'UTC',
  degree: user.profile?.degree || null,
  institution: user.profile?.institution || null
}
```

### 3. Session Memory
Each session maintains:
- **Memory Facts**: Permanently stored user preferences and information
- **Session Facts**: Temporary facts for the current conversation
- **Persona**: Role-based behavior modifications
- **Domain Context**: Current domain and class selection

### 4. Document Filtering
Documents are organized by class collections:
- Each `UserDomain` (class) contains a `documents: string[]` array
- RAG retrieval is limited to documents within the active class
- Users can have multiple classes within the same domain type

## Special Commands

### Memory Commands
- `remember: [fact]` - Permanently store information across sessions
- `memo: [fact]` - Store information for current session only

### Behavior Commands
- `role: [persona]` - Set AI persona/behavior style
- `background: [query]` - Get general knowledge answers without document citations

## API Endpoints

### Session Management
- `POST /sessions/` - Create new session with domain and class info
- `GET /sessions/{id}` - Retrieve session with full context
- `PUT /sessions/{id}` - Update session metadata

### Chat Processing
- `POST /chat/query` - Process single chat query with RAG
- `POST /chat/stream` - Stream chat responses in real-time

## File Structure

### Frontend
- `App.tsx`: Main session management and domain/class coordination
- `components/ChatInterface.tsx`: Chat UI and message display
- `components/Sidebar.tsx`: Domain/class management and session list
- `services/api.ts`: API communication layer
- `types.ts`: TypeScript interfaces for domain and session structures

### Backend
- `api/routes/chat.py`: Chat endpoint definitions
- `api/routes/sessions.py`: Session management endpoints
- `services/enhanced_chat_service.py`: Core chat processing logic
- `services/retrieval_service.py`: Document retrieval and RAG implementation
- `core/domains.py`: Domain-specific prompt enhancement

## Data Flow Summary

1. **User selects class** → Frontend sets `activeDomain` with class info
2. **User sends message** → Session created/retrieved with domain + class metadata
3. **Chat request sent** → Backend receives domain type + active class name
4. **Document retrieval** → RAG searches only within the class collection
5. **Response generation** → Domain-enhanced prompt + class-specific documents + user context
6. **Session storage** → Full context saved for restoration
7. **Session restoration** → Domain and class context fully restored from metadata

This architecture ensures that:
- Each chat is properly contextualized to both domain prompting style and class document scope
- Sessions persist and restore complete context including domain and class information
- Document access is strictly limited to the relevant class collection
- User personalization is maintained across all interactions