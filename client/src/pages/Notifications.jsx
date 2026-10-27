import { useCallback, useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { Heart, MessageSquare, UserPlus, UserCheck, AtSign, Bell, CheckCheck, Trash2, PhoneMissed, Check, X } from 'lucide-react';
import api from '../services/api';
import { getSocket } from '../services/socket';
import MainLayout from '../layouts/MainLayout';
import Avatar from '../components/Avatar';
import { confirmDialog } from '../utils/confirm';

const ICONS = {
  like: Heart,
  comment: MessageSquare,
  follow: UserPlus,
  friendRequest: UserPlus,
  friendAccept: UserCheck,
  mention: AtSign,
  missedCall: PhoneMissed,
};

function textFor(n) {
  switch (n.type) {
    case 'like':
      return 'liked your post';
    case 'comment':
      return n.text ? `commented: "${n.text}"` : 'commented on your post';
    case 'follow':
      return 'started following you';
    case 'friendRequest':
      return 'sent you a friend request';
    case 'friendAccept':
      return 'accepted your friend request';
    case 'mention':
      return 'mentioned you in a post';
    case 'missedCall':
      return 'tried to call you';
    default:
      return 'sent you a notification';
  }
}

function timeAgo(dateStr) {
  const seconds = Math.floor((Date.now() - new Date(dateStr)) / 1000);
  if (seconds < 60) return 'just now';
  const minutes = Math.floor(seconds / 60);
  if (minutes < 60) return `${minutes}m ago`;
  const hours = Math.floor(minutes / 60);
  if (hours < 24) return `${hours}h ago`;
  return `${Math.floor(hours / 24)}d ago`;
}

export default function Notifications() {
  const [items, setItems] = useState([]);
  const [loading, setLoading] = useState(true);
  const [cursor, setCursor] = useState(null);
  const [hasMore, setHasMore] = useState(true);

  const load = useCallback(async (after) => {
    const { data } = await api.get('/notifications', { params: { limit: 20, cursor: after || undefined } });
    setItems((prev) => (after ? [...prev, ...data.notifications] : data.notifications));
    setCursor(data.nextCursor);
    setHasMore(Boolean(data.nextCursor));
  }, []);

  useEffect(() => {
    load().finally(() => setLoading(false));

    const socket = getSocket();
    if (!socket) return undefined;
    const onNew = (notif) => setItems((prev) => [notif, ...prev]);
    socket.on('notification:new', onNew);
    return () => socket.off('notification:new', onNew);
  }, [load]);

  const markAllRead = async () => {
    setItems((prev) => prev.map((n) => ({ ...n, isRead: true })));
    await api.patch('/notifications/read-all').catch(() => {});
  };

  const clearAll = async () => {
    if (!(await confirmDialog('Clear all notifications? This can’t be undone.', { danger: true, confirmLabel: 'Clear all' }))) return;
    setItems([]);
    await api.delete('/notifications').catch(() => {});
  };

  const dismiss = async (id) => {
    setItems((prev) => prev.filter((n) => n._id !== id));
    await api.delete(`/notifications/${id}`).catch(() => {});
  };

  const [respondingIds, setRespondingIds] = useState(new Set());

  const respondToRequest = async (notif, action) => {
    const requestId = notif.friendRequest?._id || notif.friendRequest;
    if (!requestId) return;
    setRespondingIds((prev) => new Set(prev).add(notif._id));
    try {
      await api.post(`/friends/${requestId}/${action}`);
      setItems((prev) =>
        prev.map((n) =>
          n._id === notif._id
            ? { ...n, friendRequest: { ...(n.friendRequest || {}), status: action === 'accept' ? 'accepted' : 'rejected' } }
            : n
        )
      );
    } catch (err) {
      // Most likely the request was already resolved elsewhere (e.g. from the requester's
      // profile) — reflect that instead of leaving the buttons stuck.
      if (err.response?.status === 409) {
        setItems((prev) =>
          prev.map((n) => (n._id === notif._id ? { ...n, friendRequest: { ...(n.friendRequest || {}), status: 'accepted' } } : n))
        );
      } else {
        console.error('[respondToRequest]', err.response?.data?.message);
      }
    } finally {
      setRespondingIds((prev) => {
        const next = new Set(prev);
        next.delete(notif._id);
        return next;
      });
    }
  };

  return (
    <MainLayout>
      <div className="mx-auto max-w-xl">
        <div className="mb-4 flex items-center justify-between">
          <h1 className="text-xl font-bold text-aurora-text">Activity</h1>
          {items.length > 0 && (
            <div className="flex items-center gap-3">
              <button
                onClick={markAllRead}
                className="flex items-center gap-1 text-xs font-medium text-aurora-cyan hover:underline"
              >
                <CheckCheck size={14} /> Mark all read
              </button>
              <button
                onClick={clearAll}
                className="flex items-center gap-1 text-xs font-medium text-aurora-text-muted hover:text-aurora-like"
              >
                <Trash2 size={14} /> Clear
              </button>
            </div>
          )}
        </div>

        {loading ? (
          <div className="space-y-2">
            {[...Array(6)].map((_, i) => (
              <div key={i} className="h-16 animate-pulse rounded-aurora-lg bg-aurora-card" />
            ))}
          </div>
        ) : items.length === 0 ? (
          <div className="flex flex-col items-center gap-3 rounded-aurora-lg border border-aurora-border bg-aurora-card p-12 text-center">
            <Bell size={32} className="text-aurora-text-muted" />
            <p className="font-medium text-aurora-text">No notifications yet</p>
            <p className="text-sm text-aurora-text-muted">Likes, comments, and follows will show up here.</p>
          </div>
        ) : (
          <div className="overflow-hidden rounded-aurora-lg border border-aurora-border bg-aurora-card">
            {items.map((n) => {
              const Icon = ICONS[n.type] || Bell;
              return (
                <div
                  key={n._id}
                  className={`group flex items-start gap-3 border-b border-aurora-border/60 px-4 py-3.5 last:border-b-0 ${
                    !n.isRead ? 'bg-aurora-violet/5' : ''
                  }`}
                >
                  <Link to={`/profile/${n.actor.username}`} className="relative flex-shrink-0">
                    <Avatar src={n.actor?.avatarUrl} name={n.actor?.name} size={44} />
                    <span className="absolute -bottom-1 -right-1 flex h-5 w-5 items-center justify-center rounded-full bg-aurora-gradient text-white ring-2 ring-aurora-card">
                      <Icon size={11} />
                    </span>
                  </Link>
                  <Link to={`/profile/${n.actor.username}`} className="min-w-0 flex-1">
                    <p className="text-sm text-aurora-text">
                      <span className="font-semibold">{n.actor?.name}</span> {textFor(n)}
                    </p>
                    <span className="text-xs text-aurora-text-muted">{timeAgo(n.createdAt)}</span>

                    {n.type === 'friendRequest' &&
                      (n.friendRequest?.status && n.friendRequest.status !== 'pending' ? (
                        <p className="mt-1 text-xs font-medium text-aurora-text-muted">
                          {n.friendRequest.status === 'accepted' ? 'Friend request accepted' : 'Friend request declined'}
                        </p>
                      ) : (
                        <div className="mt-2 flex items-center gap-2">
                          <button
                            onClick={(e) => {
                              e.preventDefault();
                              respondToRequest(n, 'accept');
                            }}
                            disabled={respondingIds.has(n._id)}
                            className="flex items-center gap-1 rounded-full bg-aurora-gradient px-3 py-1.5 text-xs font-semibold text-white disabled:opacity-60"
                          >
                            <Check size={13} /> Confirm
                          </button>
                          <button
                            onClick={(e) => {
                              e.preventDefault();
                              respondToRequest(n, 'reject');
                            }}
                            disabled={respondingIds.has(n._id)}
                            className="flex items-center gap-1 rounded-full border border-aurora-border px-3 py-1.5 text-xs font-semibold text-aurora-text transition-aurora hover:border-aurora-like hover:text-aurora-like disabled:opacity-60"
                          >
                            <X size={13} /> Delete
                          </button>
                        </div>
                      ))}
                  </Link>
                  <button
                    onClick={() => dismiss(n._id)}
                    className="flex-shrink-0 rounded-full p-1.5 text-aurora-text-muted opacity-100 transition-aurora hover:bg-aurora-bg hover:text-aurora-like md:opacity-0 md:group-hover:opacity-100"
                  >
                    <Trash2 size={14} />
                  </button>
                </div>
              );
            })}
          </div>
        )}

        {hasMore && !loading && (
          <button
            onClick={() => load(cursor)}
            className="mx-auto mt-4 block rounded-full border border-aurora-border px-4 py-2 text-sm font-medium text-aurora-text transition-aurora hover:border-aurora-violet"
          >
            Load more
          </button>
        )}
      </div>
    </MainLayout>
  );
}
