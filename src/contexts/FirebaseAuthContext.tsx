import React, { createContext, useContext, useState, useEffect } from 'react';
import { User as FirebaseUser } from 'firebase/auth';
import { userService } from '@/services/firebaseService';
import { User, UserRole } from '@/types';

interface FirebaseAuthContextType {
  user: User | null;
  firebaseUser: FirebaseUser | null;
  login: (email: string, password: string, role: UserRole) => Promise<void>;
  register: (email: string, password: string, role: UserRole, name: string) => Promise<void>;
  logout: () => Promise<void>;
  isLoading: boolean;
}

const FirebaseAuthContext = createContext<FirebaseAuthContextType | undefined>(undefined);

export const useFirebaseAuth = () => {
  const context = useContext(FirebaseAuthContext);
  if (context === undefined) {
    throw new Error('useFirebaseAuth must be used within a FirebaseAuthProvider');
  }
  return context;
};

export const FirebaseAuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [user, setUser] = useState<User | null>(null);
  const [firebaseUser, setFirebaseUser] = useState<FirebaseUser | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    const unsubscribe = userService.onAuthStateChanged(async (firebaseUser: FirebaseUser | null) => {
      setFirebaseUser(firebaseUser);
      
      if (firebaseUser) {
        try {
          const userData = await userService.getUserById(firebaseUser.uid);
          setUser(userData);
        } catch (error) {
          setUser(null);
        }
      } else {
        setUser(null);
      }
      
      setIsLoading(false);
    });

    return () => unsubscribe();
  }, []);

  const register = async (email: string, password: string, role: UserRole, name: string) => {
    setIsLoading(true);
    try {
      const userData = await userService.register(email, password, role, name);
      setUser(userData);
    } catch (error) {
      throw error;
    } finally {
      setIsLoading(false);
    }
  };

  const login = async (email: string, password: string, role: UserRole) => {
    setIsLoading(true);
    try {
      const firebaseUser = await userService.login(email, password);
      
      // Fetch user data immediately and verify role
      const userData = await userService.getUserById(firebaseUser.uid);
      if (userData && userData.role !== role) {
        // Role mismatch - log out the user
        await userService.logout();
        setUser(null);
        setFirebaseUser(null);
        throw new Error(`You are registered as a ${userData.role}, not a ${role}. Please select the correct role.`);
      }
      
    } catch (error) {
      throw error;
    } finally {
      setIsLoading(false);
    }
  };

  const logout = async () => {
    setIsLoading(true);
    try {
      await userService.logout();
      setUser(null);
      setFirebaseUser(null);
    } catch (error) {
      throw error;
    } finally {
      setIsLoading(false);
    }
  };

  const value = {
    user,
    firebaseUser,
    login,
    register,
    logout,
    isLoading
  };

  return (
    <FirebaseAuthContext.Provider value={value}>
      {children}
    </FirebaseAuthContext.Provider>
  );
}; 