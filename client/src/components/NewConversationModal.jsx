import { useEffect, useMemo, useState } from 'react';
import { X, Users, Check, AlertCircle } from 'lucide-react';
import api from '../services/api';
import useUserSearch from '../hooks/useUserSearch';
import { useAuth } from '../context/AuthContext';
import Avatar from './Avatar';

// Two modes in one sheet — starting a 1:1 chat and starting a group are the same
// action from the user's point of view ("message someone"), they just differ in how
// many people you pick.
//
// The group side of this is new. The backend has had POST /api/conversations/group
// (plus admins, add/remove member and group-aware message fan-out) since Phase 6,
// but nothing in the client ever called it, so groups were unreachable: the only way
// to get one was a community's auto-created chat. This is that missing UI.
export default function NewConversationModal({ onClose, onStarted }) {
  const { user } = useAuth();
  const [mode, setMode] = useState('direct'); // 'direct' | 'group'
  const [query, setQuery] = useState('');
  const [groupName, setGroupName] = useState('');
  const [selected, setSelected] = useState([]); // full user objects, so chips can show a name
  const [friends, setFriends] = useState([]);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');

  const searchResults = useUserSearch(query);

  // With an empty search box, offer the person's friends rather than a blank panel —
  // a group chat is almost always made out of people you already know, and typing each
  // username from memory on a phone keyboard is the slow path.
  useEffect(() => {
    if (!user?.username) return;
    api
      .get(`/users/${user.username}/friends`)
      .then(({ data }) => setFriends(data.friends || []))
      .catch(() => setFriends([]));
  }, [user?.username]);

  const list = useMemo(() => {
    const source = query.trim() ? searchResults : friends;
    return source.filter((u) => u._id !== user?._id);
  }, [query, searchResults, friends, user?._id]);

  const isSelected = (u) => selected.some((s) => s._id === u._id);

  const toggle = (u) => {
    setError('');
    setSelected((prev) => (prev.some((s) => s._id === u._id) ? prev.filter((s) => s._id !== u._id) : [...prev, u]));
  };

  const startDirect = async (username) => {
    setBusy(true);
    setError('');
    try {
      const { data } = await api.post(`/conversations/direct/${username}`);
      onStarted(data.conversation);
    } catch (err) {
      setError(err.response?.data?.message || 'Could not start that conversation.');
      setBusy(false);
    }
  };

  // Mirrors the server's own rule (a group is the creator plus at least two others) so the
  // button is disabled for a reason the user can see, instead of failing on submit.
  const canCreateGroup = groupName.trim().length > 0 && selected.length >= 2;

  const createGroup = async () => {
    if (!canCreateGroup || busy) return;
    setBusy(true);
    setError('');
    try {
      const { data } = await api.post('/conversations/group', {
        groupName: groupName.trim(),
        memberUsernames: selected.map((s) => s.username),
      });
      onStarted(data.conversation);
    } catch (err) {
      setError(err.response?.data?.message || 'Could not create the group.');
      setBusy(false);
    }
  };

  const switchMode = (next) => {
    setMode(next);
    setError('');
    setQuery('');
    if (next === 'direct') setSelected([]);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-end justify-center bg-black/60 px-0 sm:items-center sm:px-4">
      {/* Bottom sheet on a phone, centred dialog from `sm` up. `max-h`/`min-h-0` plus the
          scroll region below keep the action button reachable when the keyboard is open. */}
      <div className="flex max-h-[85dvh] w-full flex-col rounded-t-aurora-lg border border-aurora-border bg-aurora-card p-5 sm:max-w-sm sm:rounded-aurora-lg">
        <div className="mb-4 flex items-center justify-between">
          <h2 className="text-lg font-bold text-aurora-text">
            {mode === 'direct' ? 'New message' : 'New group'}
          </h2>
          <button onClick={onClose} aria-label="Close" className="text-aurora-text-muted hover:text-aurora-text">
            <X size={20} />
          </button>
        </div>

        <div role="tablist" className="mb-4 flex gap-1 rounded-aurora-sm bg-aurora-bg p-1">
          {[
            { key: 'direct', label: 'Chat' },
            { key: 'group', label: 'Group' },
          ].map(({ key, label }) => (
            <button
              key={key}
              role="tab"
              aria-selected={mode === key}
              onClick={() => switchMode(key)}
              className={`flex-1 rounded-aurora-sm px-3 py-1.5 text-sm font-medium transition-aurora ${
                mode === key ? 'bg-aurora-gradient text-white' : 'text-aurora-text-muted hover:text-aurora-text'
              }`}
            >
              {label}
            </button>
          ))}
        </div>

        {mode === 'group' && (
          <>
            <input
              value={groupName}
              onChange={(e) => setGroupName(e.target.value)}
              maxLength={50}
              placeholder="Group name"
              aria-label="Group name"
              className="mb-3 w-full rounded-aurora-sm border border-aurora-border bg-aurora-bg px-4 py-2 text-sm text-aurora-text outline-none focus:border-aurora-violet"
            />

            {selected.length > 0 && (
              <div className="mb-3 flex flex-wrap gap-1.5">
                {selected.map((s) => (
                  <button
                    key={s._id}
                    onClick={() => toggle(s)}
                    className="flex items-center gap-1 rounded-full bg-aurora-bg px-2.5 py-1 text-xs text-aurora-text transition-aurora hover:text-aurora-like"
                  >
                    {s.name}
                    <X size={12} />
                    <span className="sr-only">Remove {s.name}</span>
                  </button>
                ))}
              </div>
            )}
          </>
        )}

        <input
          autoFocus
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          placeholder="Search people…"
          aria-label="Search people"
          className="mb-3 w-full rounded-aurora-sm border border-aurora-border bg-aurora-bg px-4 py-2 text-sm text-aurora-text outline-none focus:border-aurora-violet"
        />

        <div className="min-h-0 flex-1 space-y-1 overflow-y-auto">
          {!query.trim() && friends.length > 0 && (
            <p className="px-2 pb-1 text-[11px] font-medium uppercase tracking-wide text-aurora-text-muted">
              Your friends
            </p>
          )}

          {list.map((u) => (
            <button
              key={u._id}
              disabled={busy}
              onClick={() => (mode === 'direct' ? startDirect(u.username) : toggle(u))}
              className="flex w-full items-center gap-3 rounded-aurora-sm px-2 py-2 text-left transition-aurora hover:bg-aurora-bg disabled:opacity-60"
            >
              <Avatar src={u.avatarUrl} name={u.name} size={36} />
              <div className="min-w-0 flex-1">
                <div className="truncate text-sm font-medium text-aurora-text">{u.name}</div>
                <div className="truncate text-xs text-aurora-text-muted">@{u.username}</div>
              </div>
              {mode === 'group' && (
                <span
                  className={`flex h-5 w-5 flex-shrink-0 items-center justify-center rounded-full border ${
                    isSelected(u)
                      ? 'border-transparent bg-aurora-gradient text-white'
                      : 'border-aurora-border text-transparent'
                  }`}
                >
                  <Check size={13} />
                </span>
              )}
            </button>
          ))}

          {query.trim() && list.length === 0 && <p className="px-2 py-2 text-xs text-aurora-text-muted">No matches</p>}
          {!query.trim() && friends.length === 0 && (
            <p className="px-2 py-4 text-center text-xs text-aurora-text-muted">
              Search for someone by name or username to start.
            </p>
          )}
        </div>

        {error && (
          <p className="mt-3 flex items-center gap-1.5 text-xs text-aurora-like">
            <AlertCircle size={13} className="flex-shrink-0" />
            {error}
          </p>
        )}

        {mode === 'group' && (
          <div className="mt-4 flex-shrink-0">
            <button
              onClick={createGroup}
              disabled={!canCreateGroup || busy}
              className="flex w-full items-center justify-center gap-2 rounded-aurora-sm bg-aurora-gradient px-4 py-2.5 text-sm font-semibold text-white transition-aurora disabled:opacity-40"
            >
              <Users size={16} />
              {busy ? 'Creating…' : 'Create group'}
            </button>
            <p className="mt-2 text-center text-[11px] text-aurora-text-muted">
              {selected.length < 2
                ? `Pick ${2 - selected.length} more ${selected.length === 1 ? 'person' : 'people'}`
                : `${selected.length + 1} members including you`}
            </p>
          </div>
        )}
      </div>
    </div>
  );
}
