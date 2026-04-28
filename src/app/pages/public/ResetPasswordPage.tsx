import { useEffect, useState } from 'react';
import { Link, useNavigate } from 'react-router';
import { KeyRound, Eye, EyeOff, CheckCircle2 } from 'lucide-react';
import { updatePassword } from '../../lib/auth/supabase-auth';
import { getSupabase, supabaseConfigured } from '../../lib/auth/supabase-client';
import { useCms } from '../../context/cms-context';

const REDIRECT_DELAY_MS = 1500;

export default function ResetPasswordPage() {
  const { state } = useCms();
  const { settings } = state;
  const navigate = useNavigate();

  const [password, setPassword] = useState('');
  const [confirm, setConfirm] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [done, setDone] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [sessionReady, setSessionReady] = useState(false);

  const siteTitle = settings.siteTitle || 'Publication';

  // Supabase sends the user to this page with an access token in the URL hash.
  // The client picks it up automatically via onAuthStateChange.
  useEffect(() => {
    if (!supabaseConfigured()) {
      setError('Auth provider is not configured. Please contact your administrator.');
      return;
    }
    const supabase = getSupabase();
    const { data } = supabase.auth.onAuthStateChange((event) => {
      if (event === 'PASSWORD_RECOVERY') {
        setSessionReady(true);
      }
    });
    return () => data.subscription.unsubscribe();
  }, []);

  const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    if (password.length < 8) {
      setError('Password must be at least 8 characters.');
      return;
    }
    if (password !== confirm) {
      setError('Passwords do not match.');
      return;
    }
    setSubmitting(true);
    setError(null);
    try {
      const result = await updatePassword(password);
      if (result && !result.ok) {
        setError(result.error);
      } else {
        setDone(true);
        // Redirect to login after a short delay.
        setTimeout(() => navigate('/login', { replace: true }), REDIRECT_DELAY_MS);
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Unable to update password. Please try again.');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="min-h-screen bg-[#F3F4F6] flex items-center justify-center px-4 py-12">
      <div className="w-full max-w-md">
        <div className="mb-6 text-center">
          <h1 className="text-2xl font-bold text-[#111827]">{siteTitle}</h1>
        </div>

        <div className="rounded-xl border border-[#E5E7EB] bg-white p-8 shadow-sm">
          {done ? (
            <div className="text-center">
              <div className="mx-auto mb-4 flex h-14 w-14 items-center justify-center rounded-full bg-[#E8EEF8]">
                <CheckCircle2 className="text-[#194890]" size={28} aria-hidden />
              </div>
              <h2 className="mb-2 text-xl font-bold">Password updated</h2>
              <p className="text-sm text-[#6B7280]">Your password has been changed successfully. Redirecting to sign in…</p>
            </div>
          ) : (
            <>
              <div className="mb-6">
                <div className="mx-auto mb-4 flex h-14 w-14 items-center justify-center rounded-full bg-[#E8EEF8]">
                  <KeyRound className="text-[#194890]" size={28} aria-hidden />
                </div>
                <h2 className="text-center text-xl font-bold">Set a new password</h2>
                <p className="mt-2 text-center text-sm text-[#6B7280]">
                  Choose a strong password with at least 8 characters.
                </p>
              </div>

              {!sessionReady && !error && (
                <p className="mb-4 rounded-lg bg-[#FEF3C7] px-4 py-3 text-sm text-[#92400E]">
                  Verifying your reset link… If this page stays blank, request a new link from the{' '}
                  <Link to="/forgot-password" className="font-semibold underline">
                    forgot password
                  </Link>{' '}
                  page.
                </p>
              )}

              <form onSubmit={handleSubmit} noValidate className="space-y-4">
                <div>
                  <label htmlFor="reset-password" className="mb-2 block text-sm font-semibold">
                    New password
                  </label>
                  <div className="relative">
                    <input
                      id="reset-password"
                      type={showPassword ? 'text' : 'password'}
                      autoComplete="new-password"
                      value={password}
                      onChange={(e) => {
                        setPassword(e.target.value);
                        setError(null);
                      }}
                      placeholder="At least 8 characters"
                      className="w-full rounded-lg border border-[#E5E7EB] px-4 py-3 pr-11 text-sm outline-none transition focus:border-[#194890] focus:ring-2 focus:ring-[#194890]/15"
                      required
                    />
                    <button
                      type="button"
                      onClick={() => setShowPassword((v) => !v)}
                      aria-label={showPassword ? 'Hide password' : 'Show password'}
                      className="absolute right-3 top-1/2 -translate-y-1/2 text-[#6B7280] hover:text-[#111827]"
                    >
                      {showPassword ? <EyeOff size={18} /> : <Eye size={18} />}
                    </button>
                  </div>
                </div>

                <div>
                  <label htmlFor="reset-confirm" className="mb-2 block text-sm font-semibold">
                    Confirm new password
                  </label>
                  <input
                    id="reset-confirm"
                    type={showPassword ? 'text' : 'password'}
                    autoComplete="new-password"
                    value={confirm}
                    onChange={(e) => {
                      setConfirm(e.target.value);
                      setError(null);
                    }}
                    placeholder="Repeat the password"
                    className="w-full rounded-lg border border-[#E5E7EB] px-4 py-3 text-sm outline-none transition focus:border-[#194890] focus:ring-2 focus:ring-[#194890]/15"
                    required
                  />
                  {error && <p className="mt-1 text-sm text-red-600">{error}</p>}
                </div>

                <button
                  type="submit"
                  disabled={submitting || !sessionReady}
                  className="w-full rounded-lg bg-[#194890] px-4 py-3 font-semibold text-white transition hover:bg-[#2656A8] disabled:opacity-60"
                >
                  {submitting ? 'Updating…' : 'Update password'}
                </button>
              </form>
            </>
          )}
        </div>
      </div>
    </div>
  );
}
