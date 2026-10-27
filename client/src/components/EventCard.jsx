import { useState } from 'react';
import { Link } from 'react-router-dom';
import { Calendar, MapPin, Video, Users } from 'lucide-react';
import api from '../services/api';

function formatDate(dateStr) {
  const d = new Date(dateStr);
  return d.toLocaleDateString(undefined, { weekday: 'short', month: 'short', day: 'numeric' });
}
function formatTime(dateStr) {
  return new Date(dateStr).toLocaleTimeString([], { hour: 'numeric', minute: '2-digit' });
}

export default function EventCard({ event, onChanged }) {
  const [status, setStatus] = useState(event.myStatus);
  const [goingCount, setGoingCount] = useState(event.goingCount);
  const [interestedCount, setInterestedCount] = useState(event.interestedCount);
  const [busy, setBusy] = useState(false);

  const rsvp = async (next) => {
    const nextStatus = status === next ? 'not_interested' : next;
    setBusy(true);
    try {
      const { data } = await api.post(`/events/${event._id}/rsvp`, { status: nextStatus });
      setStatus(data.myStatus === 'not_interested' ? 'none' : data.myStatus);
      setGoingCount(data.goingCount);
      setInterestedCount(data.interestedCount);
      onChanged?.();
    } catch (err) {
      console.error('[EventCard rsvp]', err.response?.data?.message);
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="overflow-hidden rounded-aurora-lg border border-aurora-border bg-aurora-card">
      <div
        className="flex h-28 w-full items-end bg-aurora-gradient bg-cover bg-center p-4"
        style={event.cover ? { backgroundImage: `url(${event.cover.url})` } : undefined}
      >
        <div className="rounded-aurora-sm bg-black/40 px-2.5 py-1 text-xs font-semibold text-white backdrop-blur-aurora">
          {formatDate(event.startAt)} &middot; {formatTime(event.startAt)}
        </div>
      </div>

      <div className="p-4">
        <h3 className="font-semibold text-aurora-text">{event.name}</h3>
        {event.community && (
          <Link to={`/community/${event.community.slug}`} className="mt-0.5 block text-xs text-aurora-cyan hover:underline">
            {event.community.icon} {event.community.name}
          </Link>
        )}

        <div className="mt-2 space-y-1 text-xs text-aurora-text-muted">
          <div className="flex items-center gap-1.5">
            {event.isOnline ? <Video size={13} /> : <MapPin size={13} />}
            {event.isOnline ? 'Online event' : event.location || 'Location TBA'}
          </div>
          <div className="flex items-center gap-1.5">
            <Users size={13} /> {goingCount} going &middot; {interestedCount} interested
          </div>
        </div>

        <div className="mt-3 flex gap-2">
          <button
            onClick={() => rsvp('going')}
            disabled={busy}
            className={`flex-1 rounded-full py-1.5 text-xs font-semibold transition-aurora disabled:opacity-60 ${
              status === 'going'
                ? 'bg-aurora-gradient text-white'
                : 'border border-aurora-border text-aurora-text hover:border-aurora-violet'
            }`}
          >
            Going
          </button>
          <button
            onClick={() => rsvp('interested')}
            disabled={busy}
            className={`flex-1 rounded-full py-1.5 text-xs font-semibold transition-aurora disabled:opacity-60 ${
              status === 'interested'
                ? 'border border-aurora-cyan text-aurora-cyan'
                : 'border border-aurora-border text-aurora-text hover:border-aurora-violet'
            }`}
          >
            Interested
          </button>
        </div>
      </div>
    </div>
  );
}
