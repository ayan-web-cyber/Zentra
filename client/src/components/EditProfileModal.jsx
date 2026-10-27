import { useState } from 'react';
import { X } from 'lucide-react';
import api from '../services/api';

export default function EditProfileModal({ user, onClose, onSaved }) {
  const [name, setName] = useState(user.name);
  const [bio, setBio] = useState(user.bio || '');
  const [error, setError] = useState('');
  const [saving, setSaving] = useState(false);

  const onSubmit = async (e) => {
    e.preventDefault();
    setError('');
    setSaving(true);
    try {
      const { data } = await api.put('/users/me', { name, bio });
      onSaved(data.user);
      onClose();
    } catch (err) {
      setError(err.response?.data?.message || 'Could not save changes');
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 px-4">
      <div className="w-full max-w-md rounded-aurora-lg border border-aurora-border bg-aurora-card p-6 shadow-aurora">
        <div className="mb-4 flex items-center justify-between">
          <h2 className="text-lg font-bold text-aurora-text">Edit profile</h2>
          <button onClick={onClose} aria-label="Close" className="text-aurora-text-muted hover:text-aurora-text">
            <X size={20} />
          </button>
        </div>

        {error && (
          <div className="mb-4 rounded-aurora-sm border border-aurora-like/30 bg-aurora-like/10 px-4 py-2 text-sm text-aurora-like">
            {error}
          </div>
        )}

        <form onSubmit={onSubmit} className="space-y-4">
          <div>
            <label htmlFor="edit-name" className="mb-1.5 block text-sm font-medium text-aurora-text">
              Name
            </label>
            <input
              id="edit-name"
              value={name}
              maxLength={50}
              onChange={(e) => setName(e.target.value)}
              className="w-full rounded-aurora-sm border border-aurora-border bg-aurora-bg px-4 py-2.5 text-aurora-text outline-none transition-aurora focus:border-aurora-violet"
            />
          </div>
          <div>
            <label htmlFor="edit-bio" className="mb-1.5 block text-sm font-medium text-aurora-text">
              Bio
            </label>
            <textarea
              id="edit-bio"
              value={bio}
              maxLength={160}
              rows={3}
              onChange={(e) => setBio(e.target.value)}
              className="w-full resize-none rounded-aurora-sm border border-aurora-border bg-aurora-bg px-4 py-2.5 text-aurora-text outline-none transition-aurora focus:border-aurora-violet"
            />
            <p className="mt-1 text-right text-xs text-aurora-text-muted">{bio.length}/160</p>
          </div>

          <button
            type="submit"
            disabled={saving}
            className="w-full rounded-aurora-sm bg-aurora-gradient py-2.5 font-semibold text-white transition-aurora hover:opacity-90 disabled:opacity-60"
          >
            {saving ? 'Saving…' : 'Save changes'}
          </button>
        </form>
      </div>
    </div>
  );
}
