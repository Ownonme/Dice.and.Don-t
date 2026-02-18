
import { createContext, useContext } from 'react';

export type User = { id: string; email: string };
export type Session = null;

// file module scope
export interface AuthContextType {
  user: User | null;
  session: Session | null;
  isLoading: boolean;
  signInWithPassword: (email: string, password: string) => Promise<void>;
  signUp: (email: string, password: string, username?: string) => Promise<void>;
  resendConfirmationEmail: (email: string) => Promise<void>;
  resetPassword: (email: string) => Promise<void>;
  signOut: () => Promise<void>;
  isAdmin: boolean;
}

export const AuthContext = createContext<AuthContextType | undefined>(undefined);

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (context !== undefined) return context;
  return {
    user: null,
    session: null,
    isLoading: false,
    signInWithPassword: async () => {},
    signUp: async () => {},
    resendConfirmationEmail: async () => {},
    resetPassword: async () => {},
    signOut: async () => {},
    isAdmin: false,
  } as any;
};
