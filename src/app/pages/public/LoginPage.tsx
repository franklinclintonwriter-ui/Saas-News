import { useState } from 'react';
import { Link, Navigate, useNavigate, useLocation } from 'react-router';
import { useForm } from 'react-hook-form';
import { Lock, Mail, ArrowLeft } from 'lucide-react';
import { useAuth } from '../../context/auth-context';
import { toast } from '../../lib/notify';

type FormValues = {
  email: string;
  password: string;
};

export default function LoginPage() {
  const { user, signIn } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();
  const from = (location.state as { from?: string } | null)?.from || '/admin/dashboard';
  const [submitting, setSubmitting] = useState(false);

  const {
    register,
    handleSubmit,
    formState: { errors },
  } = useForm<FormValues>({ defaultValues: { email: '', password: '' } });

  if (user) {
    return <Navigate to="/admin/dashboard" replace />;
  }

  const onSubmit = handleSubmit(async (values) => {
    setSubmitting(true);
    const result = await signIn(values.email, values.password);
    setSubmitting(false);
    if (!result.ok) {
      toast.error(result.message);
      return;
    }
    toast.success('Signed in successfully.');
    navigate(from, { replace: true });
  });

  return (
    <div className="min-h-screen bg-[#F3F4F6] flex flex-col">
      <header className="border-b border-[#E5E7EB] bg-white">
        <div className="mx-auto flex h-14 max-w-lg items-center justify-between px-4 sm:px-6">
          <Link
            to="/"
            className="inline-flex items-center gap-2 text-sm font-medium text-[#6B7280] transition hover:text-[#194890]"
          >
            <ArrowLeft size={18} aria-hidden />
            Back to site
          </Link>
          <span className="text-sm font-semibold text-[#194890]">Phulpur24</span>
        </div>
      </header>

      <main className="flex flex-1 items-center justify-center px-4 py-12">
        <div className="w-full max-w-md rounded-2xl border border-[#E5E7EB] bg-white p-8 shadow-sm">
          <h1 className="text-2xl font-bold tracking-tight text-neutral-900">Admin sign-in</h1>
          <p className="mt-2 text-sm leading-relaxed text-[#6B7280]">
            Access the editorial console with your API-backed administrator or newsroom account.
          </p>

          <form className="mt-8 space-y-5" onSubmit={onSubmit} noValidate>
            <div>
              <label htmlFor="login-email" className="mb-1.5 block text-sm font-semibold text-neutral-800">
                Email
              </label>
              <div className="relative">
                <Mail className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-[#9CA3AF]" />
                <input
                  id="login-email"
                  type="email"
                  autoComplete="username"
                  className="min-h-11 w-full rounded-lg border border-[#E5E7EB] bg-white py-2.5 pl-10 pr-3 text-sm outline-none transition focus:border-[#194890] focus:ring-2 focus:ring-[#194890]/20"
                  aria-invalid={errors.email ? 'true' : 'false'}
                  {...register('email', { required: 'Email is required.' })}
                />
              </div>
              {errors.email && <p className="mt-1.5 text-sm text-red-600">{errors.email.message}</p>}
            </div>

            <div>
              <label htmlFor="login-password" className="mb-1.5 block text-sm font-semibold text-neutral-800">
                Password
              </label>
              <div className="relative">
                <Lock className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-[#9CA3AF]" />
                <input
                  id="login-password"
                  type="password"
                  autoComplete="current-password"
                  className="min-h-11 w-full rounded-lg border border-[#E5E7EB] bg-white py-2.5 pl-10 pr-3 text-sm outline-none transition focus:border-[#194890] focus:ring-2 focus:ring-[#194890]/20"
                  aria-invalid={errors.password ? 'true' : 'false'}
                  {...register('password', {
                    required: 'Password is required.',
                    minLength: { value: 8, message: 'Use at least 8 characters.' },
                  })}
                />
              </div>
              {errors.password && <p className="mt-1.5 text-sm text-red-600">{errors.password.message}</p>}
            </div>

            <button
              type="submit"
              disabled={submitting}
              className="flex min-h-11 w-full items-center justify-center rounded-lg bg-[#194890] px-4 text-sm font-semibold text-white transition hover:bg-[#2656A8] disabled:cursor-not-allowed disabled:opacity-70"
            >
              {submitting ? 'Signing in…' : 'Sign in'}
            </button>
          </form>
        </div>
      </main>
    </div>
  );
}
