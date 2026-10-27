import { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { Eye, EyeOff } from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import ZentraLogo from '../components/ZentraLogo';

export default function Login() {
  const { login } = useAuth();
  const navigate = useNavigate();
  const [form, setForm] = useState({ emailOrUsername: '', password: '' });
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState('');
  const [submitting, setSubmitting] = useState(false);

  const onChange = (e) => setForm({ ...form, [e.target.name]: e.target.value });

  const onSubmit = async (e) => {
    e.preventDefault();
    setError('');
    setSubmitting(true);
    try {
      await login(form.emailOrUsername, form.password);
      navigate('/home');
    } catch (err) {
      setError(err.response?.data?.message || 'Login failed. Please try again.');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="flex min-h-screen items-center justify-center bg-aurora-bg px-4">
      <div className="w-full max-w-md">
        <div className="mb-8 flex items-center justify-center gap-2">
          <ZentraLogo size={40} title="Zentra" />
          <span className="text-xl font-bold text-aurora-text">Zentra</span>
        </div>

        <div className="rounded-aurora-lg border border-aurora-border bg-aurora-card p-8 shadow-aurora">
          <h1 className="mb-1 text-2xl font-bold text-aurora-text">Welcome back</h1>
          <p className="mb-6 text-sm text-aurora-text-muted">Log in to keep up with your world.</p>

          {error && (
            <div className="mb-4 rounded-aurora-sm border border-aurora-like/30 bg-aurora-like/10 px-4 py-2.5 text-sm text-aurora-like">
              {error}
            </div>
          )}

          <form onSubmit={onSubmit} className="space-y-4" noValidate>
            <div>
              <label htmlFor="emailOrUsername" className="mb-1.5 block text-sm font-medium text-aurora-text">
                Email or username
              </label>
              <input
                id="emailOrUsername"
                name="emailOrUsername"
                type="text"
                required
                value={form.emailOrUsername}
                onChange={onChange}
                className="w-full rounded-aurora-sm border border-aurora-border bg-aurora-bg px-4 py-2.5 text-aurora-text outline-none transition-aurora focus:border-aurora-violet"
                placeholder="you@example.com"
              />
            </div>

            <div>
              <label htmlFor="password" className="mb-1.5 block text-sm font-medium text-aurora-text">
                Password
              </label>
              <div className="relative">
                <input
                  id="password"
                  name="password"
                  type={showPassword ? 'text' : 'password'}
                  required
                  value={form.password}
                  onChange={onChange}
                  className="w-full rounded-aurora-sm border border-aurora-border bg-aurora-bg px-4 py-2.5 pr-11 text-aurora-text outline-none transition-aurora focus:border-aurora-violet"
                  placeholder="••••••••"
                />
                <button
                  type="button"
                  onClick={() => setShowPassword((s) => !s)}
                  aria-label={showPassword ? 'Hide password' : 'Show password'}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-aurora-text-muted hover:text-aurora-text"
                >
                  {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                </button>
              </div>
            </div>

            <button
              type="submit"
              disabled={submitting}
              className="w-full rounded-aurora-sm bg-aurora-gradient py-2.5 font-semibold text-white transition-aurora hover:opacity-90 disabled:opacity-60"
            >
              {submitting ? 'Logging in…' : 'Log in'}
            </button>
          </form>

          <p className="mt-6 text-center text-sm text-aurora-text-muted">
            New to Zentra?{' '}
            <Link to="/register" className="font-medium text-aurora-cyan hover:underline">
              Create an account
            </Link>
          </p>
        </div>
      </div>
    </div>
  );
}
