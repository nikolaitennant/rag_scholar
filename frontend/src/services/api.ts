import axios from 'axios';
import { ChatResponse, Document } from '../types';
import { auth } from '../config/firebase';

const API_BASE = process.env.REACT_APP_API_URL || 'http://localhost:8000/api/v1';

const api = axios.create({
  baseURL: API_BASE,
  timeout: 30000,
});

// Request interceptor to add Firebase auth token
api.interceptors.request.use(
  async (config) => {
    const currentUser = auth.currentUser;
    console.log('🔍 API: currentUser:', currentUser ? 'exists' : 'null');
    if (currentUser) {
      const token = await currentUser.getIdToken();
      config.headers.Authorization = `Bearer ${token}`;
      console.log('🔍 API: Added auth token');
    } else {
      console.log('🔍 API: No currentUser - skipping auth token');
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

  // Chat - Updated to match new backend
  chat: async (payload: {
    query: string;
    session_id?: string;
    class_id?: string;
    k?: number;
  }): Promise<ChatResponse> => {
    const response = await api.post('/chat/chat', payload);
    return response.data;
  },

  // Documents - Simplified to match new backend
  getDocuments: async (): Promise<Document[]> => {
    const response = await api.get('/documents/');
    return response.data;
  },

  uploadDocument: async (file: File, collection: string = 'database'): Promise<any> => {
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

  deleteDocument: async (documentId: string): Promise<void> => {
    const response = await api.delete(`/documents/${documentId}`);
    return response.data;
  },

  assignDocumentToClass: async (
    documentId: string,
    documentSource: string,
    classId: string,
    operation: 'add' | 'remove' = 'add'
  ): Promise<any> => {
    const response = await api.post(`/documents/${documentId}/assign-class`, {
      document_source: documentSource,
      class_id: classId,
      operation
    });
    return response.data;
  },

  // Collections - Returns empty array per backend
  getCollections: async (): Promise<string[]> => {
    const response = await api.get('/documents/collections');
    return response.data;
  },

  // User Profile
  getCurrentUser: async (): Promise<any> => {
    const response = await api.get('/me');
    return response.data;
  },

  getUserProfile: async (): Promise<any> => {
    const response = await api.get('/me');
    return response.data;
  },

  grantEarlyAdopter: async (): Promise<any> => {
    const response = await api.post('/grant-early-adopter');
    return response.data;
  },

  // Sessions
  getSessions: async (): Promise<any[]> => {
    const response = await api.get('/sessions');
    return response.data;
  },

  updateSession: async (sessionId: string, data: { name?: string }): Promise<any> => {
    const response = await api.put(`/sessions/${sessionId}`, data);
    return response.data;
  },

  deleteSession: async (sessionId: string): Promise<void> => {
    const response = await api.delete(`/sessions/${sessionId}`);
    return response.data;
  },

  getSessionMessages: async (sessionId: string): Promise<any> => {
    const response = await api.get(`/sessions/${sessionId}/messages`);
    return response.data;
  },

  // Debug
  debugFirestore: async (): Promise<any> => {
    // Mock debug response since we removed the debug endpoint
    return { debug: 'Sessions handled by LangChain' };
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