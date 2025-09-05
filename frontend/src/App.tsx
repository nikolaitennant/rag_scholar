import React, { useState, useEffect, useCallback } from 'react';
import { AlertCircle } from 'lucide-react';
import { ChatInterface } from './components/ChatInterface';
import { DocumentManager } from './components/DocumentManager';
import { Sidebar } from './components/Sidebar';
import { apiService } from './services/api';
import { Message, DomainType, Document } from './types';

function App() {
  const [messages, setMessages] = useState<Message[]>([]);
  const [currentDomain, setCurrentDomain] = useState<DomainType>(DomainType.GENERAL);
  const [collections, setCollections] = useState<string[]>([]);
  const [activeCollection, setActiveCollection] = useState<string>('default');
  const [documents, setDocuments] = useState<Document[]>([]);
  const [sessionId, setSessionId] = useState<string>(() => 
    Math.random().toString(36).substring(2) + Date.now().toString(36)
  );
  const [isLoading, setIsLoading] = useState(false);
  const [apiError, setApiError] = useState<string | null>(null);

  // Load initial data
  const loadCollections = useCallback(async () => {
    try {
      const cols = await apiService.getCollections();
      setCollections(cols);
      if (cols.length > 0 && !cols.includes(activeCollection)) {
        setActiveCollection(cols[0]);
      }
    } catch (error) {
      console.error('Failed to load collections:', error);
    }
  }, [activeCollection]);

  const loadDocuments = useCallback(async () => {
    if (!activeCollection) return;
    try {
      const docs = await apiService.getDocuments(activeCollection);
      setDocuments(docs);
    } catch (error) {
      console.error('Failed to load documents:', error);
      setDocuments([]);
    }
  }, [activeCollection]);

  const checkApiHealth = useCallback(async () => {
    try {
      await apiService.health();
      setApiError(null);
    } catch (error) {
      setApiError('Cannot connect to API. Please check if the backend is running.');
    }
  }, []);

  useEffect(() => {
    checkApiHealth();
    loadCollections();
  }, [checkApiHealth, loadCollections]);

  useEffect(() => {
    loadDocuments();
  }, [loadDocuments]);

  // Handlers
  const handleSendMessage = async (content: string) => {
    const userMessage: Message = { role: 'user', content };
    setMessages(prev => [...prev, userMessage]);
    setIsLoading(true);

    try {
      const response = await apiService.chat({
        query: content,
        domain: currentDomain,
        session_id: sessionId,
      });

      const assistantMessage: Message = {
        role: 'assistant',
        content: response.answer,
        citations: response.citations,
      };

      setMessages(prev => [...prev, assistantMessage]);
    } catch (error) {
      const errorMessage: Message = {
        role: 'assistant',
        content: 'Sorry, I encountered an error processing your request. Please try again.',
      };
      setMessages(prev => [...prev, errorMessage]);
    } finally {
      setIsLoading(false);
    }
  };

  const handleUploadDocument = async (file: File) => {
    setIsLoading(true);
    try {
      await apiService.uploadDocument(file, activeCollection);
      await loadDocuments();
    } catch (error) {
      console.error('Upload failed:', error);
    } finally {
      setIsLoading(false);
    }
  };

  const handleDeleteDocument = async (documentId: string) => {
    try {
      await apiService.deleteDocument(activeCollection, documentId);
      await loadDocuments();
    } catch (error) {
      console.error('Delete failed:', error);
    }
  };

  const handleReindexCollection = async () => {
    setIsLoading(true);
    try {
      await apiService.reindexCollection(activeCollection);
      await loadDocuments();
    } catch (error) {
      console.error('Reindex failed:', error);
    } finally {
      setIsLoading(false);
    }
  };

  const handleCreateCollection = async (name: string) => {
    // For now, just refresh collections - the backend will create it on first upload
    await loadCollections();
    setActiveCollection(name);
  };

  const handleClearChat = () => {
    setMessages([]);
  };

  const handleNewSession = () => {
    setSessionId(Math.random().toString(36).substring(2) + Date.now().toString(36));
    setMessages([]);
  };

  if (apiError) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="bg-white p-8 rounded-lg shadow-md max-w-md w-full mx-4">
          <AlertCircle className="w-12 h-12 text-red-500 mx-auto mb-4" />
          <h2 className="text-xl font-semibold text-gray-900 text-center mb-2">
            Connection Error
          </h2>
          <p className="text-gray-600 text-center mb-4">
            {apiError}
          </p>
          <div className="text-center">
            <button
              onClick={checkApiHealth}
              className="btn-primary"
            >
              Try Again
            </button>
          </div>
          <div className="mt-4 p-3 bg-gray-50 rounded text-sm">
            <p className="font-medium">To start the backend:</p>
            <code className="block mt-1 text-xs bg-gray-800 text-white p-2 rounded">
              python -m rag_scholar.main
            </code>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50 flex">
      <Sidebar
        currentDomain={currentDomain}
        onDomainChange={setCurrentDomain}
        collections={collections}
        activeCollection={activeCollection}
        onCollectionChange={setActiveCollection}
        onCreateCollection={handleCreateCollection}
        sessionId={sessionId}
        messageCount={messages.length}
        onClearChat={handleClearChat}
        onNewSession={handleNewSession}
      />
      
      <div className="flex-1 flex">
        <DocumentManager
          documents={documents}
          activeCollection={activeCollection}
          onUpload={handleUploadDocument}
          onDelete={handleDeleteDocument}
          onReindex={handleReindexCollection}
          isLoading={isLoading}
        />
        
        <ChatInterface
          messages={messages}
          onSendMessage={handleSendMessage}
          isLoading={isLoading}
          currentDomain={currentDomain}
          activeCollection={activeCollection}
        />
      </div>
    </div>
  );
}

export default App;
