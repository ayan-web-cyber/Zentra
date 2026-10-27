import { useEffect, useState } from 'react';
import { X, Search, Users, Link2, Share2, Download, Send, Check, AlertCircle } from 'lucide-react';
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
  return convo.participants.find((p) => p._id !== myId) || convo.participants[0];
}

// The "send directly to a friend" half of the sheet (left column of both reference
// screenshots) plus a row of "leave the app" actions (right column: copy link / share /
// download) — same split as the Instagram share sheet this was modeled on. Works for
// both a feed post and a reel, since both are just a Post document underneath.
export default function ShareSheet({ post, onClose, onShared }) {
  const { user } = useAuth();
  const [conversations, setConversations] = useState([]);
  const [selected, setSelected] = useState([]);
  const [query, setQuery] = useState('');
  const [loading, setLoading] = useState(true);
  const [sending, setSending] = useState(false);
  const [error, setError] = useState('');
  const [sent, setSent] = useState(false);

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

  const postUrl = `${window.location.origin}/post/${post._id}`;
  // Only offer Download when there's an actual file to save — a text or poll post has
  // nothing for this button to do.
  const downloadableMedia = post.type !== 'poll' && post.type !== 'text' ? post.media?.[0] : null;

  const sendToSelected = async () => {
    if (!selected.length || sending) return;
    setSending(true);
    setError('');
    try {
      await api.post(`/posts/${post._id}/share-to`, { conversationIds: selected });
      setSent(true);
      onShared?.();
      showToast(selected.length > 1 ? 'Post sent' : 'Post sent', { type: 'success' });
      setTimeout(onClose, 600);
    } catch (err) {
      setError(err.response?.data?.message || 'Could not send that post.');
      setSending(false);
    }
  };

  const handleCopyLink = async () => {
    try {
      await navigator.clipboard.writeText(postUrl);
      await api.post(`/posts/${post._id}/share`).catch(() => {});
      onShared?.();
      showToast('Post link copied', { type: 'success' });
      onClose();
    } catch {
      showToast("Couldn't copy — your browser blocked clipboard access.", { type: 'error' });
    }
  };

  // The actual "share to Facebook/WhatsApp/SMS/etc" step (right side of both reference
  // screenshots) is the operating system's own share sheet — a web app reaches that
  // through the standard Web Share API rather than hand-building a deep link per app,
  // most of which don't have a public web share URL anyway.
  const handleNativeShare = async () => {
    const shareData = { title: 'Zentra', text: post.caption || 'Check out this post on Zentra', url: postUrl };
    if (navigator.share) {
      try {
        await navigator.share(shareData);
        await api.post(`/posts/${post._id}/share`).catch(() => {});
        onShared?.();
        onClose();
      } catch (err) {
        if (err?.name !== 'AbortError') showToast('Could not open the share menu.', { type: 'error' });
      }
    } else {
      // No native share sheet available (most desktop browsers) — copying the link is
      // the closest equivalent rather than leaving the button silently do nothing.
      await handleCopyLink();
    }
  };

  const handleDownload = async () => {
    if (!downloadableMedia?.url) return;
    try {
      const res = await fetch(downloadableMedia.url, { credentials: 'include' });
      if (!res.ok) throw new Error('download failed');
      const blob = await res.blob();
      const blobUrl = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = blobUrl;
      a.download = downloadableMedia.filename || `zentra-${post._id}`;
      document.body.appendChild(a);
      a.click();
      a.remove();
      URL.revokeObjectURL(blobUrl);
      await api.post(`/posts/${post._id}/share`).catch(() => {});
      onShared?.();
    } catch {
      showToast('Could not download this media.', { type: 'error' });
    }
  };

  return (
    <div
      className="fixed inset-0 z-[60] flex items-end justify-center bg-black/60 sm:items-center sm:px-4"
      onClick={onClose}
      onKeyDown={(e) => e.key === 'Escape' && onClose()}
    >
      <div
        role="dialog"
        aria-modal="true"
        aria-label="Share"
        onClick={(e) => e.stopPropagation()}
        className="flex max-h-[85vh] w-full max-w-sm flex-col rounded-t-aurora-lg border border-aurora-border bg-aurora-card sm:rounded-aurora-lg"
      >
        <div className="flex items-center justify-between border-b border-aurora-border p-4">
          <h2 className="text-lg font-bold text-aurora-text">Share</h2>
          <button onClick={onClose} aria-label="Close" className="text-aurora-text-muted hover:text-aurora-text">
            <X size={20} />
          </button>
        </div>

        <div className="flex items-center gap-2 border-b border-aurora-border px-4 py-2">
          <Search size={15} className="flex-shrink-0 text-aurora-text-muted" />
          <input
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Search"
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

        <div className="min-h-0 flex-1 overflow-y-auto p-3">
          {loading ? (
            <div className="flex h-24 items-center justify-center">
              <div className="h-5 w-5 animate-spin rounded-full border-2 border-aurora-border border-t-aurora-violet" />
            </div>
          ) : filtered.length === 0 ? (
            <p className="px-3 py-6 text-center text-sm text-aurora-text-muted">No conversations found.</p>
          ) : (
            <div className="grid grid-cols-3 gap-3">
              {filtered.map((c) => {
                const isChecked = selected.includes(c._id);
                const avatarUser = conversationAvatar(c, user?._id);
                return (
                  <button
                    key={c._id}
                    type="button"
                    role="checkbox"
                    aria-checked={isChecked}
                    onClick={() => toggle(c._id)}
                    className="flex flex-col items-center gap-1.5 rounded-aurora-sm p-1.5 text-center transition-aurora hover:bg-aurora-bg"
                  >
                    <span className="relative">
                      {c.isGroup ? (
                        <span className="flex h-14 w-14 items-center justify-center rounded-full bg-aurora-gradient text-white">
                          <Users size={22} />
                        </span>
                      ) : (
                        <Avatar src={avatarUser?.avatarUrl} name={avatarUser?.name} size={56} />
                      )}
                      <span
                        className={`absolute -bottom-0.5 -right-0.5 flex h-5 w-5 items-center justify-center rounded-full border-2 border-aurora-card ${
                          isChecked ? 'bg-aurora-violet text-white' : 'bg-aurora-border/60'
                        }`}
                      >
                        {isChecked && <Check size={12} />}
                      </span>
                    </span>
                    <span className="w-full truncate text-xs text-aurora-text">{conversationLabel(c, user?._id)}</span>
                  </button>
                );
              })}
            </div>
          )}
        </div>

        {selected.length > 0 && (
          <div className="border-t border-aurora-border p-3">
            <button
              onClick={sendToSelected}
              disabled={sending || sent}
              className="flex w-full items-center justify-center gap-2 rounded-aurora-sm bg-aurora-gradient py-2.5 text-sm font-semibold text-white disabled:opacity-60"
            >
              {sent ? <Check size={15} /> : <Send size={15} />}
              {sent ? 'Sent' : sending ? 'Sending…' : `Send to ${selected.length}`}
            </button>
          </div>
        )}

        <div className="grid grid-cols-3 gap-2 border-t border-aurora-border p-3">
          <button
            onClick={handleCopyLink}
            className="flex flex-col items-center gap-1.5 rounded-aurora-sm py-2 text-aurora-text-muted transition-aurora hover:bg-aurora-bg hover:text-aurora-text"
          >
            <span className="flex h-11 w-11 items-center justify-center rounded-full bg-aurora-bg">
              <Link2 size={18} />
            </span>
            <span className="text-xs">Copy link</span>
          </button>
          <button
            onClick={handleNativeShare}
            className="flex flex-col items-center gap-1.5 rounded-aurora-sm py-2 text-aurora-text-muted transition-aurora hover:bg-aurora-bg hover:text-aurora-text"
          >
            <span className="flex h-11 w-11 items-center justify-center rounded-full bg-aurora-bg">
              <Share2 size={18} />
            </span>
            <span className="text-xs">Share to…</span>
          </button>
          <button
            onClick={handleDownload}
            disabled={!downloadableMedia}
            className="flex flex-col items-center gap-1.5 rounded-aurora-sm py-2 text-aurora-text-muted transition-aurora hover:bg-aurora-bg hover:text-aurora-text disabled:opacity-30"
          >
            <span className="flex h-11 w-11 items-center justify-center rounded-full bg-aurora-bg">
              <Download size={18} />
            </span>
            <span className="text-xs">Download</span>
          </button>
        </div>
      </div>
    </div>
  );
}
