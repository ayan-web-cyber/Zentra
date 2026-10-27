import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { motion } from 'framer-motion';
import { Radio, Plus, Users, X as XIcon } from 'lucide-react';
import api from '../services/api';
import MainLayout from '../layouts/MainLayout';
import Avatar from '../components/Avatar';

function GoLiveModal({ onClose, onStarted }) {
  const [title, setTitle] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState('');

  const submit = async (e) => {
    e.preventDefault();
    if (!title.trim()) return;
    setSubmitting(true);
    setError('');
    try {
      const { data } = await api.post('/live-rooms', { title: title.trim() });
      onStarted(data.room);
    } catch (err) {
      setError(err.response?.data?.message || 'Could not start the room');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="fixed inset-0 z-[150] flex items-center justify-center bg-black/60 p-4">
      <motion.div
        initial={{ opacity: 0, scale: 0.96, y: 8 }}
        animate={{ opacity: 1, scale: 1, y: 0 }}
        className="w-full max-w-sm rounded-aurora-lg border border-aurora-border bg-aurora-card p-5 shadow-aurora"
      >
        <div className="mb-4 flex items-center justify-between">
          <h2 className="text-lg font-semibold text-aurora-text">Go Live</h2>
          <button onClick={onClose} className="text-aurora-text-muted hover:text-aurora-text">
            <XIcon size={18} />
          </button>
        </div>
        <form onSubmit={submit} className="space-y-3">
          <input
            autoFocus
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            maxLength={120}
            placeholder="What's this live room about?"
            className="w-full rounded-aurora-sm border border-aurora-border bg-aurora-bg px-3 py-2.5 text-sm text-aurora-text outline-none focus:border-aurora-violet"
          />
          {error && <p className="text-sm text-aurora-like">{error}</p>}
          <button
            type="submit"
            disabled={submitting || !title.trim()}
            className="w-full rounded-aurora-sm bg-aurora-gradient py-2.5 text-sm font-semibold text-white transition-aurora disabled:opacity-50"
          >
            {submitting ? 'Starting…' : 'Start broadcasting'}
          </button>
          <p className="text-center text-xs text-aurora-text-muted">
            Your camera and mic turn on once you start. Viewers can watch and chat.
          </p>
        </form>
      </motion.div>
    </div>
  );
}

export default function LiveRooms() {
  const [rooms, setRooms] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showModal, setShowModal] = useState(false);
  const navigate = useNavigate();

  const load = async () => {
    setLoading(true);
    try {
      const { data } = await api.get('/live-rooms');
      setRooms(data.rooms);
    } catch (err) {
      console.error('[LiveRooms load]', err.response?.data?.message);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    load();
    const interval = setInterval(load, 15000); // light polling to catch new/ended rooms
    return () => clearInterval(interval);
  }, []);

  return (
    <MainLayout>
      <div className="mx-auto max-w-2xl space-y-6">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="flex items-center gap-2 text-xl font-bold text-aurora-text">
              <Radio className="text-aurora-like" size={20} /> Live Rooms
            </h1>
            <p className="text-sm text-aurora-text-muted">Jump into a live broadcast, or start your own.</p>
          </div>
          <button
            onClick={() => setShowModal(true)}
            className="flex items-center gap-1.5 rounded-aurora-sm bg-aurora-gradient px-4 py-2 text-sm font-semibold text-white"
          >
            <Plus size={16} /> Go Live
          </button>
        </div>

        {loading ? (
          <div className="space-y-3">
            {[...Array(3)].map((_, i) => (
              <div key={i} className="h-20 animate-pulse rounded-aurora-lg bg-aurora-card" />
            ))}
          </div>
        ) : rooms.length === 0 ? (
          <div className="rounded-aurora-lg border border-aurora-border bg-aurora-card p-10 text-center">
            <Radio className="mx-auto mb-3 text-aurora-text-muted" size={32} />
            <p className="font-medium text-aurora-text">No one's live right now</p>
            <p className="mt-1 text-sm text-aurora-text-muted">Be the first — start a live room and your followers can join in.</p>
          </div>
        ) : (
          <div className="space-y-3">
            {rooms.map((room) => (
              <button
                key={room._id}
                onClick={() => navigate(`/live/${room._id}`)}
                className="flex w-full items-center gap-4 rounded-aurora-lg border border-aurora-border bg-aurora-card p-4 text-left transition-aurora hover:border-aurora-violet/50"
              >
                <div className="relative">
                  <Avatar src={room.host?.avatarUrl} name={room.host?.name} size={52} />
                  <span className="absolute -bottom-1 left-1/2 -translate-x-1/2 rounded-full bg-aurora-like px-1.5 py-0.5 text-[10px] font-bold uppercase tracking-wide text-white">
                    Live
                  </span>
                </div>
                <div className="min-w-0 flex-1">
                  <p className="truncate font-semibold text-aurora-text">{room.title}</p>
                  <p className="text-sm text-aurora-text-muted">{room.host?.name} · @{room.host?.username}</p>
                </div>
                <div className="flex shrink-0 items-center gap-1 text-sm text-aurora-text-muted">
                  <Users size={14} /> {room.participantCount}
                </div>
              </button>
            ))}
          </div>
        )}
      </div>

      {showModal && (
        <GoLiveModal onClose={() => setShowModal(false)} onStarted={(room) => navigate(`/live/${room._id}`)} />
      )}
    </MainLayout>
  );
}
