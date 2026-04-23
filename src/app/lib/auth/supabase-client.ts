/**
 * Browser Supabase client (singleton).
 *
 * Use for:
 *   - auth flows (signIn, signOut, password reset)
 *   - direct reads of public content when RLS permits (optional)
 *
 * NEVER pass the service-role key here — only anon / publishable keys.
 */
import { createClient, type SupabaseClient } from '@supabase/supabase-js';

let singleton: SupabaseClient | null = null;

export function supabaseConfigured(): boolean {
  return Boolean(import.meta.env.VITE_SUPABASE_URL && import.meta.env.VITE_SUPABASE_ANON_KEY);
}

export function getSupabase(): SupabaseClient {
  if (singleton) return singleton;
  const url = import.meta.env.VITE_SUPABASE_URL as string | undefined;
  const key = import.meta.env.VITE_SUPABASE_ANON_KEY as string | undefined;
  if (!url || !key) {
    throw new Error(
      'Supabase client is not configured. Set VITE_SUPABASE_URL and VITE_SUPABASE_ANON_KEY.'
    );
  }
  singleton = createClient(url, key, {
    auth: {
      persistSession: true,
      autoRefreshToken: true,
      detectSessionInUrl: true,
      storageKey: 'phulpur24-auth',
      flowType: 'pkce',
    },
  });
  return singleton;
}

export type StaffRole = 'ADMIN' | 'EDITOR' | 'AUTHOR' | 'CONTRIBUTOR';

export function sessionRole(session: { user?: { app_metadata?: { role?: string } } } | null): StaffRole | null {
  const raw = session?.user?.app_metadata?.role;
  if (raw === 'ADMIN' || raw === 'EDITOR' || raw === 'AUTHOR' || raw === 'CONTRIBUTOR') return raw;
  return null;
}

export function hasAtLeastRole(session: unknown, required: StaffRole): boolean {
  const order: StaffRole[] = ['CONTRIBUTOR', 'AUTHOR', 'EDITOR', 'ADMIN'];
  const s = session as { user?: { app_metadata?: { role?: string } } } | null;
  const current = sessionRole(s);
  if (!current) return false;
  return order.indexOf(current) >= order.indexOf(required);
}
