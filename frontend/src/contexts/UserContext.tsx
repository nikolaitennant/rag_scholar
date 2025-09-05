import React, { createContext, useContext, useState, useEffect, ReactNode } from 'react';

interface User {
  id: string;
  name: string;
  email: string;
}

interface UserContextType {
  user: User | null;
  login: (email: string, password: string) => Promise<void>;
  signUp: (name: string, email: string, password: string) => Promise<void>;
  logout: () => void;
  isAuthenticated: boolean;
}

const UserContext = createContext<UserContextType | undefined>(undefined);

interface UserProviderProps {
  children: ReactNode;
}

export const UserProvider: React.FC<UserProviderProps> = ({ children }) => {
  const [user, setUser] = useState<User | null>(null);

  useEffect(() => {
    // Check for saved user in localStorage on startup
    const savedUser = localStorage.getItem('ragScholarUser');
    if (savedUser) {
      setUser(JSON.parse(savedUser));
    }
  }, []);

  const login = async (email: string, password: string) => {
    // For demo purposes, accept any email/password combination
    // In a real app, this would make an API call
    
    // Extract name from email for demo
    const name = email.split('@')[0];
    const capitalizedName = name.charAt(0).toUpperCase() + name.slice(1);
    
    const userData: User = {
      id: `user-${Date.now()}`,
      name: capitalizedName,
      email
    };
    
    setUser(userData);
    localStorage.setItem('ragScholarUser', JSON.stringify(userData));
  };

  const signUp = async (name: string, email: string, password: string) => {
    // For demo purposes, just create a user
    // In a real app, this would make an API call
    
    const userData: User = {
      id: `user-${Date.now()}`,
      name,
      email
    };
    
    setUser(userData);
    localStorage.setItem('ragScholarUser', JSON.stringify(userData));
  };

  const logout = () => {
    setUser(null);
    localStorage.removeItem('ragScholarUser');
  };

  return (
    <UserContext.Provider value={{
      user,
      login,
      signUp,
      logout,
      isAuthenticated: !!user
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