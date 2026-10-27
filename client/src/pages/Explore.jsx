import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { TrendingUp, Flame, Users2, Play, Heart, MessageCircle, Sparkles } from 'lucide-react';
import api from '../services/api';
import MainLayout from '../layouts/MainLayout';
import Avatar from '../components/Avatar';
import FollowButton from '../components/FollowButton';
import CommunityCard from '../components/CommunityCard';
import PostCard from '../components/PostCard';

export default function Explore() {
  const [data, setData] = useState(null);
  const [tab, setTab] = useState('posts');
  const [openPost, setOpenPost] = useState(null);

  useEffect(() => {
    api
      .get('/explore')
      .then(({ data }) => setData(data))
      .catch(() => setData(null));
  }, []);

  const dismissCommunity = (id) => {
    setData((prev) => ({
      ...prev,
      suggestedCommunities: prev.suggestedCommunities.map((c) => (c._id === id ? { ...c, isMember: true } : c)),
    }));
  };

  if (!data) {
    return (
      <MainLayout>
        <div className="grid grid-cols-2 gap-2 sm:grid-cols-3">
          {[...Array(9)].map((_, i) => (
            <div key={i} className="aspect-square animate-pulse rounded-aurora-md bg-aurora-card" />
          ))}
        </div>
      </MainLayout>
    );
  }

  return (
    <MainLayout>
      <div className="space-y-6">
        <div>
          <h1 className="text-xl font-bold text-aurora-text">Explore</h1>
          <p className="text-sm text-aurora-text-muted">Trending on Zentra this week</p>
        </div>

        {data.trendingHashtags.length > 0 && (
          <div>
            <h2 className="mb-2 flex items-center gap-1.5 text-sm font-semibold text-aurora-text">
              <Flame size={15} className="text-aurora-like" /> Trending
            </h2>
            <div className="flex flex-wrap gap-2">
              {data.trendingHashtags.map((h) => (
                <Link
                  key={h.tag}
                  to={`/search?q=${encodeURIComponent(h.tag)}`}
                  className="rounded-full border border-aurora-border bg-aurora-card px-3 py-1.5 text-sm text-aurora-text transition-aurora hover:border-aurora-violet"
                >
                  <span className="aurora-gradient-text font-semibold">{h.tag}</span>{' '}
                  <span className="text-xs text-aurora-text-muted">{h.count} posts</span>
                </Link>
              ))}
            </div>
          </div>
        )}

        {data.suggestedPeople.length > 0 && (
          <div>
            <h2 className="mb-2 text-sm font-semibold text-aurora-text">People you may know</h2>
            <div className="flex gap-3 overflow-x-auto pb-2">
              {data.suggestedPeople.map((p) => (
                <div
                  key={p._id}
                  className="flex w-40 flex-shrink-0 flex-col items-center gap-2 rounded-aurora-lg border border-aurora-border bg-aurora-card p-4 text-center"
                >
                  <Link to={`/profile/${p.username}`}>
                    <Avatar src={p.avatarUrl} name={p.name} size={56} />
                  </Link>
                  <Link to={`/profile/${p.username}`} className="min-w-0">
                    <p className="truncate text-sm font-semibold text-aurora-text">{p.name}</p>
                    <p className="truncate text-xs text-aurora-text-muted">
                      {p.mutualCount > 0 ? `${p.mutualCount} mutual` : `@${p.username}`}
                    </p>
                  </Link>
                  <FollowButton username={p.username} initialIsFollowing={false} />
                </div>
              ))}
            </div>
          </div>
        )}

        {data.suggestedCommunities.length > 0 && (
          <div>
            <h2 className="mb-2 flex items-center gap-1.5 text-sm font-semibold text-aurora-text">
              <Users2 size={15} /> Communities for you
            </h2>
            <div className="grid grid-cols-2 gap-3 sm:grid-cols-3">
              {data.suggestedCommunities
                .filter((c) => !c.isMember)
                .map((c) => (
                  <CommunityCard key={c._id} community={c} onJoined={dismissCommunity} />
                ))}
            </div>
          </div>
        )}

        <div>
          <div className="mb-3 flex items-center gap-2 border-b border-aurora-border">
            {data.recommendedPosts?.length > 0 && (
              <button
                onClick={() => setTab('foryou')}
                className={`flex items-center gap-1.5 border-b-2 px-3 pb-2 text-sm font-semibold transition-aurora ${
                  tab === 'foryou' ? 'border-aurora-violet text-aurora-text' : 'border-transparent text-aurora-text-muted'
                }`}
              >
                <Sparkles size={15} /> For you
              </button>
            )}
            <button
              onClick={() => setTab('posts')}
              className={`flex items-center gap-1.5 border-b-2 px-3 pb-2 text-sm font-semibold transition-aurora ${
                tab === 'posts' ? 'border-aurora-violet text-aurora-text' : 'border-transparent text-aurora-text-muted'
              }`}
            >
              <TrendingUp size={15} /> Trending posts
            </button>
            <button
              onClick={() => setTab('reels')}
              className={`flex items-center gap-1.5 border-b-2 px-3 pb-2 text-sm font-semibold transition-aurora ${
                tab === 'reels' ? 'border-aurora-violet text-aurora-text' : 'border-transparent text-aurora-text-muted'
              }`}
            >
              <Play size={15} /> Popular reels
            </button>
          </div>

          {tab === 'foryou' ? (
            <div className="grid grid-cols-2 gap-2 sm:grid-cols-3">
              {data.recommendedPosts.map((p) => (
                <button
                  key={p._id}
                  onClick={() => setOpenPost(p)}
                  className="group relative aspect-square overflow-hidden rounded-aurora-md bg-aurora-card"
                >
                  {p.media[0] &&
                    (p.media[0].mimeType?.startsWith('video') ? (
                      <video src={p.media[0].url} className="h-full w-full object-cover" muted />
                    ) : (
                      <img src={p.media[0].url} alt="" className="h-full w-full object-cover" />
                    ))}
                  <div className="absolute inset-0 flex items-end bg-gradient-to-t from-black/50 to-transparent p-2 opacity-100 transition-aurora md:opacity-0 md:group-hover:opacity-100">
                    <span className="text-xs text-white">{p.likeCount ?? p.likes?.length ?? 0} likes</span>
                  </div>
                </button>
              ))}
            </div>
          ) : tab === 'posts' ? (
            data.trendingPosts.length === 0 ? (
              <p className="py-8 text-center text-sm text-aurora-text-muted">Nothing trending yet — check back soon.</p>
            ) : (
              <div className="grid grid-cols-2 gap-2 sm:grid-cols-3">
                {data.trendingPosts.map((p) => (
                  <button
                    key={p._id}
                    onClick={() => setOpenPost(p)}
                    className="group relative aspect-square overflow-hidden rounded-aurora-md bg-aurora-card"
                  >
                    {p.media[0] &&
                      (p.media[0].mimeType?.startsWith('video') ? (
                        <video src={p.media[0].url} className="h-full w-full object-cover" muted />
                      ) : (
                        <img src={p.media[0].url} alt="" className="h-full w-full object-cover" />
                      ))}
                    <div className="absolute inset-0 flex items-end bg-gradient-to-t from-black/50 to-transparent p-2 opacity-100 transition-aurora md:opacity-0 md:group-hover:opacity-100">
                      <span className="flex items-center gap-2 text-xs font-medium text-white">
                        <Heart size={13} fill="white" /> {p.likeCount}
                        <MessageCircle size={13} /> {p.commentCount}
                      </span>
                    </div>
                  </button>
                ))}
              </div>
            )
          ) : data.trendingReels.length === 0 ? (
            <p className="py-8 text-center text-sm text-aurora-text-muted">No reels trending yet.</p>
          ) : (
            <div className="grid grid-cols-2 gap-2 sm:grid-cols-4">
              {data.trendingReels.map((r) => (
                <Link
                  key={r._id}
                  to={`/reels?id=${r._id}`}
                  className="group relative aspect-[9/16] overflow-hidden rounded-aurora-md bg-aurora-card"
                >
                  {r.media[0] && <video src={r.media[0].url} className="h-full w-full object-cover" muted />}
                  <div className="absolute inset-0 flex items-end bg-gradient-to-t from-black/60 to-transparent p-2">
                    <span className="text-xs font-medium text-white">❤ {r.likeCount}</span>
                  </div>
                </Link>
              ))}
            </div>
          )}
        </div>
      </div>

      {openPost && (
        <div
          onClick={() => setOpenPost(null)}
          className="fixed inset-0 z-[100] flex items-center justify-center bg-black/70 p-4 overflow-y-auto"
        >
          <div onClick={(e) => e.stopPropagation()} className="w-full max-w-lg">
            <PostCard post={openPost} onDeleted={() => setOpenPost(null)} />
          </div>
        </div>
      )}
    </MainLayout>
  );
}
