import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { Flame, Users2 } from 'lucide-react';
import api from '../services/api';
import Avatar from './Avatar';
import FollowButton from './FollowButton';

// The desktop three-column layout (section 8 of the spec: Trending / People You May Know /
// Communities / Suggestions on the right) only ever existed as an unused grid track in
// MainLayout — no page passed anything into it, so it rendered nothing and large screens
// just had a permanent empty margin. This fills that column with a compact version of the
// same data the Explore page already shows full-size, so it earns its place on the page
// instead of duplicating Explore inside a sidebar.
export default function RightRail() {
  const [data, setData] = useState(null);

  useEffect(() => {
    let cancelled = false;
    api
      .get('/explore')
      .then(({ data }) => !cancelled && setData(data))
      .catch(() => !cancelled && setData(null));
    return () => {
      cancelled = true;
    };
  }, []);

  if (!data) {
    return (
      <div className="space-y-3">
        {[...Array(3)].map((_, i) => (
          <div key={i} className="h-24 animate-pulse rounded-aurora-lg bg-aurora-card" />
        ))}
      </div>
    );
  }

  const hasHashtags = data.trendingHashtags?.length > 0;
  const hasPeople = data.suggestedPeople?.length > 0;
  const communities = (data.suggestedCommunities || []).filter((c) => !c.isMember).slice(0, 3);

  if (!hasHashtags && !hasPeople && communities.length === 0) return null;

  return (
    <div className="sticky top-0 space-y-5 pb-6">
      {hasHashtags && (
        <div className="rounded-aurora-lg border border-aurora-border bg-aurora-card p-4">
          <h2 className="mb-3 flex items-center gap-1.5 text-sm font-semibold text-aurora-text">
            <Flame size={15} className="text-aurora-like" /> Trending
          </h2>
          <div className="space-y-2.5">
            {data.trendingHashtags.slice(0, 5).map((h) => (
              <Link
                key={h.tag}
                to={`/search?q=${encodeURIComponent(h.tag)}`}
                className="block text-sm transition-aurora hover:opacity-80"
              >
                <span className="aurora-gradient-text font-semibold">{h.tag}</span>{' '}
                <span className="text-xs text-aurora-text-muted">{h.count} posts</span>
              </Link>
            ))}
          </div>
        </div>
      )}

      {hasPeople && (
        <div className="rounded-aurora-lg border border-aurora-border bg-aurora-card p-4">
          <h2 className="mb-3 text-sm font-semibold text-aurora-text">People you may know</h2>
          <div className="space-y-3">
            {data.suggestedPeople.slice(0, 4).map((p) => (
              <div key={p._id} className="flex items-center gap-2.5">
                <Link to={`/profile/${p.username}`} className="flex-shrink-0">
                  <Avatar src={p.avatarUrl} name={p.name} size={36} />
                </Link>
                <Link to={`/profile/${p.username}`} className="min-w-0 flex-1">
                  <p className="truncate text-sm font-medium text-aurora-text">{p.name}</p>
                  <p className="truncate text-xs text-aurora-text-muted">
                    {p.mutualCount > 0 ? `${p.mutualCount} mutual` : `@${p.username}`}
                  </p>
                </Link>
                <FollowButton username={p.username} initialIsFollowing={false} compact />
              </div>
            ))}
          </div>
          <Link
            to="/explore"
            className="mt-3 block text-center text-xs font-medium text-aurora-violet transition-aurora hover:opacity-80"
          >
            See all
          </Link>
        </div>
      )}

      {communities.length > 0 && (
        <div className="rounded-aurora-lg border border-aurora-border bg-aurora-card p-4">
          <h2 className="mb-3 flex items-center gap-1.5 text-sm font-semibold text-aurora-text">
            <Users2 size={15} /> Communities for you
          </h2>
          <div className="space-y-3">
            {communities.map((c) => (
              <Link key={c._id} to={`/community/${c.slug}`} className="flex items-center gap-2.5">
                <span className="flex h-9 w-9 flex-shrink-0 items-center justify-center rounded-aurora-sm bg-aurora-bg text-lg">
                  {c.icon}
                </span>
                <div className="min-w-0 flex-1">
                  <p className="truncate text-sm font-medium text-aurora-text">{c.name}</p>
                  <p className="truncate text-xs text-aurora-text-muted">{c.members?.length ?? 0} members</p>
                </div>
              </Link>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
