import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Sun, Moon, Monitor, Shield, UserX, AlertTriangle, Trash2, X } from 'lucide-react';
import api from '../services/api';
import { useAuth } from '../context/AuthContext';
import { useTheme } from '../context/ThemeContext';
import { disconnectSocket } from '../services/socket';
import MainLayout from '../layouts/MainLayout';
import Avatar from '../components/Avatar';
import { showToast } from '../utils/toast';
import { confirmDialog } from '../utils/confirm';

function Section({ title, children }) {
  return (
    <section className="rounded-aurora-lg border border-aurora-border bg-aurora-card p-5">
      <h2 className="mb-4 text-sm font-semibold text-aurora-text">{title}</h2>
      {children}
    </section>
  );
}

function SelectRow({ label, value, onChange, options }) {
  return (
    <div className="flex items-center justify-between py-2">
      <span className="text-sm text-aurora-text">{label}</span>
      <select
        value={value}
        onChange={(e) => onChange(e.target.value)}
        className="rounded-aurora-sm border border-aurora-border bg-aurora-bg px-3 py-1.5 text-sm text-aurora-text outline-none"
      >
        {options.map((o) => (
          <option key={o} value={o}>
            {o.charAt(0).toUpperCase() + o.slice(1)}
          </option>
        ))}
      </select>
    </div>
  );
}

