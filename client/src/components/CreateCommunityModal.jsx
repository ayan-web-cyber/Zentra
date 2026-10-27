import { useState } from 'react';
import { X } from 'lucide-react';
import api from '../services/api';

const ICONS = ['💬', '💻', '🎮', '📷', '🎵', '📚', '⚽', '✈️', '🎨', '🍳', '💪', '💼'];
const CATEGORIES = [
  'Technology',
  'Gaming',
  'Photography',
  'Music',
  'Sports',
  'Travel',
  'Education',
  'Art',
  'Food',
  'Fitness',
  'Business',
  'Other',
];

export default function CreateCommunityModal({ onClose, onCreated }) {
  const [name, setName] = useState('');
  const [description, setDescription] = useState('');
  const [icon, setIcon] = useState(ICONS[0]);
  const [category, setCategory] = useState('Other');
  const [privacy, setPrivacy] = useState('public');
  const [error, setError] = useState(null);
  const [saving, setSaving] = useState(false);

  const submit = async () => {
    if (!name.trim()) {
      setError('Give your community a name.');
      return;
    }
    setSaving(true);
    setError(null);
    try {
      const { data } = await api.post('/communities', { name, description, icon, category, privacy });
      onCreated(data.community);
    } catch (err) {
      setError(err.response?.data?.message || 'Could not create community.');
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 px-4">
      <div className="w-full max-w-md rounded-aurora-lg border border-aurora-border bg-aurora-card p-5">
        <div className="mb-4 flex items-center justify-between">
          <h2 className="text-lg font-bold text-aurora-text">Create a community</h2>
          <button onClick={onClose} aria-label="Close" className="text-aurora-text-muted hover:text-aurora-text">
            <X size={20} />
          </button>
        </div>

        <div className="space-y-3">
          <div>
            <label className="mb-1 block text-xs font-medium text-aurora-text-muted">Name</label>
            <input
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="e.g. Photography Lovers"
              maxLength={60}
              className="w-full rounded-aurora-sm border border-aurora-border bg-aurora-bg px-3 py-2 text-sm text-aurora-text outline-none focus:border-aurora-violet"
            />
          </div>

          <div>
            <label className="mb-1 block text-xs font-medium text-aurora-text-muted">Description</label>
            <textarea
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder="What's this community about?"
              rows={3}
              maxLength={500}
              className="w-full resize-none rounded-aurora-sm border border-aurora-border bg-aurora-bg px-3 py-2 text-sm text-aurora-text outline-none focus:border-aurora-violet"
            />
          </div>

          <div>
            <label className="mb-1 block text-xs font-medium text-aurora-text-muted">Icon</label>
            <div className="flex flex-wrap gap-2">
              {ICONS.map((i) => (
                <button
                  key={i}
                  onClick={() => setIcon(i)}
                  className={`flex h-9 w-9 items-center justify-center rounded-aurora-sm border text-lg transition-aurora ${
                    icon === i ? 'border-aurora-violet bg-aurora-violet/10' : 'border-aurora-border hover:border-aurora-violet'
                  }`}
                >
                  {i}
                </button>
              ))}
            </div>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="mb-1 block text-xs font-medium text-aurora-text-muted">Category</label>
              <select
                value={category}
                onChange={(e) => setCategory(e.target.value)}
                className="w-full rounded-aurora-sm border border-aurora-border bg-aurora-bg px-3 py-2 text-sm text-aurora-text outline-none focus:border-aurora-violet"
              >
                {CATEGORIES.map((c) => (
                  <option key={c} value={c}>
                    {c}
                  </option>
                ))}
              </select>
            </div>
            <div>
              <label className="mb-1 block text-xs font-medium text-aurora-text-muted">Privacy</label>
              <select
                value={privacy}
                onChange={(e) => setPrivacy(e.target.value)}
                className="w-full rounded-aurora-sm border border-aurora-border bg-aurora-bg px-3 py-2 text-sm text-aurora-text outline-none focus:border-aurora-violet"
              >
                <option value="public">Public</option>
                <option value="private">Private</option>
              </select>
            </div>
          </div>

          {error && <p className="text-xs text-aurora-like">{error}</p>}

          <button
            onClick={submit}
            disabled={saving}
            className="w-full rounded-full bg-aurora-gradient py-2.5 text-sm font-semibold text-white transition-aurora hover:opacity-90 disabled:opacity-60"
          >
            {saving ? 'Creating…' : 'Create community'}
          </button>
        </div>
      </div>
    </div>
  );
}
