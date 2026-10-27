import { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import ZentraLogo from '../components/ZentraLogo';

const initialForm = { name: '', username: '', email: '', password: '' };

export default function Register() {
  const { register } = useAuth();
  const navigate = useNavigate();
  const [form, setForm] = useState(initialForm);
  const [error, setError] = useState('');
  const [submitting, setSubmitting] = useState(false);

  const onChange = (e) => setForm({ ...form, [e.target.name]: e.target.value });

  const onSubmit = async (e) => {
    e.preventDefault();
    setError('');
    setSubmitting(true);
    try {
      await register(form);
      navigate('/home');
    } catch (err) {
      const msg =
        err.response?.data?.errors?.[0]?.message || err.response?.data?.message || 'Registration failed.';
      setError(msg);
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="flex min-h-screen items-center justify-center bg-aurora-bg px-4 py-10">
      <div className="w-full max-w-md">
        <div className="mb-8 flex items-center justify-center gap-2">
          <ZentraLogo size={40} title="Zentra" />
          <span className="text-xl font-bold text-aurora-text">Zentra</span>
        </div>

        <div className="rounded-aurora-lg border border-aurora-border bg-aurora-card p-8 shadow-aurora">
          <h1 className="mb-1 text-2xl font-bold text-aurora-text">Create your account</h1>
          <p className="mb-6 text-sm text-aurora-text-muted">Join the sphere — it only takes a minute.</p>

          {error && (
            <div className="mb-4 rounded-aurora-sm border border-aurora-like/30 bg-aurora-like/10 px-4 py-2.5 text-sm text-aurora-like">
              {error}
            </div>
          )}

          <form onSubmit={onSubmit} className="space-y-4" noValidate>
            <div>
              <label htmlFor="name" className="mb-1.5 block text-sm font-medium text-aurora-text">
                Full name
              </label>
              <input
                id="name"
                name="name"
                type="text"
                required
                maxLength={50}
                value={form.name}
                onChange={onChange}
                className="w-full rounded-aurora-sm border border-aurora-border bg-aurora-bg px-4 py-2.5 text-aurora-text outline-none transition-aurora focus:border-aurora-violet"
                placeholder="Ayan Mula"
              />
            </div>

            <div>
              <label htmlFor="username" className="mb-1.5 block text-sm font-medium text-aurora-text">
                Username
              </label>
              <input
                id="username"
                name="username"
                type="text"
                required
                pattern="[a-z0-9_.]{3,30}"
                title="Lowercase letters, numbers, underscores and dots only"
                value={form.username}
                onChange={onChange}
                className="w-full rounded-aurora-sm border border-aurora-border bg-aurora-bg px-4 py-2.5 text-aurora-text outline-none transition-aurora focus:border-aurora-violet"
                placeholder="ayan.mula"
              />
            </div>

            <div>
              <label htmlFor="email" className="mb-1.5 block text-sm font-medium text-aurora-text">
                Email
              </label>
              <input
                id="email"
                name="email"
                type="email"
                required
                value={form.email}
                onChange={onChange}
                className="w-full rounded-aurora-sm border border-aurora-border bg-aurora-bg px-4 py-2.5 text-aurora-text outline-none transition-aurora focus:border-aurora-violet"
                placeholder="you@example.com"
              />
            </div>

            <div>
              <label htmlFor="password" className="mb-1.5 block text-sm font-medium text-aurora-text">
                Password
              </label>
              <input
                id="password"
                name="password"
                type="password"
                required
                minLength={8}
                value={form.password}
                onChange={onChange}
                className="w-full rounded-aurora-sm border border-aurora-border bg-aurora-bg px-4 py-2.5 text-aurora-text outline-none transition-aurora focus:border-aurora-violet"
                placeholder="At least 8 characters"
              />
            </div>

            <button
              type="submit"
              disabled={submitting}
              className="w-full rounded-aurora-sm bg-aurora-gradient py-2.5 font-semibold text-white transition-aurora hover:opacity-90 disabled:opacity-60"
            >
              {submitting ? 'Creating account…' : 'Create account'}
            </button>
          </form>

          <p className="mt-6 text-center text-sm text-aurora-text-muted">
            Already have an account?{' '}
            <Link to="/login" className="font-medium text-aurora-cyan hover:underline">
              Log in
            </Link>
          </p>
        </div>
      </div>
    </div>
  );
}
