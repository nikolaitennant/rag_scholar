import React, { createContext, useContext, useState, useEffect, ReactNode } from 'react';

interface UserStats {
  total_points: number;
  total_chats: number;
  documents_uploaded: number;
  research_days: number;
  domains_explored: string[];
  citations_received: number;
  streak_days: number;
  last_activity: string | null;
  joined_date: string;
}

interface UserProfile {
  bio: string | null;
  research_interests: string[];
  preferred_domains: string[];
  notification_preferences: {
    achievement_notifications: boolean;
    research_reminders: boolean;
    system_updates: boolean;
  };
}

interface Achievement {
  type: string;
  name: string;
  description: string;
  points: number;
  unlocked_at: string | null;
  progress: number;
  target: number;
}

interface User {
  id: string;
  name: string;
  email: string;
  created_at: string;
  is_active: boolean;
  stats: UserStats;
  profile: UserProfile;
  achievements: Achievement[];
}

interface UserContextType {
  user: User | null;
  login: (email: string, password: string) => Promise<void>;
  signUp: (name: string, email: string, password: string) => Promise<void>;
  updateUser: (data: { name?: string; bio?: string; research_interests?: string[]; preferred_domains?: string[] }) => Promise<void>;
  changePassword: (currentPassword: string, newPassword: string) => Promise<void>;
  refreshUser: () => Promise<void>;
  logout: () => void;
  isAuthenticated: boolean;
  loading: boolean;
}

const UserContext = createContext<UserContextType | undefined>(undefined);

interface UserProviderProps {
  children: ReactNode;
}

export const UserProvider: React.FC<UserProviderProps> = ({ children }) => {
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);

  const API_BASE = process.env.REACT_APP_API_URL || 'http://localhost:8000/api/v1';

  useEffect(() => {
    // Check for saved token and validate with backend
    const checkAuth = async () => {
      const token = localStorage.getItem('ragScholarToken');
      if (token) {
        try {
          const response = await fetch(`${API_BASE}/auth/me`, {
            headers: {
              'Authorization': `Bearer ${token}`,
              'Content-Type': 'application/json',
            },
          });

          if (response.ok) {
            const userData = await response.json();
            setUser(userData);
          } else {
            localStorage.removeItem('ragScholarToken');
          }
        } catch (error) {
          console.error('Auth check failed:', error);
          localStorage.removeItem('ragScholarToken');
        }
      }
      setLoading(false);
    };

    checkAuth();
  }, [API_BASE]);

  const login = async (email: string, password: string) => {
    try {
      const response = await fetch(`${API_BASE}/auth/login`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ email, password }),
      });

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.detail || 'Login failed');
      }

      const data = await response.json();
      setUser(data.user);
      localStorage.setItem('ragScholarToken', data.access_token);
    } catch (error) {
      console.error('Login error:', error);
      throw error;
    }
  };

  const signUp = async (name: string, email: string, password: string) => {
    try {
      const response = await fetch(`${API_BASE}/auth/register`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ name, email, password }),
      });

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.detail || 'Registration failed');
      }

      const data = await response.json();
      setUser(data.user);
      localStorage.setItem('ragScholarToken', data.access_token);
    } catch (error) {
      console.error('SignUp error:', error);
      throw error;
    }
  };

  const updateUser = async (data: { name?: string; bio?: string; research_interests?: string[]; preferred_domains?: string[] }) => {
    const token = localStorage.getItem('ragScholarToken');
    if (!token) {
      throw new Error('No authentication token found');
    }

    try {
      const response = await fetch(`${API_BASE}/auth/me`, {
        method: 'PUT',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(data),
      });

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.detail || 'Update failed');
      }

      const updatedUser = await response.json();
      setUser(updatedUser);
    } catch (error) {
      console.error('Update user error:', error);
      throw error;
    }
  };

  const changePassword = async (currentPassword: string, newPassword: string) => {
    const token = localStorage.getItem('ragScholarToken');
    if (!token) {
      throw new Error('No authentication token found');
    }

    try {
      const response = await fetch(`${API_BASE}/auth/password`, {
        method: 'PUT',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          current_password: currentPassword,
          new_password: newPassword,
        }),
      });

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.detail || 'Password change failed');
      }
    } catch (error) {
      console.error('Change password error:', error);
      throw error;
    }
  };

  const refreshUser = async () => {
    const token = localStorage.getItem('ragScholarToken');
    if (token) {
      try {
        const response = await fetch(`${API_BASE}/auth/me`, {
          headers: {
            'Authorization': `Bearer ${token}`,
            'Content-Type': 'application/json',
          },
        });

        if (response.ok) {
          const userData = await response.json();
          setUser(userData);
        }
      } catch (error) {
        console.error('Refresh user failed:', error);
      }
    }
  };

  const logout = async () => {
    const token = localStorage.getItem('ragScholarToken');
    if (token) {
      try {
        await fetch(`${API_BASE}/auth/logout`, {
          method: 'POST',
          headers: {
            'Authorization': `Bearer ${token}`,
            'Content-Type': 'application/json',
          },
        });
      } catch (error) {
        console.error('Logout error:', error);
      }
    }
    
    setUser(null);
    localStorage.removeItem('ragScholarToken');
  };

  return (
    <UserContext.Provider value={{
      user,
      login,
      signUp,
      updateUser,
      changePassword,
      refreshUser,
      logout,
      isAuthenticated: !!user,
      loading
    }}>
      {children}
    </UserContext.Provider>
  );
};

export const useUser = (): UserContextType => {
  const context = useContext(UserContext);
  if (!context) {
    throw new Error('useUser must be used within a UserProvider');
  }
  return context;
};