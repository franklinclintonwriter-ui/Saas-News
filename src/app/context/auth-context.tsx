import { createContext, useCallback, useContext, useMemo, useState, type ReactNode } from 'react';
import { apiRequest } from '../lib/api-client';

const STORAGE_KEY = 'phulpur24_admin_session';

export type AuthUser = {
  id: string;
  name: string;
  email: string;
  role: string;
  status: string;
  signedInAt: string;
};

type AuthSession = {
  user: AuthUser;
  accessToken: string;
  refreshToken: string;
};

function readSession(): AuthSession | null {
  try {
    const raw = sessionStorage.getItem(STORAGE_KEY);
    if (!raw) return null;
    const parsed = JSON.parse(raw) as AuthSession;
    return parsed?.user?.email && parsed.accessToken ? parsed : null;
  } catch {
    return null;
  }
}

type AuthContextValue = {
  user: AuthUser | null;
  accessToken: string | null;
  refreshSession: () => Promise<string | null>;
  signIn: (email: string, password: string) => Promise<{ ok: true } | { ok: false; message: string }>;
  signOut: () => void;
};

const AuthContext = createContext<AuthContextValue | null>(null);

const emailOk = (email: string) => /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email.trim());

export function AuthProvider({ children }: { children: ReactNode }) {
  const [session, setSession] = useState<AuthSession | null>(() => readSession());

  const storeSession = useCallback((next: AuthSession | null) => {
    if (next) {
      sessionStorage.setItem(STORAGE_KEY, JSON.stringify(next));
    } else {
      sessionStorage.removeItem(STORAGE_KEY);
    }
    setSession(next);
  }, []);

  const signIn = useCallback(async (email: string, password: string) => {
    const trimmed = email.trim();
    if (!emailOk(trimmed)) {
      return { ok: false as const, message: 'Enter a valid work email address.' };
    }
    if (password.length < 8) {
      return { ok: false as const, message: 'Password must be at least 8 characters.' };
    }
    try {
      const result = await apiRequest<{ user: Omit<AuthUser, 'signedInAt'>; accessToken: string; refreshToken: string }>('/auth/login', {
        method: 'POST',
        body: JSON.stringify({ email: trimmed, password }),
      });
      const next: AuthSession = {
        user: { ...result.user, signedInAt: new Date().toISOString() },
        accessToken: result.accessToken,
        refreshToken: result.refreshToken,
      };
      storeSession(next);
      return { ok: true as const };
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Unable to sign in.';
      return { ok: false as const, message };
    }
  }, [storeSession]);

  const refreshSession = useCallback(async () => {
    const current = readSession();
    if (!current?.refreshToken) return null;

    try {
      const result = await apiRequest<{ user: Omit<AuthUser, 'signedInAt'>; accessToken: string; refreshToken: string }>('/auth/refresh', {
        method: 'POST',
        body: JSON.stringify({ refreshToken: current.refreshToken }),
      });
      const next: AuthSession = {
        user: { ...result.user, signedInAt: current.user.signedInAt || new Date().toISOString() },
        accessToken: result.accessToken,
        refreshToken: result.refreshToken,
      };
      storeSession(next);
      return next.accessToken;
    } catch {
      storeSession(null);
      return null;
    }
  }, [storeSession]);

  const signOut = useCallback(() => {
    const current = readSession();
    if (current?.refreshToken) {
      void apiRequest('/auth/logout', {
        method: 'POST',
        body: JSON.stringify({ refreshToken: current.refreshToken }),
      }).catch(() => undefined);
    }
    storeSession(null);
  }, [storeSession]);

  const value = useMemo(
    () => ({ user: session?.user ?? null, accessToken: session?.accessToken ?? null, refreshSession, signIn, signOut }),
    [session, refreshSession, signIn, signOut],
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth(): AuthContextValue {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error('useAuth must be used within AuthProvider');
  return ctx;
}
