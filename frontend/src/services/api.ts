import axios from 'axios';
import { ChatResponse, Document } from '../types';

const API_BASE = process.env.REACT_APP_API_URL || 'http://localhost:8000/api/v1';

const api = axios.create({
  baseURL: API_BASE,
  timeout: 30000,
});

// Request interceptor to add auth token
api.interceptors.request.use(
  (config) => {
    const token = localStorage.getItem('ragScholarToken');
    if (token) {
      config.headers.Authorization = `Bearer ${token}`;
    }
    return config;
  },
  (error) => {
    return Promise.reject(error);
  }
);

export const apiService = {
  // Health check
  health: async () => {
    const response = await api.get('/health/');
    return response.data;
  },

  // Authentication
  login: async (email: string, password: string) => {
    const response = await api.post('/auth/login', { email, password });
    return response.data;
  },

  register: async (email: string, password: string, name?: string) => {
    const response = await api.post('/auth/register', { email, password, name });
    return response.data;
  },

  logout: async () => {
    const response = await api.post('/auth/logout');
    return response.data;
  },

  // Chat
  chat: async (payload: {
    query: string;
    domain: string;
    session_id: string;
    selected_documents?: string[];
    active_class?: string;
    user_context?: {
      name: string;
      bio: string | null;
      research_interests: string[];
      preferred_domains: string[];
    } | null;
  }): Promise<ChatResponse> => {
    const response = await api.post('/chat/query', payload);
    return response.data;
  },

  // Collections
  getCollections: async (): Promise<string[]> => {
    const response = await api.get('/documents/collections');
    return response.data;
  },

  // Documents
  getDocuments: async (collection: string): Promise<Document[]> => {
    const response = await api.get(`/documents/collections/${collection}/documents`);
    return response.data;
  },

  uploadDocument: async (file: File, collection: string): Promise<any> => {
    const formData = new FormData();
    formData.append('file', file);
    
    const response = await api.post(
      `/documents/upload?collection=${collection}`,
      formData,
      {
        headers: {
          'Content-Type': 'multipart/form-data',
        },
      }
    );
    return response.data;
  },

  deleteDocument: async (collection: string, documentId: string): Promise<void> => {
    console.log(`Attempting to delete document at: /documents/collections/${collection}/documents/${documentId}`);
    const response = await api.delete(`/documents/collections/${collection}/documents/${documentId}`);
    console.log('Delete response:', response);
    return response.data;
  },

  updateDocumentName: async (documentId: string, newName: string): Promise<any> => {
    const response = await api.put(`/documents/${documentId}`, { filename: newName });
    return response.data;
  },

  reindexCollection: async (collection: string): Promise<any> => {
    const response = await api.post(`/documents/collections/${collection}/reindex`);
    return response.data;
  },

  // Sessions
  getSessions: async (): Promise<any[]> => {
    const response = await api.get('/sessions/');
    return response.data;
  },

  createSession: async (name?: string, domain?: string, classId?: string, className?: string): Promise<any> => {
    const response = await api.post('/sessions/', {
      name,
      domain,
      class_id: classId,
      class_name: className
    });
    return response.data;
  },

  getSession: async (sessionId: string): Promise<any> => {
    const response = await api.get(`/sessions/${sessionId}`);
    return response.data;
  },

  updateSession: async (sessionId: string, name: string): Promise<any> => {
    const response = await api.put(`/sessions/${sessionId}`, { name });
    return response.data;
  },

  updateSessionName: async (sessionId: string, name: string): Promise<any> => {
    return apiService.updateSession(sessionId, name);
  },

  deleteSession: async (sessionId: string): Promise<void> => {
    await api.delete(`/sessions/${sessionId}`);
  },

  deleteSessionsByClass: async (classId: string): Promise<any> => {
    const response = await api.delete(`/sessions/class/${classId}`);
    return response.data;
  },

  createClassWithDocuments: async (name: string, domain?: string, selectedDocuments?: string[]): Promise<any> => {
    const response = await api.post('/sessions/create-class', {
      name,
      domain: domain || 'general',
      selected_documents: selectedDocuments || []
    });
    return response.data;
  },

  transferDocuments: async (classId: string, documentIds: string[]): Promise<any> => {
    const response = await api.post('/sessions/transfer-documents', {
      class_id: classId,
      document_ids: documentIds
    });
    return response.data;
  },
};

// Error interceptor
api.interceptors.response.use(
  (response: any) => response,
  (error: any) => {
    console.error('API Error:', error.response?.data || error.message);
    throw error;
  }
);