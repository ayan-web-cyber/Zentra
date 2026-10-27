import { useEffect, useState } from 'react';
import { X, PhoneIncoming, PhoneOutgoing, PhoneMissed, Video } from 'lucide-react';
import api from '../services/api';
import Avatar from './Avatar';

function formatDuration(seconds) {
  if (!seconds) return '';
  const m = Math.floor(seconds / 60);
  const s = seconds % 60;
  return `${m}:${String(s).padStart(2, '0')}`;
}

export default function CallHistoryModal({ onClose }) {
  const [calls, setCalls] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    api.get('/calls').then(({ data }) => {
      setCalls(data.calls);
      setLoading(false);
    });
  }, []);

  const icon = (call) => {
    if (call.status === 'missed' && !call.isOutgoing) return <PhoneMissed size={16} className="text-aurora-like" />;
    return call.isOutgoing ? (
      <PhoneOutgoing size={16} className="text-aurora-text-muted" />
    ) : (
      <PhoneIncoming size={16} className="text-aurora-text-muted" />
    );
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 px-4">
      <div className="w-full max-w-sm rounded-aurora-lg border border-aurora-border bg-aurora-card p-5">
        <div className="mb-4 flex items-center justify-between">
          <h2 className="text-lg font-bold text-aurora-text">Call history</h2>
          <button onClick={onClose} aria-label="Close" className="text-aurora-text-muted hover:text-aurora-text">
            <X size={20} />
          </button>
        </div>

        <div className="max-h-96 space-y-1 overflow-y-auto">
          {loading ? (
            <div className="flex h-24 items-center justify-center">
              <div className="h-6 w-6 animate-spin rounded-full border-2 border-aurora-border border-t-aurora-violet" />
            </div>
          ) : calls.length === 0 ? (
            <p className="py-6 text-center text-sm text-aurora-text-muted">No calls yet.</p>
          ) : (
            calls.map((call) => (
              <div key={call._id} className="flex items-center gap-3 rounded-aurora-sm px-2 py-2">
                <Avatar src={call.otherParty?.avatarUrl} name={call.otherParty?.name} size={36} />
                <div className="flex-1">
                  <div className="text-sm font-medium text-aurora-text">{call.otherParty?.name}</div>
                  <div className="flex items-center gap-1 text-xs text-aurora-text-muted">
                    {icon(call)}
                    {call.type === 'video' && <Video size={12} />}
                    {call.status === 'missed' ? 'Missed' : formatDuration(call.durationSeconds) || call.status}
                  </div>
                </div>
                <span className="text-xs text-aurora-text-muted">
                  {new Date(call.createdAt).toLocaleDateString()}
                </span>
              </div>
            ))
          )}
        </div>
      </div>
    </div>
  );
}
