import { useState } from 'react';
import { Link } from 'react-router';
import { Mail, ArrowLeft, CheckCircle2 } from 'lucide-react';
import { requestPasswordReset } from '../../lib/auth/supabase-auth';
import { useCms } from '../../context/cms-context';

export default function ForgotPasswordPage() {
  const { state } = useCms();
  const { settings } = state;
  const [email, setEmail] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [sent, setSent] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const siteTitle = settings.siteTitle || 'Publication';

  const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    const trimmed = email.trim().toLowerCase();
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(trimmed)) {
      setError('Please enter a valid email address.');
      return;
    }
    setSubmitting(true);
    setError(null);
    try {
      const redirectTo =
        typeof window !== 'undefined'
          ? `${window.location.origin}/reset-password`
          : '/reset-password';
      const result = await requestPasswordReset(trimmed, redirectTo);
      if (result && !result.ok) {
        setError(result.error);
      } else {
        setSent(true);
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Unable to send reset email. Please try again.');
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
          {sent ? (
            <div className="text-center">
              <div className="mx-auto mb-4 flex h-14 w-14 items-center justify-center rounded-full bg-[#E8EEF8]">
                <CheckCircle2 className="text-[#194890]" size={28} aria-hidden />
              </div>
              <h2 className="mb-2 text-xl font-bold">Check your email</h2>
              <p className="mb-6 text-sm text-[#6B7280]">
                If an account exists for <strong>{email}</strong>, a password reset link has been sent. Check your inbox and spam folder.
              </p>
              <Link
                to="/login"
                className="inline-flex items-center gap-2 text-sm font-semibold text-[#194890] hover:underline"
              >
                <ArrowLeft size={16} aria-hidden />
                Back to sign in
              </Link>
            </div>
          ) : (
            <>
              <div className="mb-6">
                <div className="mx-auto mb-4 flex h-14 w-14 items-center justify-center rounded-full bg-[#E8EEF8]">
                  <Mail className="text-[#194890]" size={28} aria-hidden />
                </div>
                <h2 className="text-center text-xl font-bold">Forgot your password?</h2>
                <p className="mt-2 text-center text-sm text-[#6B7280]">
                  Enter your account email and we'll send you a link to reset your password.
                </p>
              </div>

              <form onSubmit={handleSubmit} noValidate className="space-y-4">
                <div>
                  <label htmlFor="forgot-email" className="mb-2 block text-sm font-semibold">
                    Email address
                  </label>
                  <input
                    id="forgot-email"
                    type="email"
                    autoComplete="email"
                    value={email}
                    onChange={(e) => {
                      setEmail(e.target.value);
                      setError(null);
                    }}
                    placeholder="you@example.com"
                    className="w-full rounded-lg border border-[#E5E7EB] px-4 py-3 text-sm outline-none transition focus:border-[#194890] focus:ring-2 focus:ring-[#194890]/15"
                    required
                  />
                  {error && <p className="mt-1 text-sm text-red-600">{error}</p>}
                </div>

                <button
                  type="submit"
                  disabled={submitting}
                  className="w-full rounded-lg bg-[#194890] px-4 py-3 font-semibold text-white transition hover:bg-[#2656A8] disabled:opacity-60"
                >
                  {submitting ? 'Sending…' : 'Send reset link'}
                </button>
              </form>

              <div className="mt-6 text-center">
                <Link
                  to="/login"
                  className="inline-flex items-center gap-2 text-sm font-semibold text-[#194890] hover:underline"
                >
                  <ArrowLeft size={16} aria-hidden />
                  Back to sign in
                </Link>
              </div>
            </>
          )}
        </div>
      </div>
    </div>
  );
}
