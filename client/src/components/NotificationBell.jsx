import { useEffect, useRef, useState } from 'react';
import { Link } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import { Bell, Heart, MessageSquare, UserPlus, UserCheck, AtSign, PhoneMissed } from 'lucide-react';
import api from '../services/api';
import { getSocket } from '../services/socket';
import Avatar from './Avatar';

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
      return 'mentioned you';
    case 'missedCall':
      return 'tried to call you';
    default:
      return 'sent you a notification';
  }
}

function timeAgo(dateStr) {
  const seconds = Math.floor((Date.now() - new Date(dateStr)) / 1000);
  if (seconds < 60) return 'now';
  const minutes = Math.floor(seconds / 60);
  if (minutes < 60) return `${minutes}m`;
  const hours = Math.floor(minutes / 60);
  if (hours < 24) return `${hours}h`;
  return `${Math.floor(hours / 24)}d`;
}

export default function NotificationBell() {
  const [open, setOpen] = useState(false);
  const [items, setItems] = useState([]);
  const [unreadCount, setUnreadCount] = useState(0);
  const ref = useRef(null);

  useEffect(() => {
    api
      .get('/notifications/unread-count')
      .then(({ data }) => setUnreadCount(data.count))
      .catch(() => {});

    const socket = getSocket();
    if (!socket) return undefined;
    const onNew = (notif) => {
      setItems((prev) => [notif, ...prev].slice(0, 15));
      setUnreadCount((c) => c + 1);
    };
    socket.on('notification:new', onNew);
    return () => socket.off('notification:new', onNew);
  }, []);

  useEffect(() => {
    function onClickOutside(e) {
      if (ref.current && !ref.current.contains(e.target)) setOpen(false);
    }
    document.addEventListener('mousedown', onClickOutside);
    return () => document.removeEventListener('mousedown', onClickOutside);
  }, []);

  const toggle = async () => {
    const next = !open;
    setOpen(next);
    if (next && items.length === 0) {
      try {
        const { data } = await api.get('/notifications?limit=15');
        setItems(data.notifications);
      } catch {
        /* ignore */
      }
    }
    if (next && unreadCount > 0) {
      api.patch('/notifications/read-all').catch(() => {});
      setUnreadCount(0);
    }
  };

  return (
    <div className="relative" ref={ref}>
      <button
        onClick={toggle}
        className="relative flex h-9 w-9 items-center justify-center rounded-full text-aurora-text transition-aurora hover:bg-aurora-card"
      >
        <Bell size={20} />
        {unreadCount > 0 && (
          <span className="absolute -right-0.5 -top-0.5 flex h-4 min-w-[16px] items-center justify-center rounded-full bg-aurora-like px-1 text-[10px] font-bold text-white">
            {unreadCount > 9 ? '9+' : unreadCount}
          </span>
        )}
      </button>

      <AnimatePresence>
        {open && (
          <motion.div
            initial={{ opacity: 0, y: -8, scale: 0.97 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: -8, scale: 0.97 }}
            transition={{ duration: 0.15 }}
            // max-w clamp — w-80 (320px) anchored right-0 is exactly a 320px phone's full
            // width with zero margin either side; add a viewport clamp so it never clips.
            className="absolute right-0 top-11 z-50 max-h-[70vh] w-80 max-w-[calc(100vw-2rem)] overflow-y-auto rounded-aurora-lg border border-aurora-border bg-aurora-card shadow-xl"
          >
            <div className="flex items-center justify-between border-b border-aurora-border px-4 py-3">
              <span className="font-semibold text-aurora-text">Notifications</span>
              <Link to="/notifications" onClick={() => setOpen(false)} className="text-xs text-aurora-cyan hover:underline">
                See all
              </Link>
            </div>

            {items.length === 0 ? (
              <div className="p-6 text-center text-sm text-aurora-text-muted">No notifications yet.</div>
            ) : (
              items.map((n) => {
                const Icon = ICONS[n.type] || Bell;
                return (
                  <Link
                    key={n._id}
                    to={`/profile/${n.actor.username}`}
                    onClick={() => setOpen(false)}
                    className={`flex items-start gap-3 border-b border-aurora-border/60 px-4 py-3 transition-aurora hover:bg-aurora-bg ${
                      !n.isRead ? 'bg-aurora-violet/5' : ''
                    }`}
                  >
                    <div className="relative flex-shrink-0">
                      <Avatar src={n.actor?.avatarUrl} name={n.actor?.name} size={36} />
                      <span className="absolute -bottom-1 -right-1 flex h-4 w-4 items-center justify-center rounded-full bg-aurora-gradient text-white">
                        <Icon size={10} />
                      </span>
                    </div>
                    <div className="min-w-0 flex-1">
                      <p className="text-sm text-aurora-text">
                        <span className="font-semibold">{n.actor?.name}</span> {textFor(n)}
                      </p>
                      <span className="text-xs text-aurora-text-muted">{timeAgo(n.createdAt)}</span>
                    </div>
                  </Link>
                );
              })
            )}
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
