import { useEffect, useState } from 'react';
import { Link, useSearchParams } from 'react-router-dom';
import { Search as SearchIcon, Calendar, MapPin, Video, X } from 'lucide-react';
import api from '../services/api';
import MainLayout from '../layouts/MainLayout';
import Avatar from '../components/Avatar';
import FollowButton from '../components/FollowButton';
import CommunityCard from '../components/CommunityCard';
import EventCard from '../components/EventCard';

const TABS = [
  { key: 'all', label: 'All' },
  { key: 'users', label: 'People' },
  { key: 'posts', label: 'Posts' },
  { key: 'hashtags', label: 'Hashtags' },
  { key: 'communities', label: 'Communities' },
  { key: 'events', label: 'Events' },
];

export default function Search() {
  const [params, setParams] = useSearchParams();
  const q = params.get('q') || '';
  const [tab, setTab] = useState('all');
  const [results, setResults] = useState(null);
  const [loading, setLoading] = useState(false);
  // This page used to have no input of its own — it only ever read `q` from the URL,
  // which someone could only set via the desktop navbar's search box. That box is
  // `hidden md:block` (there's no room for it on a phone header), so a mobile user who
  // landed here (e.g. from the new navbar search icon) had literally no way to type a
  // query. `draft` is kept separate from the URL so typing doesn't refetch on every
  // keystroke — only committing (Enter or the button) updates `q` and triggers a search.
  const [draft, setDraft] = useState(q);

  useEffect(() => {
    setDraft(q);
  }, [q]);

  const submitSearch = (e) => {
    e.preventDefault();
    setParams(draft.trim() ? { q: draft.trim() } : {});
  };

  useEffect(() => {
    if (!q.trim()) {
      setResults(null);
      return;
    }
    setLoading(true);
    api
      .get('/search', { params: { q, type: tab, limit: 20 } })
      .then(({ data }) => setResults(data))
      .finally(() => setLoading(false));
  }, [q, tab]);

  const hasAny =
    results &&
    (results.users.length ||
      results.posts.length ||
      results.hashtags.length ||
      results.communities.length ||
      results.events.length);

  return (
    <MainLayout>
      <div className="mx-auto max-w-2xl">
        <h1 className="mb-1 text-xl font-bold text-aurora-text">
          {q ? (
            <>
              Results for <span className="aurora-gradient-text">"{q}"</span>
            </>
          ) : (
            'Search'
          )}
        </h1>

        <form onSubmit={submitSearch} className="mb-4">
          <div className="flex items-center gap-2 rounded-full border border-aurora-border bg-aurora-card px-4 py-2.5">
            <SearchIcon size={16} className="flex-shrink-0 text-aurora-text-muted" />
            <input
              value={draft}
              onChange={(e) => setDraft(e.target.value)}
              placeholder="Search people, posts, hashtags, communities, events"
              className="w-full bg-transparent text-sm text-aurora-text outline-none placeholder:text-aurora-text-muted"
            />
            {draft && (
              <button
                type="button"
                onClick={() => {
                  setDraft('');
                  setParams({});
                }}
                aria-label="Clear search"
              >
                <X size={14} className="text-aurora-text-muted" />
              </button>
            )}
          </div>
        </form>

        <div className="mb-4 flex gap-2 overflow-x-auto border-b border-aurora-border pb-px">
          {TABS.map((t) => (
            <button
              key={t.key}
              onClick={() => setTab(t.key)}
              className={`flex-shrink-0 border-b-2 px-3 pb-2 text-sm font-semibold transition-aurora ${
                tab === t.key ? 'border-aurora-violet text-aurora-text' : 'border-transparent text-aurora-text-muted'
              }`}
            >
              {t.label}
            </button>
          ))}
        </div>

        {!q.trim() ? (
          <div className="flex flex-col items-center gap-3 rounded-aurora-lg border border-aurora-border bg-aurora-card p-12 text-center">
            <SearchIcon size={32} className="text-aurora-text-muted" />
            <p className="text-sm text-aurora-text-muted">Search for people, posts, hashtags, communities, or events.</p>
          </div>
        ) : loading ? (
          <div className="space-y-2">
            {[...Array(5)].map((_, i) => (
              <div key={i} className="h-16 animate-pulse rounded-aurora-lg bg-aurora-card" />
            ))}
          </div>
        ) : !hasAny ? (
          <div className="flex flex-col items-center gap-3 rounded-aurora-lg border border-aurora-border bg-aurora-card p-12 text-center">
            <SearchIcon size={32} className="text-aurora-text-muted" />
            <p className="font-medium text-aurora-text">No results found</p>
            <p className="text-sm text-aurora-text-muted">Try a different search term.</p>
          </div>
        ) : (
          <div className="space-y-6">
            {results.users.length > 0 && (
              <section>
                {tab === 'all' && <h2 className="mb-2 text-sm font-semibold text-aurora-text-muted">People</h2>}
                <div className="overflow-hidden rounded-aurora-lg border border-aurora-border bg-aurora-card">
                  {results.users.map((u) => (
                    <div key={u._id} className="flex items-center gap-3 border-b border-aurora-border/60 p-3 last:border-b-0">
                      <Link to={`/profile/${u.username}`}>
                        <Avatar src={u.avatarUrl} name={u.name} size={44} />
                      </Link>
                      <Link to={`/profile/${u.username}`} className="min-w-0 flex-1">
                        <p className="truncate text-sm font-semibold text-aurora-text">{u.name}</p>
                        <p className="truncate text-xs text-aurora-text-muted">
                          @{u.username} &middot; {u.followerCount} followers
                        </p>
                      </Link>
                      <FollowButton username={u.username} initialIsFollowing={false} />
                    </div>
                  ))}
                </div>
              </section>
            )}

            {results.hashtags.length > 0 && (
              <section>
                {tab === 'all' && <h2 className="mb-2 text-sm font-semibold text-aurora-text-muted">Hashtags</h2>}
                <div className="flex flex-wrap gap-2">
                  {results.hashtags.map((h) => (
                    <Link
                      key={h.tag}
                      to={`/search?q=${encodeURIComponent(h.tag)}`}
                      className="rounded-full border border-aurora-border bg-aurora-card px-3 py-1.5 text-sm transition-aurora hover:border-aurora-violet"
                    >
                      <span className="aurora-gradient-text font-semibold">{h.tag}</span>{' '}
                      <span className="text-xs text-aurora-text-muted">{h.count} posts</span>
                    </Link>
                  ))}
                </div>
              </section>
            )}

            {results.communities.length > 0 && (
              <section>
                {tab === 'all' && <h2 className="mb-2 text-sm font-semibold text-aurora-text-muted">Communities</h2>}
                <div className="grid grid-cols-2 gap-3 sm:grid-cols-3">
                  {results.communities.map((c) => (
                    <CommunityCard key={c._id} community={c} />
                  ))}
                </div>
              </section>
            )}

            {results.events.length > 0 && (
              <section>
                {tab === 'all' && <h2 className="mb-2 text-sm font-semibold text-aurora-text-muted">Events</h2>}
                <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
                  {results.events.map((e) => (
                    <EventCard key={e._id} event={{ ...e, myStatus: 'none' }} />
                  ))}
                </div>
              </section>
            )}

            {results.posts.length > 0 && (
              <section>
                {tab === 'all' && <h2 className="mb-2 text-sm font-semibold text-aurora-text-muted">Posts</h2>}
                <div className="grid grid-cols-3 gap-2">
                  {results.posts.map((p) => (
                    <Link
                      key={p._id}
                      to={`/profile/${p.author.username}`}
                      className="group relative aspect-square overflow-hidden rounded-aurora-md bg-aurora-card"
                    >
                      {p.media?.[0] ? (
                        p.media[0].mimeType?.startsWith('video') ? (
                          <video src={p.media[0].url} className="h-full w-full object-cover" muted />
                        ) : (
                          <img src={p.media[0].url} alt="" className="h-full w-full object-cover" />
                        )
                      ) : (
                        <div className="flex h-full items-center justify-center p-2 text-center text-xs text-aurora-text-muted">
                          {p.caption?.slice(0, 60)}
                        </div>
                      )}
                    </Link>
                  ))}
                </div>
              </section>
            )}
          </div>
        )}
      </div>
    </MainLayout>
  );
}
