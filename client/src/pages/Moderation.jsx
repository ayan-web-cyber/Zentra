import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { ShieldAlert, Trash2, Ban, Check, X, ShieldCheck } from 'lucide-react';
import api from '../services/api';
import { useAuth } from '../context/AuthContext';
import MainLayout from '../layouts/MainLayout';
import Avatar from '../components/Avatar';
import { promptDialog } from '../utils/confirm';
import { showToast } from '../utils/toast';

const TABS = [
  { id: 'open', label: 'Open' },
  { id: 'reviewing', label: 'Reviewing' },
  { id: 'actioned', label: 'Actioned' },
  { id: 'dismissed', label: 'Dismissed' },
];

const REASON_LABELS = {
  spam: 'Spam',
  harassment: 'Harassment',
  hateSpeech: 'Hate speech',
  violence: 'Violence',
  nudity: 'Nudity',
  misinformation: 'Misinformation',
  selfHarm: 'Self-harm',
  impersonation: 'Impersonation',
  other: 'Other',
};

export default function Moderation() {
  const { user } = useAuth();
  const [tab, setTab] = useState('open');
  const [reports, setReports] = useState([]);
  const [stats, setStats] = useState(null);
  const [loading, setLoading] = useState(true);
  const [busyId, setBusyId] = useState(null);

  const isModerator = user?.role === 'moderator' || user?.role === 'admin';

  const load = async () => {
    setLoading(true);
    try {
      const [reportsRes, statsRes] = await Promise.all([
        api.get('/reports', { params: { status: tab } }),
        api.get('/reports/stats'),
      ]);
      setReports(reportsRes.data.reports);
      setStats(statsRes.data.stats);
    } catch {
      setReports([]);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (isModerator) load();
    else setLoading(false);
  }, [tab, isModerator]);

  const resolve = async (report, { status, action, suspendDays }) => {
    const note = action === 'suspendUser' ? await promptDialog('Reason for suspension (shown to the user):') : '';
    if (action === 'suspendUser' && note === null) return;

    setBusyId(report._id);
    try {
      await api.put(`/reports/${report._id}`, { status, action, moderatorNote: note, suspendDays });
      setReports((prev) => prev.filter((r) => r._id !== report._id));
      const { data } = await api.get('/reports/stats');
      setStats(data.stats);
    } catch (err) {
      showToast(err.response?.data?.message || 'Could not resolve report', { type: 'error' });
    } finally {
      setBusyId(null);
    }
  };

  if (!isModerator) {
    return (
      <MainLayout>
        <div className="rounded-aurora-lg border border-aurora-border bg-aurora-card p-10 text-center">
          <ShieldAlert size={32} className="mx-auto mb-3 text-aurora-text-muted" />
          <h1 className="mb-1 text-lg font-bold text-aurora-text">Moderator access required</h1>
          <p className="text-sm text-aurora-text-muted">
            This area is only available to accounts with a moderator role.
          </p>
        </div>
      </MainLayout>
    );
  }

  return (
    <MainLayout>
      <div className="mb-5 flex items-center gap-3">
        <div className="flex h-10 w-10 items-center justify-center rounded-aurora-sm bg-aurora-gradient">
          <ShieldCheck size={20} className="text-white" />
        </div>
        <div>
          <h1 className="text-xl font-bold text-aurora-text">Moderation</h1>
          {stats && (
            <p className="text-xs text-aurora-text-muted">
              {stats.open} open · {stats.reviewing} reviewing · {stats.actioned} actioned ·{' '}
              {stats.dismissed} dismissed
            </p>
          )}
        </div>
      </div>

      <div className="mb-5 flex gap-2 overflow-x-auto border-b border-aurora-border pb-px">
        {TABS.map((t) => (
          <button
            key={t.id}
            onClick={() => setTab(t.id)}
            className={`flex-shrink-0 border-b-2 px-3 py-2 text-sm font-medium transition-aurora ${
              tab === t.id
                ? 'border-aurora-violet text-aurora-text'
                : 'border-transparent text-aurora-text-muted hover:text-aurora-text'
            }`}
          >
            {t.label}
            {t.id === 'open' && stats?.open > 0 && (
              <span className="ml-1.5 rounded-full bg-aurora-like px-1.5 py-0.5 text-[10px] text-white">
                {stats.open}
              </span>
            )}
          </button>
        ))}
      </div>

      {loading ? (
        <div className="flex h-40 items-center justify-center">
          <div className="h-8 w-8 animate-spin rounded-full border-2 border-aurora-border border-t-aurora-violet" />
        </div>
      ) : reports.length === 0 ? (
        <div className="rounded-aurora-lg border border-aurora-border bg-aurora-card p-10 text-center text-sm text-aurora-text-muted">
          Nothing in this queue.
        </div>
      ) : (
        <div className="space-y-3">
          {reports.map((r) => (
            <div key={r._id} className="rounded-aurora-lg border border-aurora-border bg-aurora-card p-4">
              <div className="mb-2 flex flex-wrap items-center gap-2">
                <span className="rounded-full bg-aurora-like/15 px-2.5 py-0.5 text-xs font-medium text-aurora-like">
                  {REASON_LABELS[r.reason] || r.reason}
                </span>
                <span className="rounded-full bg-aurora-bg px-2.5 py-0.5 text-xs text-aurora-text-muted">
                  {r.targetType}
                </span>
                {!r.targetExists && (
                  <span className="rounded-full bg-aurora-bg px-2.5 py-0.5 text-xs text-aurora-text-muted">
                    content deleted
                  </span>
                )}
                {r.targetOwner?.isSuspended && (
                  <span className="rounded-full bg-aurora-like/15 px-2.5 py-0.5 text-xs text-aurora-like">
                    author suspended
                  </span>
                )}
                <span className="ml-auto text-xs text-aurora-text-muted">
                  {new Date(r.createdAt).toLocaleString()}
                </span>
              </div>

              {r.targetPreview && (
                <p className="mb-3 rounded-aurora-sm bg-aurora-bg px-3 py-2 text-sm text-aurora-text">
                  {String(r.targetPreview).slice(0, 300)}
                </p>
              )}
              {r.details && (
                <p className="mb-3 text-sm text-aurora-text-muted">
                  <span className="font-medium text-aurora-text">Reporter’s note:</span> {r.details}
                </p>
              )}

              <div className="mb-3 flex flex-wrap items-center gap-4 text-xs text-aurora-text-muted">
                {r.reporter && (
                  <span className="flex items-center gap-1.5">
                    Reported by
                    <Link to={`/profile/${r.reporter.username}`} className="flex items-center gap-1 hover:underline">
                      <Avatar src={r.reporter.avatarUrl} name={r.reporter.name} size={18} />
                      {r.reporter.name}
                    </Link>
                  </span>
                )}
                {r.targetOwner && (
                  <span className="flex items-center gap-1.5">
                    Author
                    <Link to={`/profile/${r.targetOwner.username}`} className="flex items-center gap-1 hover:underline">
                      <Avatar src={r.targetOwner.avatarUrl} name={r.targetOwner.name} size={18} />
                      {r.targetOwner.name}
                    </Link>
                  </span>
                )}
              </div>

              {(tab === 'open' || tab === 'reviewing') && (
                <div className="flex flex-wrap gap-2">
                  <button
                    onClick={() => resolve(r, { status: 'dismissed', action: 'none' })}
                    disabled={busyId === r._id}
                    className="flex items-center gap-1.5 rounded-full border border-aurora-border px-3 py-1.5 text-xs font-medium text-aurora-text transition-aurora hover:border-aurora-violet disabled:opacity-50"
                  >
                    <X size={13} /> Dismiss
                  </button>
                  {r.targetType !== 'user' && r.targetExists && (
                    <button
                      onClick={() => resolve(r, { status: 'actioned', action: 'deleteContent' })}
                      disabled={busyId === r._id}
                      className="flex items-center gap-1.5 rounded-full border border-aurora-border px-3 py-1.5 text-xs font-medium text-aurora-like transition-aurora hover:border-aurora-like disabled:opacity-50"
                    >
                      <Trash2 size={13} /> Delete content
                    </button>
                  )}
                  <button
                    onClick={() => resolve(r, { status: 'actioned', action: 'suspendUser', suspendDays: 7 })}
                    disabled={busyId === r._id}
                    className="flex items-center gap-1.5 rounded-full border border-aurora-border px-3 py-1.5 text-xs font-medium text-aurora-like transition-aurora hover:border-aurora-like disabled:opacity-50"
                  >
                    <Ban size={13} /> Suspend author (7d)
                  </button>
                  {tab === 'open' && (
                    <button
                      onClick={() => resolve(r, { status: 'reviewing', action: 'none' })}
                      disabled={busyId === r._id}
                      className="flex items-center gap-1.5 rounded-full border border-aurora-border px-3 py-1.5 text-xs font-medium text-aurora-text-muted transition-aurora hover:border-aurora-violet disabled:opacity-50"
                    >
                      <Check size={13} /> Mark reviewing
                    </button>
                  )}
                </div>
              )}

              {r.moderatorNote && (
                <p className="mt-2 text-xs text-aurora-text-muted">
                  <span className="font-medium text-aurora-text">Moderator note:</span> {r.moderatorNote}
                </p>
              )}
            </div>
          ))}
        </div>
      )}
    </MainLayout>
  );
}
