import React, { createContext, useContext, useState, useEffect, ReactNode } from 'react';
import {
  signInWithEmailAndPassword,
  createUserWithEmailAndPassword,
  signOut,
  onAuthStateChanged,
  User as FirebaseUser,
  updateProfile,
  sendPasswordResetEmail
} from 'firebase/auth';
import { auth } from '../config/firebase';
import { UserProfile } from '../types';
import { apiService } from '../services/api';

interface UserContextType {
  user: FirebaseUser | null;
  userProfile: UserProfile | null;
  loading: boolean;
  login: (email: string, password: string) => Promise<void>;
  signUp: (name: string, email: string, password: string) => Promise<void>;
  logout: () => Promise<void>;
  refreshUserProfile: () => Promise<void>;
  refreshUser: () => Promise<void>;
  updateDisplayName: (newDisplayName: string) => Promise<void>;
  updateUserProfile: (data: { bio?: string; research_interests?: string[]; preferred_domains?: string[]; profile_image?: string }) => Promise<void>;
  resetPassword: (email: string) => Promise<void>;
  isAuthenticated: boolean;
}

const UserContext = createContext<UserContextType | undefined>(undefined);

interface UserProviderProps {
  children: ReactNode;
}

export const UserProvider: React.FC<UserProviderProps> = ({ children }) => {
  const [user, setUser] = useState<FirebaseUser | null>(null);
  const [userProfile, setUserProfile] = useState<UserProfile | null>(null);
  const [loading, setLoading] = useState(true);

  const fetchUserProfile = async () => {
    try {
      const profileData = await apiService.getCurrentUser();
      setUserProfile(profileData);
    } catch (error) {
      console.error('Failed to fetch user profile:', error);
    }
  };

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, async (firebaseUser) => {
      setUser(firebaseUser);

      if (firebaseUser) {
        await fetchUserProfile();
      } else {
        setUserProfile(null);
      }

      setLoading(false);
    });

    return () => unsubscribe();
  }, []);

  const login = async (email: string, password: string) => {
    await signInWithEmailAndPassword(auth, email, password);
  };

  const signUp = async (name: string, email: string, password: string) => {
    const { user } = await createUserWithEmailAndPassword(auth, email, password);
    await updateProfile(user, { displayName: name });
  };

  const logout = async () => {
    await signOut(auth);
  };

  const refreshUserProfile = async () => {
    if (user) {
      await fetchUserProfile();
    }
  };

  const refreshUser = async () => {
    if (auth.currentUser) {
      await auth.currentUser.reload();
      // Force a state update with a small delay to ensure Firebase has updated
      setTimeout(() => {
        setUser({ ...auth.currentUser } as FirebaseUser);
      }, 100);
    }
  };

  const updateDisplayName = async (newDisplayName: string) => {
    if (auth.currentUser) {
      await updateProfile(auth.currentUser, { displayName: newDisplayName });
      // Reload the user to ensure Firebase has the latest data
      await auth.currentUser.reload();
      // Manually trigger the auth state change listener
      setUser(auth.currentUser);
    }
  };

  const updateUserProfile = async (data: { bio?: string; research_interests?: string[]; preferred_domains?: string[]; profile_image?: string }) => {
    try {
      await apiService.updateUserProfile(data);
      await refreshUserProfile();
    } catch (error) {
      console.error('Failed to update user profile:', error);
      throw error;
    }
  };

  const resetPassword = async (email: string) => {
    await sendPasswordResetEmail(auth, email);
  };

  const isAuthenticated = !!user;

  return (
    <UserContext.Provider value={{
      user,
      userProfile,
      loading,
      login,
      signUp,
      logout,
      refreshUserProfile,
      refreshUser,
      updateDisplayName,
      updateUserProfile,
      resetPassword,
      isAuthenticated
    }}>
      {children}
    </UserContext.Provider>
  );
};

export const useUser = (): UserContextType => {
  const context = useContext(UserContext);
  if (context === undefined) {
    throw new Error('useUser must be used within a UserProvider');
  }
  return context;
};