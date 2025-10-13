import axios from 'axios';
import { ChatResponse, Document } from '../types';
import { auth } from '../config/firebase';

const API_BASE = process.env.REACT_APP_API_URL || 'http://localhost:8000/api/v1';

const api = axios.create({
  baseURL: API_BASE,
  timeout: 30000,
});

// Request interceptor to add Firebase auth token and security headers
api.interceptors.request.use(
  async (config) => {
    // Security: Ensure HTTPS in production
    if (process.env.NODE_ENV === 'production' && config.baseURL && !config.baseURL.startsWith('https://')) {
      console.warn('🔒 Security Warning: API calls should use HTTPS in production');
    }

    const currentUser = auth.currentUser;
    if (currentUser) {
      const token = await currentUser.getIdToken();
      config.headers.Authorization = `Bearer ${token}`;
    }

    // Security headers
    config.headers['X-Requested-With'] = 'XMLHttpRequest';
    config.headers['Cache-Control'] = 'no-cache, no-store, must-revalidate';

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

  // Chat - Updated to match new backend with secure API key handling
  chat: async (payload: {
    query: string;
    session_id?: string;
    class_id?: string;
    class_name?: string;
    domain_type?: string;
    k?: number;
  }): Promise<ChatResponse> => {
    // Get user's API settings securely from localStorage
    const apiKey = localStorage.getItem('api_key');
    const model = localStorage.getItem('preferred_model');
    const temperature = localStorage.getItem('temperature');
    const maxTokens = localStorage.getItem('max_tokens');

    // Security: Don't log API keys
    if (!apiKey) {
      throw new Error('API key required. Please configure your API key in Advanced Settings.');
    }

    // Add API key and model settings to payload securely
    const securePayload = {
      ...payload,
      api_key: apiKey,
      model: model || 'gpt-5-mini',
      temperature: temperature ? parseFloat(temperature) : undefined,
      max_tokens: maxTokens ? parseInt(maxTokens, 10) : undefined
    };

    const response = await api.post('/chat/chat', securePayload);
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
    formData.append('collection', collection);

    // Security: API key is fetched securely server-side from encrypted Firestore storage
    // Never send API keys from client-side localStorage

    const response = await api.post(
      `/documents/upload`,
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
    // Add API key from localStorage if available
    const apiKey = localStorage.getItem('api_key');
    const queryParams = new URLSearchParams();
    if (apiKey) {
      queryParams.append('api_key', apiKey);
    }

    const response = await api.delete(`/documents/${documentId}?${queryParams.toString()}`);
    return response.data;
  },

  updateDocument: async (documentId: string, updateData: { filename: string }): Promise<Document> => {
    // Add API key from localStorage if available
    const apiKey = localStorage.getItem('api_key');
    const queryParams = new URLSearchParams();
    if (apiKey) {
      queryParams.append('api_key', apiKey);
    }

    const response = await api.put(`/documents/${documentId}?${queryParams.toString()}`, updateData);
    return response.data;
  },

  assignDocumentToClass: async (
    documentId: string,
    documentSource: string,
    classId: string,
    operation: 'add' | 'remove' = 'add'
  ): Promise<any> => {
    // Add API key from localStorage if available
    const apiKey = localStorage.getItem('api_key');
    const queryParams = new URLSearchParams();
    if (apiKey) {
      queryParams.append('api_key', apiKey);
    }

    const response = await api.post(`/documents/${documentId}/assign-class?${queryParams.toString()}`, {
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

  updateUserProfile: async (data: { bio?: string; research_interests?: string[]; preferred_domains?: string[]; profile_image?: string }): Promise<any> => {
    const response = await api.put('/profile', data);
    return response.data;
  },

  grantEarlyAdopter: async (): Promise<any> => {
    const response = await api.post('/grant-early-adopter');
    return response.data;
  },

  refreshAchievements: async (): Promise<any> => {
    // Just get user profile to trigger achievement recalculation
    const response = await api.get('/me');
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

  // Classes - Full CRUD
  getClasses: async (): Promise<any[]> => {
    const response = await api.get('/classes/');
    return response.data;
  },

  createClass: async (classData: { name: string; domain_type: string; description?: string }): Promise<any> => {
    const response = await api.post('/classes/', classData);
    return response.data;
  },

  updateClass: async (classId: string, classData: { name: string; domain_type: string; description?: string }): Promise<any> => {
    const response = await api.put(`/classes/${classId}`, classData);
    return response.data;
  },

  deleteClass: async (classId: string): Promise<any> => {
    const response = await api.delete(`/classes/${classId}`);
    return response.data;
  },

  // API Settings
  getAPISettings: async (): Promise<any> => {
    const response = await api.get('/api-settings');
    return response.data;
  },

  updateAPISettings: async (settings: any): Promise<any> => {
    const response = await api.post('/api-settings', settings);
    return response.data;
  },

  // Feedback - Now uses Firebase directly for reliable delivery
  sendFeedback: async (feedbackData: {
    type: 'bug' | 'feature' | 'general';
    message: string;
    email?: string;
  }): Promise<any> => {
    // Import Firebase feedback service dynamically to avoid circular imports
    const { sendFeedback } = await import('./feedback');

    // Use Firebase directly instead of backend endpoint
    await sendFeedback(feedbackData);

    return { success: true, message: 'Feedback sent successfully!' };
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