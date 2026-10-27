import { useState } from 'react';
import { X, Search, Check } from 'lucide-react';
import api from '../services/api';
import useUserSearch from '../hooks/useUserSearch';
import Avatar from './Avatar';

export default function InviteMembersModal({ communityId, onClose, onInvited }) {
  const [query, setQuery] = useState('');
  const results = useUserSearch(query);
  const [invitedIds, setInvitedIds] = useState(new Set());
  const [busyId, setBusyId] = useState(null);
  const [error, setError] = useState(null);

  const invite = async (targetUser) => {
    setBusyId(targetUser._id);
    setError(null);
    try {
      await api.post(`/communities/${communityId}/invite`, { userId: targetUser._id });
      setInvitedIds((prev) => new Set(prev).add(targetUser._id));
      onInvited?.(targetUser);
    } catch (err) {
      setError(err.response?.data?.message || 'Could not invite this user.');
    } finally {
      setBusyId(null);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 px-4">
      <div className="w-full max-w-md rounded-aurora-lg border border-aurora-border bg-aurora-card p-5">
        <div className="mb-4 flex items-center justify-between">
          <h2 className="text-lg font-bold text-aurora-text">Invite people</h2>
          <button onClick={onClose} aria-label="Close" className="text-aurora-text-muted hover:text-aurora-text">
            <X size={20} />
          </button>
        </div>
        <p className="mb-3 text-xs text-aurora-text-muted">
          They'll get an invite and join once they accept it — nothing happens until then.
        </p>

        <div className="relative mb-3">
          <Search size={16} className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-aurora-text-muted" />
          <input
            autoFocus
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Search by name or username"
            className="w-full rounded-full border border-aurora-border bg-aurora-bg py-2.5 pl-9 pr-3 text-sm text-aurora-text outline-none focus:border-aurora-violet"
          />
        </div>

        {error && <p className="mb-2 text-xs text-aurora-like">{error}</p>}

        <div className="max-h-72 space-y-1 overflow-y-auto">
          {query.trim() && results.length === 0 && (
            <p className="py-6 text-center text-sm text-aurora-text-muted">No one found.</p>
          )}
          {results.map((u) => {
            const invited = invitedIds.has(u._id);
            return (
              <div key={u._id} className="flex items-center gap-3 rounded-aurora-sm px-2 py-2 hover:bg-aurora-bg">
                <Avatar src={u.avatarUrl} name={u.name} size={36} />
                <div className="min-w-0 flex-1">
                  <div className="truncate text-sm font-medium text-aurora-text">{u.name}</div>
                  <div className="truncate text-xs text-aurora-text-muted">@{u.username}</div>
                </div>
                <button
                  onClick={() => !invited && invite(u)}
                  disabled={invited || busyId === u._id}
                  className={
                    invited
                      ? 'flex items-center gap-1 rounded-full bg-aurora-bg px-3 py-1.5 text-xs font-semibold text-aurora-text-muted'
                      : 'rounded-full bg-aurora-gradient px-3 py-1.5 text-xs font-semibold text-white transition-aurora hover:opacity-90 disabled:opacity-60'
                  }
                >
                  {invited ? (
                    <>
                      <Check size={13} /> Invited
                    </>
                  ) : busyId === u._id ? (
                    'Inviting…'
                  ) : (
                    'Invite'
                  )}
                </button>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}
