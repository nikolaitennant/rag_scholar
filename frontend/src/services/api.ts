import axios from 'axios';
import { ChatResponse, Document } from '../types';

const API_BASE = process.env.REACT_APP_API_URL || 'http://localhost:8000/api/v1';

const api = axios.create({
  baseURL: API_BASE,
  timeout: 30000,
});

export const apiService = {
  // Health check
  health: async () => {
    const response = await api.get('/health/');
    return response.data;
  },

  // Chat
  chat: async (payload: {
    query: string;
    domain: string;
    session_id: string;
    selected_documents?: string[];
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

  reindexCollection: async (collection: string): Promise<any> => {
    const response = await api.post(`/documents/collections/${collection}/reindex`);
    return response.data;
  },
};

// Error interceptor
api.interceptors.response.use(
  (response) => response,
  (error) => {
    console.error('API Error:', error.response?.data || error.message);
    throw error;
  }
);