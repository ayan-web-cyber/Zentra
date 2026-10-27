import { useEffect, useState } from 'react';
import { Plus } from 'lucide-react';
import api from '../services/api';
import MainLayout from '../layouts/MainLayout';
import EventCard from '../components/EventCard';
import CreateEventModal from '../components/CreateEventModal';

export default function Events() {
  const [tab, setTab] = useState('upcoming'); // 'upcoming' | 'mine' | 'past'
  const [events, setEvents] = useState([]);
  const [loading, setLoading] = useState(true);
  const [creating, setCreating] = useState(false);

  const load = async () => {
    setLoading(true);
    try {
      const { data } = await api.get('/events', {
        params:
          tab === 'mine'
            ? { mine: 'true', when: 'upcoming' }
            : tab === 'past'
            ? { when: 'past' }
            : { when: 'upcoming' },
      });
      setEvents(data.events);
    } catch (err) {
      console.error('[Events load]', err.response?.data?.message);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [tab]);

  return (
    <MainLayout>
      <div className="space-y-5">
        <div className="flex items-center justify-between">
          <h1 className="text-xl font-bold text-aurora-text">Events</h1>
          <button
            onClick={() => setCreating(true)}
            className="flex items-center gap-1.5 rounded-full bg-aurora-gradient px-4 py-2 text-sm font-semibold text-white transition-aurora hover:opacity-90"
          >
            <Plus size={16} /> Create
          </button>
        </div>

        <div className="flex gap-2">
          {[
            { key: 'upcoming', label: 'Upcoming' },
            { key: 'mine', label: 'My events' },
            { key: 'past', label: 'Past' },
          ].map((t) => (
            <button
              key={t.key}
              onClick={() => setTab(t.key)}
              className={`rounded-full px-4 py-1.5 text-sm font-semibold transition-aurora ${
                tab === t.key ? 'bg-aurora-gradient text-white' : 'border border-aurora-border text-aurora-text-muted hover:text-aurora-text'
              }`}
            >
              {t.label}
            </button>
          ))}
        </div>

        {loading ? (
          <div className="flex h-40 items-center justify-center">
            <div className="h-8 w-8 animate-spin rounded-full border-2 border-aurora-border border-t-aurora-violet" />
          </div>
        ) : events.length === 0 ? (
          <div className="rounded-aurora-lg border border-aurora-border bg-aurora-card p-10 text-center text-aurora-text-muted">
            {tab === 'mine' ? "You haven't RSVP'd to any events yet." : 'No events found.'}
          </div>
        ) : (
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {events.map((e) => (
              <EventCard key={e._id} event={e} />
            ))}
          </div>
        )}
      </div>

      {creating && (
        <CreateEventModal
          onClose={() => setCreating(false)}
          onCreated={(event) => {
            setCreating(false);
            setEvents((prev) => [event, ...prev]);
          }}
        />
      )}
    </MainLayout>
  );
}
