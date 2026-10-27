import { useState } from 'react';
import { Link } from 'react-router-dom';
import { X, UserPlus, UserMinus, AlertCircle } from 'lucide-react';
import api from '../services/api';
import useUserSearch from '../hooks/useUserSearch';
import { useAuth } from '../context/AuthContext';
import Avatar from './Avatar';
import { confirmDialog } from '../utils/confirm';

const idOf = (v) => String(v?._id || v);

export default function GroupMembersModal({ conversation, onClose, onUpdate }) {
  const { user } = useAuth();
  const [members, setMembers] = useState(conversation.participants);
  const [adding, setAdding] = useState(false);
  const [query, setQuery] = useState('');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');

  const results = useUserSearch(query);
  // POST /:id/members and DELETE /:id/members/:userId are both admin-only on the server,
  // so only show the controls to someone who can actually use them.
  const isAdmin = (conversation.admins || []).some((a) => idOf(a) === String(user?._id));

  const alreadyIn = (u) => members.some((m) => m._id === u._id) || u._id === user?._id;

  const push = (next) => {
    setMembers(next);
    onUpdate?.({ participants: next });
  };

  const addMember = async (u) => {
    setBusy(true);
    setError('');
    try {
      await api.post(`/conversations/${conversation._id}/members`, { username: u.username });
      push([...members, u]);
      setQuery('');
      setAdding(false);
    } catch (err) {
      setError(err.response?.data?.message || 'Could not add that person.');
    } finally {
      setBusy(false);
    }
  };

  const removeMember = async (m) => {
    if (!(await confirmDialog(`Remove ${m.name} from ${conversation.groupName}?`, { danger: true, confirmLabel: 'Remove' }))) return;
    setBusy(true);
    setError('');
    try {
      await api.delete(`/conversations/${conversation._id}/members/${m._id}`);
      push(members.filter((x) => x._id !== m._id));
    } catch (err) {
      setError(err.response?.data?.message || 'Could not remove that person.');
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-end justify-center bg-black/60 px-0 sm:items-center sm:px-4">
      <div className="flex max-h-[85dvh] w-full flex-col rounded-t-aurora-lg border border-aurora-border bg-aurora-card p-5 sm:max-w-sm sm:rounded-aurora-lg">
        <div className="mb-4 flex items-center justify-between">
          <h2 className="min-w-0 truncate text-lg font-bold text-aurora-text">{conversation.groupName}</h2>
          <button onClick={onClose} aria-label="Close" className="text-aurora-text-muted hover:text-aurora-text">
            <X size={20} />
          </button>
        </div>

        <div className="mb-3 flex items-center justify-between gap-2">
          <p className="text-xs font-medium uppercase tracking-wide text-aurora-text-muted">
            {members.length + 1} members
          </p>
          {isAdmin && (
            <button
              onClick={() => setAdding((v) => !v)}
              className="flex items-center gap-1.5 text-xs font-medium text-aurora-violet"
            >
              <UserPlus size={14} />
              {adding ? 'Done' : 'Add people'}
            </button>
          )}
        </div>

        {adding && (
          <div className="mb-3 rounded-aurora-sm border border-aurora-border bg-aurora-bg p-2">
            <input
              autoFocus
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder="Search people to add…"
              aria-label="Search people to add"
              className="mb-1 w-full bg-transparent px-1.5 py-1 text-sm text-aurora-text outline-none placeholder:text-aurora-text-muted"
            />
            <div className="max-h-40 overflow-y-auto">
              {results
                .filter((u) => !alreadyIn(u))
                .map((u) => (
                  <button
                    key={u._id}
                    disabled={busy}
                    onClick={() => addMember(u)}
                    className="flex w-full items-center gap-2.5 rounded-aurora-sm px-1.5 py-1.5 text-left transition-aurora hover:bg-aurora-card disabled:opacity-60"
                  >
                    <Avatar src={u.avatarUrl} name={u.name} size={28} />
                    <span className="min-w-0 flex-1 truncate text-sm text-aurora-text">{u.name}</span>
                    <UserPlus size={14} className="flex-shrink-0 text-aurora-violet" />
                  </button>
                ))}
              {query.trim() && results.filter((u) => !alreadyIn(u)).length === 0 && (
                <p className="px-1.5 py-2 text-xs text-aurora-text-muted">No one new to add</p>
              )}
            </div>
          </div>
        )}

        {error && (
          <p className="mb-2 flex items-center gap-1.5 text-xs text-aurora-like">
            <AlertCircle size={13} className="flex-shrink-0" />
            {error}
          </p>
        )}

        <div className="min-h-0 flex-1 space-y-1 overflow-y-auto">
          {members.map((p) => (
            <div key={p._id} className="flex items-center gap-3 rounded-aurora-sm px-2 py-2 hover:bg-aurora-bg">
              <Link to={`/profile/${p.username}`} onClick={onClose} className="flex min-w-0 flex-1 items-center gap-3">
                <div className="relative flex-shrink-0">
                  <Avatar src={p.avatarUrl} name={p.name} size={40} />
                  {p.isOnline && (
                    <span className="absolute bottom-0 right-0 h-2.5 w-2.5 rounded-full border-2 border-aurora-card bg-green-400" />
                  )}
                </div>
                <div className="min-w-0">
                  <div className="truncate text-sm font-medium text-aurora-text">{p.name}</div>
                  <div className="truncate text-xs text-aurora-text-muted">@{p.username}</div>
                </div>
              </Link>

              {(conversation.admins || []).some((a) => idOf(a) === String(p._id)) && (
                <span className="flex-shrink-0 rounded-full bg-aurora-bg px-2 py-0.5 text-[10px] font-medium text-aurora-text-muted">
                  Admin
                </span>
              )}

              {isAdmin && (
                <button
                  onClick={() => removeMember(p)}
                  disabled={busy}
                  aria-label={`Remove ${p.name}`}
                  className="flex-shrink-0 text-aurora-text-muted transition-aurora hover:text-aurora-like disabled:opacity-40"
                >
                  <UserMinus size={16} />
                </button>
              )}
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