export default function Settings() {
  const { user, logout, refresh } = useAuth();
  const { theme, setTheme } = useTheme();
  const navigate = useNavigate();

  const [privacy, setPrivacy] = useState(user?.privacy || {
    posts: 'everyone',
    messages: 'everyone',
    calls: 'everyone',
    stories: 'everyone',
  });
  const [isPrivate, setIsPrivate] = useState(user?.isPrivate || false);
  const [blocked, setBlocked] = useState([]);
  const [saving, setSaving] = useState(false);
  const [deleteStep, setDeleteStep] = useState(0); // 0 closed, 1 explain, 2 confirm
  const [confirmText, setConfirmText] = useState('');
  const [deleting, setDeleting] = useState(false);
  const [deleteError, setDeleteError] = useState('');

  useEffect(() => {
    api.get('/users/me/blocked').then(({ data }) => setBlocked(data.users)).catch(() => {});
  }, []);

  const savePrivacy = async (next) => {
    setPrivacy(next);
    setSaving(true);
    try {
      await api.put('/users/me/privacy', next);
    } finally {
      setSaving(false);
    }
  };

  const toggleAccountPrivacy = async () => {
    const next = !isPrivate;
    setIsPrivate(next);
    await api.put('/users/me', { isPrivate: next });
    refresh?.();
  };

  const handleThemeChange = async (value) => {
    setTheme(value);
    api.put('/users/me/theme', { theme: value }).catch(() => {});
  };

  const unblock = async (username, id) => {
    setBlocked((prev) => prev.filter((u) => u._id !== id));
    await api.post(`/users/${username}/unblock`).catch(() => {});
  };

  const deactivate = async () => {
    if (!(await confirmDialog('Deactivate your account? You can contact support to reactivate later.', { danger: true, confirmLabel: 'Deactivate' }))) return;
    await api.post('/users/me/deactivate');
    await logout();
    navigate('/login');
  };

  const closeDeleteFlow = () => {
    setDeleteStep(0);
    setConfirmText('');
    setDeleteError('');
  };

  // Step 3 of the delete flow (section 15): typing the exact phrase is the explicit
  // confirmation the spec asks for, rather than a single accidental click.
  const confirmDelete = async () => {
    if (confirmText.trim().toUpperCase() !== 'DELETE') return;
    setDeleting(true);
    setDeleteError('');
    try {
      await api.delete('/users/me');
      // The account row is anonymized server-side and the auth cookie is already cleared
      // by that call — clear local state/session and the socket connection the same way
      // logout() does, then send them home rather than to a session that no longer exists.
      disconnectSocket();
      sessionStorage.clear();
      showToast('Your account has been deleted.', { type: 'success' });
      // Full navigation (not client-side routing) so every in-memory context — auth, theme,
      // calls, etc. — resets cleanly instead of carrying stale user state into the login screen.
      window.location.href = '/login';
    } catch (err) {
      setDeleteError(err.response?.data?.message || 'Could not delete your account. Please try again.');
      setDeleting(false);
    }
  };

  return (
    <MainLayout>
      <div className="mx-auto max-w-xl space-y-5">
        <h1 className="text-xl font-bold text-aurora-text">Settings</h1>

        <Section title="Appearance">
          <div className="flex gap-2">
            {[
              { key: 'light', icon: Sun, label: 'Light' },
              { key: 'dark', icon: Moon, label: 'Dark' },
              { key: 'system', icon: Monitor, label: 'System' },
            ].map(({ key, icon: Icon, label }) => (
              <button
                key={key}
                onClick={() => handleThemeChange(key)}
                className={`flex flex-1 flex-col items-center gap-1.5 rounded-aurora-md border py-3 text-xs font-medium transition-aurora ${
                  theme === key
                    ? 'border-aurora-violet bg-aurora-gradient text-white'
                    : 'border-aurora-border text-aurora-text hover:border-aurora-violet'
                }`}
              >
                <Icon size={18} />
                {label}
              </button>
            ))}
          </div>
        </Section>

        <Section title="Privacy">
          <div className="mb-2 flex items-center justify-between border-b border-aurora-border/60 pb-3">
            <div>
              <p className="text-sm text-aurora-text">Private account</p>
              <p className="text-xs text-aurora-text-muted">Only approved followers can see your posts</p>
            </div>
            <button
              onClick={toggleAccountPrivacy}
              className={`h-6 w-11 flex-shrink-0 rounded-full transition-aurora ${
                isPrivate ? 'bg-aurora-gradient' : 'bg-aurora-border'
              }`}
            >
              <span
                className={`block h-5 w-5 rounded-full bg-white shadow transition-aurora ${
                  isPrivate ? 'translate-x-5' : 'translate-x-0.5'
                }`}
              />
            </button>
          </div>

          <SelectRow
            label="Who can see my posts"
            value={privacy.posts}
            onChange={(v) => savePrivacy({ ...privacy, posts: v })}
            options={['everyone', 'followers', 'friends', 'onlyMe']}
          />
          <SelectRow
            label="Who can message me"
            value={privacy.messages}
            onChange={(v) => savePrivacy({ ...privacy, messages: v })}
            options={['everyone', 'followers', 'friends', 'nobody']}
          />
          <SelectRow
            label="Who can call me"
            value={privacy.calls}
            onChange={(v) => savePrivacy({ ...privacy, calls: v })}
            options={['everyone', 'friends', 'nobody']}
          />
          <SelectRow
            label="Who can see my stories"
            value={privacy.stories}
            onChange={(v) => savePrivacy({ ...privacy, stories: v })}
            options={['everyone', 'friends', 'closeFriends', 'nobody']}
          />
          {saving && <p className="mt-2 text-xs text-aurora-text-muted">Saving…</p>}
        </Section>

        <Section title="Blocked accounts">
          {blocked.length === 0 ? (
            <p className="flex items-center gap-2 text-sm text-aurora-text-muted">
              <Shield size={15} /> You haven't blocked anyone.
            </p>
          ) : (
            <div className="space-y-2">
              {blocked.map((u) => (
                <div key={u._id} className="flex items-center justify-between">
                  <div className="flex items-center gap-2.5">
                    <Avatar src={u.avatarUrl} name={u.name} size={32} />
                    <div>
                      <p className="text-sm font-medium text-aurora-text">{u.name}</p>
                      <p className="text-xs text-aurora-text-muted">@{u.username}</p>
                    </div>
                  </div>
                  <button
                    onClick={() => unblock(u.username, u._id)}
                    className="flex items-center gap-1 rounded-full border border-aurora-border px-3 py-1 text-xs font-medium text-aurora-text transition-aurora hover:border-aurora-violet"
                  >
                    <UserX size={12} /> Unblock
                  </button>
                </div>
              ))}
            </div>
          )}
        </Section>

        <Section title="Account">
          <button
            onClick={deactivate}
            className="flex w-full items-center gap-2 rounded-aurora-md border border-aurora-like/40 px-4 py-2.5 text-sm font-medium text-aurora-like transition-aurora hover:bg-aurora-like/10"
          >
            <AlertTriangle size={15} /> Deactivate account
          </button>
          <p className="mb-2 mt-1 text-xs text-aurora-text-muted">
            Deactivating hides your profile — you can come back any time.
          </p>

          <button
            onClick={() => setDeleteStep(1)}
            className="mt-2 flex w-full items-center gap-2 rounded-aurora-md border border-aurora-like bg-aurora-like/10 px-4 py-2.5 text-sm font-semibold text-aurora-like transition-aurora hover:bg-aurora-like/20"
          >
            <Trash2 size={15} /> Delete account
          </button>
          <p className="mt-1 text-xs text-aurora-text-muted">
            Deleting is permanent — this can't be undone.
          </p>
        </Section>
      </div>

      {deleteStep > 0 && (
        <div
          className="fixed inset-0 z-[120] flex items-center justify-center bg-black/70 px-4"
          onClick={closeDeleteFlow}
          onKeyDown={(e) => e.key === 'Escape' && closeDeleteFlow()}
        >
          <div
            role="dialog"
            aria-modal="true"
            aria-labelledby="delete-account-title"
            onClick={(e) => e.stopPropagation()}
            className="w-full max-w-sm rounded-aurora-lg border border-aurora-border bg-aurora-card p-5"
          >
            <div className="mb-3 flex items-start justify-between">
              <h2 id="delete-account-title" className="text-base font-bold text-aurora-text">
                {deleteStep === 1 ? 'Delete account' : 'Confirm deletion'}
              </h2>
              <button onClick={closeDeleteFlow} aria-label="Close" className="text-aurora-text-muted hover:text-aurora-text">
                <X size={18} />
              </button>
            </div>

            {deleteStep === 1 ? (
              <>
                <ul className="mb-4 list-disc space-y-1.5 pl-5 text-sm text-aurora-text-muted">
                  <li>This action is permanent and cannot be reversed.</li>
                  <li>Your account will no longer be available normally.</li>
                  <li>Your existing conversations and content may be anonymized.</li>
                </ul>
                <div className="flex gap-2">
                  <button
                    onClick={closeDeleteFlow}
                    className="flex-1 rounded-aurora-md border border-aurora-border py-2 text-sm font-medium text-aurora-text transition-aurora hover:border-aurora-violet"
                  >
                    Cancel
                  </button>
                  <button
                    onClick={() => setDeleteStep(2)}
                    className="flex-1 rounded-aurora-md bg-aurora-like py-2 text-sm font-semibold text-white transition-aurora hover:opacity-90"
                  >
                    Continue
                  </button>
                </div>
              </>
            ) : (
              <>
                <p className="mb-3 text-sm text-aurora-text-muted">
                  Type <span className="font-semibold text-aurora-text">DELETE</span> to permanently delete your account.
                </p>
                <input
                  autoFocus
                  value={confirmText}
                  onChange={(e) => setConfirmText(e.target.value)}
                  placeholder="DELETE"
                  aria-label="Type DELETE to confirm"
                  className="mb-1 w-full rounded-aurora-sm border border-aurora-border bg-aurora-bg px-3 py-2 text-sm text-aurora-text outline-none focus:border-aurora-like"
                />
                {deleteError && <p className="mb-2 text-xs text-aurora-like">{deleteError}</p>}
                <div className="mt-3 flex gap-2">
                  <button
                    onClick={() => setDeleteStep(1)}
                    className="flex-1 rounded-aurora-md border border-aurora-border py-2 text-sm font-medium text-aurora-text transition-aurora hover:border-aurora-violet"
                  >
                    Back
                  </button>
                  <button
                    onClick={confirmDelete}
                    disabled={confirmText.trim().toUpperCase() !== 'DELETE' || deleting}
                    className="flex-1 rounded-aurora-md bg-aurora-like py-2 text-sm font-semibold text-white transition-aurora hover:opacity-90 disabled:opacity-50"
                  >
                    {deleting ? 'Deleting…' : 'Permanently delete'}
                  </button>
                </div>
              </>
            )}
          </div>
        </div>
      )}
    </MainLayout>
  );
}
