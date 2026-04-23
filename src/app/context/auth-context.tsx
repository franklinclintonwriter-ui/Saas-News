import { createContext, useCallback, useContext, useEffect, useMemo, useState, type ReactNode } from 'react';
import type { Session } from '@supabase/supabase-js';
import { getSupabase, sessionRole, supabaseConfigured } from '../lib/auth/supabase-client';

export type AuthUser = {
  id: string;
  name: string;
  email: string;
  role: string;
  status: string;
  signedInAt: string;
};

type AuthContextValue = {
  user: AuthUser | null;
  accessToken: string | null;
  refreshSession: () => Promise<string | null>;
  signIn: (email: string, password: string) => Promise<{ ok: true } | { ok: false; message: string }>;
  signOut: () => void;
};

const AuthContext = createContext<AuthContextValue | null>(null);

function userFromSession(s: Session | null): AuthUser | null {
  if (!s?.user) return null;
  const role = sessionRole(s as unknown as { user?: { app_metadata?: { role?: string } } }) ?? 'AUTHOR';
  const meta = s.user.user_metadata ?? {};
  return {
    id: s.user.id,
    email: s.user.email ?? '',
    name: (meta.name as string | undefined) || (s.user.email?.split('@')[0] ?? ''),
    role,
    status: 'ACTIVE',
    signedInAt: new Date().toISOString(),
  };
}

const emailOk = (email: string) => /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email.trim());

export function AuthProvider({ children }: { children: ReactNode }) {
  const [session, setSession] = useState<Session | null>(null);
  const [ready, setReady] = useState(false);

  useEffect(() => {
    if (!supabaseConfigured()) { setReady(true); return; }
    const supabase = getSupabase();
    supabase.auth.getSession().then(({ data }) => {
      setSession(data.session ?? null);
      setReady(true);
    });
    const { data: sub } = supabase.auth.onAuthStateChange((_event, next) => {
      setSession(next ?? null);
    });
    return () => sub.subscription.unsubscribe();
  }, []);

  const signIn = useCallback(async (email: string, password: string) => {
    const trimmed = email.trim();
    if (!emailOk(trimmed)) return { ok: false as const, message: 'Enter a valid email address.' };
    if (password.length < 8) return { ok: false as const, message: 'Password must be at least 8 characters.' };
    if (!supabaseConfigured()) return { ok: false as const, message: 'Auth is not configured.' };
    try {
      const { data, error } = await getSupabase().auth.signInWithPassword({ email: trimmed, password });
      if (error || !data.session) return { ok: false as const, message: error?.message || 'Sign-in failed.' };
      setSession(data.session);
      return { ok: true as const };
    } catch (err) {
      return { ok: false as const, message: err instanceof Error ? err.message : 'Unable to sign in.' };
    }
  }, []);

  const refreshSession = useCallback(async () => {
    if (!supabaseConfigured()) return null;
    try {
      const { data, error } = await getSupabase().auth.refreshSession();
      if (error || !data.session) return null;
      setSession(data.session);
      return data.session.access_token;
    } catch { return null; }
  }, []);

  const signOut = useCallback(() => {
    if (supabaseConfigured()) void getSupabase().auth.signOut();
    setSession(null);
  }, []);

  const user = userFromSession(session);
  const accessToken = session?.access_token ?? null;

  const value = useMemo<AuthContextValue>(
    () => ({ user, accessToken, refreshSession, signIn, signOut }),
    [user, accessToken, refreshSession, signIn, signOut],
  );

  if (!ready) {
    // Render nothing until we know session state; avoids flash-of-login.
    return null;
  }

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth(): AuthContextValue {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error('useAuth must be used within AuthProvider');
  return ctx;
}
