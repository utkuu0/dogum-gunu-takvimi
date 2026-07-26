import { createContext, useContext, useEffect, useState, type ReactNode } from 'react';
import { apiClient, setOnAuthFailure } from '../api/client';
import { signInWithGoogle as googleSignIn, signOutGoogle } from './googleSignIn';
import { clearTokens, getAccessToken, getRefreshToken, setTokens } from './tokenStorage';

interface AuthUser {
  id: string;
  email: string;
  name: string;
}

interface AuthContextValue {
  isLoading: boolean;
  isAuthenticated: boolean;
  user: AuthUser | null;
  signInWithGoogle: () => Promise<void>;
  signOut: () => Promise<void>;
}

const AuthContext = createContext<AuthContextValue | null>(null);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [isLoading, setIsLoading] = useState(true);
  const [user, setUser] = useState<AuthUser | null>(null);

  useEffect(() => {
    setOnAuthFailure(() => setUser(null));

    (async () => {
      const [accessToken, refreshToken] = await Promise.all([getAccessToken(), getRefreshToken()]);

      if (accessToken && refreshToken) {
        try {
          const { data } = await apiClient.get<AuthUser>('/auth/me');
          setUser(data);
        } catch {
          await clearTokens();
        }
      }

      setIsLoading(false);
    })();
  }, []);

  async function signInWithGoogle() {
    const idToken = await googleSignIn();
    const { data } = await apiClient.post<{
      user: AuthUser;
      accessToken: string;
      refreshToken: string;
    }>('/auth/google', { idToken });

    await setTokens({ accessToken: data.accessToken, refreshToken: data.refreshToken });
    setUser(data.user);
  }

  async function signOut() {
    await clearTokens();
    await signOutGoogle();
    setUser(null);
  }

  return (
    <AuthContext.Provider
      value={{ isLoading, isAuthenticated: user !== null, user, signInWithGoogle, signOut }}
    >
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth(): AuthContextValue {
  const ctx = useContext(AuthContext);
  if (!ctx) {
    throw new Error('useAuth, AuthProvider içinde kullanılmalı.');
  }
  return ctx;
}
