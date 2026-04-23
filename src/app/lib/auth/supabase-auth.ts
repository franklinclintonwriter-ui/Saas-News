/**
 * High-level auth helpers for the admin surface.
 *
 * Wraps the raw Supabase client with:
 *   - sign-in
 *   - sign-out (clears local session + redirects)
 *   - password reset (send + confirm)
 *   - onAuthStateChange subscription helpers
 *
 * Designed to drop in alongside the existing auth-context.tsx; the user can
 * migrate the context to use these helpers incrementally.
 */
import type { AuthChangeEvent, Session } from '@supabase/supabase-js';
import { getSupabase, sessionRole, supabaseConfigured } from './supabase-client';
import { captureException, setUserContext } from '../observability/sentry';

export type AuthResult =
  | { ok: true; session: Session }
  | { ok: false; error: string };

export async function signInWithPassword(email: string, password: string): Promise<AuthResult> {
  if (!supabaseConfigured()) {
    return { ok: false, error: 'Auth provider is not configured. Please contact your administrator.' };
  }
  const supabase = getSupabase();
  const { data, error } = await supabase.auth.signInWithPassword({ email, password });
  if (error || !data.session) {
    return { ok: false, error: error?.message || 'Sign-in failed.' };
  }
  void setUserContext({
    id: data.user.id,
    email: data.user.email ?? undefined,
    role: sessionRole(data as unknown as { user?: { app_metadata?: { role?: string } } }) ?? undefined,
  });
  return { ok: true, session: data.session };
}

export async function signOut(redirectTo = '/login'): Promise<void> {
  if (!supabaseConfigured()) return;
  try {
    await getSupabase().auth.signOut();
    void setUserContext(null);
  } catch (err) {
    void captureException(err, { where: 'signOut' });
  }
  if (typeof window !== 'undefined') window.location.href = redirectTo;
}

export async function requestPasswordReset(email: string, redirectTo: string): Promise<AuthResult | null> {
  if (!supabaseConfigured()) return { ok: false, error: 'Auth provider not configured.' };
  const { error } = await getSupabase().auth.resetPasswordForEmail(email, { redirectTo });
  if (error) return { ok: false, error: error.message };
  return null; // success: no session back from email flow
}

export async function updatePassword(newPassword: string): Promise<AuthResult | null> {
  if (!supabaseConfigured()) return { ok: false, error: 'Auth provider not configured.' };
  const { error } = await getSupabase().auth.updateUser({ password: newPassword });
  if (error) return { ok: false, error: error.message };
  return null;
}

export async function getCurrentSession(): Promise<Session | null> {
  if (!supabaseConfigured()) return null;
  const { data } = await getSupabase().auth.getSession();
  return data.session ?? null;
}

export function subscribeAuthState(
  cb: (event: AuthChangeEvent, session: Session | null) => void
): () => void {
  if (!supabaseConfigured()) return () => undefined;
  const { data } = getSupabase().auth.onAuthStateChange(cb);
  return () => data.subscription.unsubscribe();
}

/** Ambient access token for API calls; refreshed automatically by the client. */
export async function currentAccessToken(): Promise<string | null> {
  if (!supabaseConfigured()) return null;
  const { data } = await getSupabase().auth.getSession();
  return data.session?.access_token ?? null;
}
