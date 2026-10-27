import { useState } from 'react';
import { X, Flag } from 'lucide-react';
import api from '../services/api';

const REASONS = [
  { id: 'spam', label: 'Spam or misleading' },
  { id: 'harassment', label: 'Harassment or bullying' },
  { id: 'hateSpeech', label: 'Hate speech' },
  { id: 'violence', label: 'Violence or threats' },
  { id: 'nudity', label: 'Nudity or sexual content' },
  { id: 'misinformation', label: 'False information' },
  { id: 'selfHarm', label: 'Self-harm or suicide' },
  { id: 'impersonation', label: 'Impersonation' },
  { id: 'other', label: 'Something else' },
];

const TYPE_LABELS = {
  user: 'account',
  post: 'post',
  comment: 'comment',
  message: 'message',
  community: 'community',
  event: 'event',
};

export default function ReportModal({ targetType, targetId, targetName, onClose }) {
  const [reason, setReason] = useState('');
  const [details, setDetails] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [done, setDone] = useState(false);
  const [error, setError] = useState('');

  const submit = async () => {
    if (!reason) return;
    setSubmitting(true);
    setError('');
    try {
      await api.post('/reports', { targetType, targetId, reason, details });
      setDone(true);
    } catch (err) {
      setError(err.response?.data?.message || 'Could not submit report. Please try again.');
    } finally {
      setSubmitting(false);
    }
  };

  if (done) {
    return (
      <div className="fixed inset-0 z-[60] flex items-center justify-center bg-black/60 px-4">
        <div className="w-full max-w-sm rounded-aurora-lg border border-aurora-border bg-aurora-card p-6 text-center">
          <div className="mx-auto mb-3 flex h-12 w-12 items-center justify-center rounded-full bg-aurora-gradient">
            <Flag size={20} className="text-white" />
          </div>
          <h2 className="mb-1 text-lg font-bold text-aurora-text">Thanks for letting us know</h2>
          <p className="mb-5 text-sm text-aurora-text-muted">
            Our moderation team will review this {TYPE_LABELS[targetType] || 'content'}. We don’t share
            who submitted a report.
          </p>
          <button
            onClick={onClose}
            className="w-full rounded-aurora-sm bg-aurora-gradient py-2.5 text-sm font-semibold text-white"
          >
            Done
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="fixed inset-0 z-[60] flex items-center justify-center bg-black/60 px-4">
      <div className="w-full max-w-sm rounded-aurora-lg border border-aurora-border bg-aurora-card p-5">
        <div className="mb-1 flex items-center justify-between">
          <h2 className="text-lg font-bold text-aurora-text">
            Report {TYPE_LABELS[targetType] || 'content'}
          </h2>
          <button onClick={onClose} aria-label="Close" className="text-aurora-text-muted hover:text-aurora-text">
            <X size={20} />
          </button>
        </div>
        {targetName && <p className="mb-4 text-xs text-aurora-text-muted">{targetName}</p>}

        {error && (
          <div className="mb-3 rounded-aurora-sm border border-aurora-like/30 bg-aurora-like/10 px-3 py-2 text-sm text-aurora-like">
            {error}
          </div>
        )}

        <p className="mb-2 text-xs font-medium uppercase tracking-wide text-aurora-text-muted">
          Why are you reporting this?
        </p>
        <div className="mb-4 max-h-56 space-y-1 overflow-y-auto">
          {REASONS.map((r) => (
            <button
              key={r.id}
              onClick={() => setReason(r.id)}
              className={`flex w-full items-center gap-2.5 rounded-aurora-sm px-3 py-2 text-left text-sm transition-aurora ${
                reason === r.id
                  ? 'bg-aurora-gradient text-white'
                  : 'text-aurora-text hover:bg-aurora-bg'
              }`}
            >
              <span
                className={`h-3.5 w-3.5 flex-shrink-0 rounded-full border-2 ${
                  reason === r.id ? 'border-white bg-white/30' : 'border-aurora-border'
                }`}
              />
              {r.label}
            </button>
          ))}
        </div>

        <textarea
          value={details}
          onChange={(e) => setDetails(e.target.value)}
          maxLength={1000}
          rows={3}
          placeholder="Add any details that would help us review this (optional)"
          className="mb-4 w-full resize-none rounded-aurora-sm border border-aurora-border bg-aurora-bg px-3 py-2 text-sm text-aurora-text outline-none focus:border-aurora-violet"
        />

        <button
          onClick={submit}
          disabled={!reason || submitting}
          className="w-full rounded-aurora-sm bg-aurora-gradient py-2.5 text-sm font-semibold text-white transition-aurora hover:opacity-90 disabled:opacity-50"
        >
          {submitting ? 'Submitting…' : 'Submit report'}
        </button>
      </div>
    </div>
  );
}
