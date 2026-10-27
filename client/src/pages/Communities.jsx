import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { Plus, Search, CalendarDays, Mail, Check, X as XIcon } from 'lucide-react';
import api from '../services/api';
import MainLayout from '../layouts/MainLayout';
import CommunityCard from '../components/CommunityCard';
import CreateCommunityModal from '../components/CreateCommunityModal';

const CATEGORIES = [
  'All',
  'Technology',
  'Gaming',
  'Photography',
  'Music',
  'Sports',
  'Travel',
  'Education',
  'Art',
  'Food',
  'Fitness',
  'Business',
  'Other',
];

export default function Communities() {
  const [tab, setTab] = useState('discover'); // 'discover' | 'mine'
  const [category, setCategory] = useState('All');
  const [search, setSearch] = useState('');
  const [communities, setCommunities] = useState([]);
  const [loading, setLoading] = useState(true);
  const [creating, setCreating] = useState(false);
  const [invites, setInvites] = useState([]);
  const [invitesLoading, setInvitesLoading] = useState(true);
  const [respondingId, setRespondingId] = useState(null);

  const loadInvites = async () => {
    setInvitesLoading(true);
    try {
      const { data } = await api.get('/communities/invites/mine');
      setInvites(data.invites);
    } catch (err) {
      console.error('[Communities loadInvites]', err.response?.data?.message);
    } finally {
      setInvitesLoading(false);
    }
  };

  const respondToInvite = async (communityId, accept) => {
    setRespondingId(communityId);
    try {
      await api.post(`/communities/${communityId}/invites/respond`, { accept });
      setInvites((prev) => prev.filter((inv) => inv.community._id !== communityId));
      if (accept && tab === 'mine') load();
    } catch (err) {
      console.error('[Communities respondToInvite]', err.response?.data?.message);
    } finally {
      setRespondingId(null);
    }
  };

  const load = async () => {
    setLoading(true);
    try {
      const { data } = await api.get('/communities', {
        params: {
          mine: tab === 'mine' ? 'true' : undefined,
          category: category !== 'All' ? category : undefined,
          search: search.trim() || undefined,
        },
      });
      setCommunities(data.communities);
    } catch (err) {
      console.error('[Communities load]', err.response?.data?.message);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [tab, category]);

  useEffect(() => {
    loadInvites();
  }, []);

  const onSearchSubmit = (e) => {
    e.preventDefault();
    load();
  };

  const markJoined = (id) => {
    setCommunities((prev) => prev.map((c) => (c._id === id ? { ...c, isMember: true, memberCount: c.memberCount + 1 } : c)));
  };

  return (
    <MainLayout>
      <div className="space-y-5">
        <div className="flex items-center justify-between">
          <h1 className="text-xl font-bold text-aurora-text">Communities</h1>
          <div className="flex items-center gap-2">
            <Link
              to="/events"
              className="flex items-center gap-1.5 rounded-full border border-aurora-border px-4 py-2 text-sm font-semibold text-aurora-text transition-aurora hover:border-aurora-violet"
            >
              <CalendarDays size={16} /> Events
            </Link>
            <button
              onClick={() => setCreating(true)}
              className="flex items-center gap-1.5 rounded-full bg-aurora-gradient px-4 py-2 text-sm font-semibold text-white transition-aurora hover:opacity-90"
            >
              <Plus size={16} /> Create
            </button>
          </div>
        </div>

        {!invitesLoading && invites.length > 0 && (
          <div className="space-y-2 rounded-aurora-lg border border-aurora-violet/30 bg-aurora-violet/5 p-4">
            <div className="flex items-center gap-1.5 text-sm font-semibold text-aurora-text">
              <Mail size={15} className="text-aurora-violet" /> Invitations
            </div>
            {invites.map((inv) => (
              <div
                key={inv.community._id}
                className="flex flex-wrap items-center justify-between gap-2 rounded-aurora-sm bg-aurora-card px-3 py-2"
              >
                <Link to={`/community/${inv.community.slug}`} className="flex items-center gap-2 min-w-0">
                  <span className="text-lg">{inv.community.icon}</span>
                  <span className="min-w-0">
                    <span className="block truncate text-sm font-medium text-aurora-text">{inv.community.name}</span>
                    {inv.invitedBy && (
                      <span className="block truncate text-xs text-aurora-text-muted">
                        Invited by {inv.invitedBy.name}
                      </span>
                    )}
                  </span>
                </Link>
                <div className="flex gap-2">
                  <button
                    onClick={() => respondToInvite(inv.community._id, true)}
                    disabled={respondingId === inv.community._id}
                    className="flex items-center gap-1 rounded-full bg-aurora-gradient px-3 py-1.5 text-xs font-semibold text-white transition-aurora hover:opacity-90 disabled:opacity-60"
                  >
                    <Check size={13} /> Accept
                  </button>
                  <button
                    onClick={() => respondToInvite(inv.community._id, false)}
                    disabled={respondingId === inv.community._id}
                    className="flex items-center gap-1 rounded-full border border-aurora-border px-3 py-1.5 text-xs font-semibold text-aurora-text-muted transition-aurora hover:text-aurora-text disabled:opacity-60"
                  >
                    <XIcon size={13} /> Decline
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}

        <form onSubmit={onSearchSubmit} className="relative">
          <Search size={16} className="pointer-events-none absolute left-3.5 top-1/2 -translate-y-1/2 text-aurora-text-muted" />
          <input
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search communities…"
            className="w-full rounded-full border border-aurora-border bg-aurora-card py-2.5 pl-10 pr-4 text-sm text-aurora-text outline-none focus:border-aurora-violet"
          />
        </form>

        <div className="flex gap-2">
          {['discover', 'mine'].map((t) => (
            <button
              key={t}
              onClick={() => setTab(t)}
              className={`rounded-full px-4 py-1.5 text-sm font-semibold transition-aurora ${
                tab === t ? 'bg-aurora-gradient text-white' : 'border border-aurora-border text-aurora-text-muted hover:text-aurora-text'
              }`}
            >
              {t === 'discover' ? 'Discover' : 'My communities'}
            </button>
          ))}
        </div>

        <div className="flex flex-wrap gap-2">
          {CATEGORIES.map((c) => (
            <button
              key={c}
              onClick={() => setCategory(c)}
              className={`rounded-full px-3 py-1 text-xs font-medium transition-aurora ${
                category === c ? 'bg-aurora-violet/15 text-aurora-violet' : 'text-aurora-text-muted hover:text-aurora-text'
              }`}
            >
              {c}
            </button>
          ))}
        </div>

        {loading ? (
          <div className="flex h-40 items-center justify-center">
            <div className="h-8 w-8 animate-spin rounded-full border-2 border-aurora-border border-t-aurora-violet" />
          </div>
        ) : communities.length === 0 ? (
          <div className="rounded-aurora-lg border border-aurora-border bg-aurora-card p-10 text-center">
            <p className="text-aurora-text-muted">
              {tab === 'mine' ? "You haven't joined any communities yet." : 'No communities found.'}
            </p>
          </div>
        ) : (
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {communities.map((c) => (
              <CommunityCard key={c._id} community={c} onJoined={markJoined} />
            ))}
          </div>
        )}
      </div>

      {creating && (
        <CreateCommunityModal
          onClose={() => setCreating(false)}
          onCreated={(community) => {
            setCreating(false);
            setCommunities((prev) => [community, ...prev]);
          }}
        />
      )}
    </MainLayout>
  );
}
