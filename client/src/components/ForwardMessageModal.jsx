import { useEffect, useState } from 'react';
import { X, Send, Users, Search, AlertCircle } from 'lucide-react';
import api from '../services/api';
import { useAuth } from '../context/AuthContext';
import Avatar from './Avatar';
import { showToast } from '../utils/toast';

function conversationLabel(convo, myId) {
  if (convo.isGroup) return convo.groupName || 'Group';
  const other = convo.participants.find((p) => p._id !== myId) || convo.participants[0];
  return other?.name || 'Conversation';
}

function conversationAvatar(convo, myId) {
  if (convo.isGroup) return null;
  const other = convo.participants.find((p) => p._id !== myId) || convo.participants[0];
  return other;
}

// A compact preview of what's being forwarded — reuses the same rendering logic a bubble
// would, minus interactions, so the person can confirm what they're about to send.
function ForwardPreview({ message }) {
  if (message.type === 'text') {
    return <p className="line-clamp-3 text-sm text-aurora-text">{message.text}</p>;
  }
  if (message.type === 'image') {
    return <img src={message.media?.url} alt="" className="h-16 w-16 rounded-aurora-sm object-cover" />;
  }
  if (message.type === 'video') {
    return <div className="text-sm text-aurora-text-muted">🎬 Video message</div>;
  }
  if (message.type === 'voice') {
    return <div className="text-sm text-aurora-text-muted">🎤 Voice message</div>;
  }
  return <div className="text-sm text-aurora-text-muted">📎 {message.media?.filename || 'File'}</div>;
}

export default function ForwardMessageModal({ message, onClose, onForwarded }) {
  const { user } = useAuth();
  const [conversations, setConversations] = useState([]);
  const [selected, setSelected] = useState([]);
  const [query, setQuery] = useState('');
  const [loading, setLoading] = useState(true);
  const [sending, setSending] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => {
    api
      .get('/conversations')
      .then(({ data }) => setConversations(data.conversations || []))
      .catch(() => setError('Could not load your conversations.'))
      .finally(() => setLoading(false));
  }, []);

  const toggle = (id) => {
    setError('');
    setSelected((prev) => (prev.includes(id) ? prev.filter((x) => x !== id) : [...prev, id]));
  };

  const filtered = conversations.filter((c) =>
    conversationLabel(c, user?._id).toLowerCase().includes(query.trim().toLowerCase())
  );

  const confirmForward = async () => {
    if (!selected.length || sending) return;
    setSending(true);
    setError('');
    try {
      await api.post(`/messages/${message._id}/forward`, { conversationIds: selected });
      showToast('Message forwarded', { type: 'success' });
      onForwarded?.();
      onClose();
    } catch (err) {
      setError(err.response?.data?.message || 'Could not forward that message.');
      setSending(false);
    }
  };

  return (
    <div className="fixed inset-0 z-[60] flex items-center justify-center bg-black/60 px-4" onKeyDown={(e) => e.key === 'Escape' && onClose()}>
      <div className="flex max-h-[85vh] w-full max-w-sm flex-col rounded-aurora-lg border border-aurora-border bg-aurora-card">
        <div className="flex items-center justify-between border-b border-aurora-border p-4">
          <h2 className="text-lg font-bold text-aurora-text">Forward message</h2>
          <button onClick={onClose} aria-label="Close" className="text-aurora-text-muted hover:text-aurora-text">
            <X size={20} />
          </button>
        </div>

        <div className="border-b border-aurora-border p-3">
          <div className="rounded-aurora-sm bg-aurora-bg p-2.5">
            <ForwardPreview message={message} />
          </div>
        </div>

        <div className="flex items-center gap-2 border-b border-aurora-border px-4 py-2">
          <Search size={15} className="flex-shrink-0 text-aurora-text-muted" />
          <input
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Search conversations…"
            aria-label="Search conversations"
            className="min-w-0 flex-1 bg-transparent py-1 text-sm text-aurora-text outline-none placeholder:text-aurora-text-muted"
          />
        </div>

        {error && (
          <div className="mx-4 mt-3 flex items-center gap-1.5 rounded-aurora-sm border border-aurora-like/30 bg-aurora-like/10 px-3 py-2 text-xs text-aurora-like">
            <AlertCircle size={13} className="flex-shrink-0" />
            {error}
          </div>
        )}

        <div className="min-h-0 flex-1 space-y-1 overflow-y-auto p-2">
          {loading ? (
            <div className="flex h-24 items-center justify-center">
              <div className="h-5 w-5 animate-spin rounded-full border-2 border-aurora-border border-t-aurora-violet" />
            </div>
          ) : filtered.length === 0 ? (
            <p className="px-3 py-6 text-center text-sm text-aurora-text-muted">No conversations found.</p>
          ) : (
            filtered.map((c) => {
              const isChecked = selected.includes(c._id);
              const avatarUser = conversationAvatar(c, user?._id);
              return (
                <button
                  key={c._id}
                  type="button"
                  role="checkbox"
                  aria-checked={isChecked}
                  onClick={() => toggle(c._id)}
                  className={`flex w-full items-center gap-3 rounded-aurora-sm px-3 py-2 text-left transition-aurora ${
                    isChecked ? 'bg-aurora-gradient text-white' : 'hover:bg-aurora-bg'
                  }`}
                >
                  {c.isGroup ? (
                    <div className="flex h-9 w-9 flex-shrink-0 items-center justify-center rounded-full bg-aurora-gradient text-white">
                      <Users size={16} />
                    </div>
                  ) : (
                    <Avatar src={avatarUser?.avatarUrl} name={avatarUser?.name} size={36} />
                  )}
                  <span className={`min-w-0 flex-1 truncate text-sm font-medium ${isChecked ? 'text-white' : 'text-aurora-text'}`}>
                    {conversationLabel(c, user?._id)}
                  </span>
                  <span
                    className={`flex h-5 w-5 flex-shrink-0 items-center justify-center rounded-full border-2 ${
                      isChecked ? 'border-white bg-white/30' : 'border-aurora-border'
                    }`}
                  />
                </button>
              );
            })
          )}
        </div>

        <div className="border-t border-aurora-border p-3">
          <button
            onClick={confirmForward}
            disabled={!selected.length || sending}
            className="flex w-full items-center justify-center gap-2 rounded-aurora-sm bg-aurora-gradient py-2.5 text-sm font-semibold text-white disabled:opacity-40"
          >
            <Send size={15} />
            {sending ? 'Forwarding…' : selected.length ? `Forward to ${selected.length}` : 'Select a conversation'}
          </button>
        </div>
      </div>
    </div>
  );
}
