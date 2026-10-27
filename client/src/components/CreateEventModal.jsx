import { useState } from 'react';
import { X } from 'lucide-react';
import api from '../services/api';

// Formats a Date as the yyyy-MM-ddThh:mm string <input type="datetime-local"> expects.
function toLocalInput(date) {
  const pad = (n) => String(n).padStart(2, '0');
  return `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}T${pad(date.getHours())}:${pad(
    date.getMinutes()
  )}`;
}

export default function CreateEventModal({ communityId, onClose, onCreated }) {
  const [name, setName] = useState('');
  const [description, setDescription] = useState('');
  const [startAt, setStartAt] = useState(toLocalInput(new Date(Date.now() + 24 * 60 * 60 * 1000)));
  const [isOnline, setIsOnline] = useState(false);
  const [location, setLocation] = useState('');
  const [error, setError] = useState(null);
  const [saving, setSaving] = useState(false);

  const submit = async () => {
    if (!name.trim()) return setError('Give your event a name.');
    if (!startAt) return setError('Pick a date and time.');
    if (new Date(startAt) < new Date()) return setError('Pick a time in the future.');

    setSaving(true);
    setError(null);
    try {
      const { data } = await api.post('/events', {
        name,
        description,
        startAt,
        isOnline,
        location,
        communityId: communityId || undefined,
      });
      onCreated(data.event);
    } catch (err) {
      setError(err.response?.data?.message || 'Could not create event.');
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 px-4">
      <div className="w-full max-w-md rounded-aurora-lg border border-aurora-border bg-aurora-card p-5">
        <div className="mb-4 flex items-center justify-between">
          <h2 className="text-lg font-bold text-aurora-text">Create an event</h2>
          <button onClick={onClose} aria-label="Close" className="text-aurora-text-muted hover:text-aurora-text">
            <X size={20} />
          </button>
        </div>

        <div className="space-y-3">
          <div>
            <label className="mb-1 block text-xs font-medium text-aurora-text-muted">Event name</label>
            <input
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="e.g. Sunset Photography Walk"
              maxLength={100}
              className="w-full rounded-aurora-sm border border-aurora-border bg-aurora-bg px-3 py-2 text-sm text-aurora-text outline-none focus:border-aurora-violet"
            />
          </div>

          <div>
            <label className="mb-1 block text-xs font-medium text-aurora-text-muted">Description</label>
            <textarea
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              rows={3}
              maxLength={2000}
              className="w-full resize-none rounded-aurora-sm border border-aurora-border bg-aurora-bg px-3 py-2 text-sm text-aurora-text outline-none focus:border-aurora-violet"
            />
          </div>

          <div>
            <label className="mb-1 block text-xs font-medium text-aurora-text-muted">Date &amp; time</label>
            <input
              type="datetime-local"
              value={startAt}
              onChange={(e) => setStartAt(e.target.value)}
              className="w-full rounded-aurora-sm border border-aurora-border bg-aurora-bg px-3 py-2 text-sm text-aurora-text outline-none focus:border-aurora-violet"
            />
          </div>

          <label className="flex items-center gap-2 text-sm text-aurora-text">
            <input type="checkbox" checked={isOnline} onChange={(e) => setIsOnline(e.target.checked)} className="accent-aurora-violet" />
            This is an online event
          </label>

          <div>
            <label className="mb-1 block text-xs font-medium text-aurora-text-muted">
              {isOnline ? 'Meeting link' : 'Location'}
            </label>
            <input
              value={location}
              onChange={(e) => setLocation(e.target.value)}
              placeholder={isOnline ? 'https://…' : 'e.g. Central Park, Kolkata'}
              maxLength={200}
              className="w-full rounded-aurora-sm border border-aurora-border bg-aurora-bg px-3 py-2 text-sm text-aurora-text outline-none focus:border-aurora-violet"
            />
          </div>

          {error && <p className="text-xs text-aurora-like">{error}</p>}

          <button
            onClick={submit}
            disabled={saving}
            className="w-full rounded-full bg-aurora-gradient py-2.5 text-sm font-semibold text-white transition-aurora hover:opacity-90 disabled:opacity-60"
          >
            {saving ? 'Creating…' : 'Create event'}
          </button>
        </div>
      </div>
    </div>
  );
}
