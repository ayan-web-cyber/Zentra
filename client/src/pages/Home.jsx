import { useEffect, useState } from 'react';
import { useAuth } from '../context/AuthContext';
import MainLayout from '../layouts/MainLayout';
import StoryBar from '../components/StoryBar';
import PostComposer from '../components/PostComposer';
import PostCard from '../components/PostCard';
import RightRail from '../components/RightRail';
import api from '../services/api';

export default function Home() {
  const { user } = useAuth();
  const [posts, setPosts] = useState([]);
  const [loading, setLoading] = useState(true);
  const [cursor, setCursor] = useState(null);
  const [hasMore, setHasMore] = useState(true);

  const loadFeed = async (nextCursor) => {
    const { data } = await api.get('/posts/feed', { params: nextCursor ? { cursor: nextCursor } : {} });
    setPosts((prev) => (nextCursor ? [...prev, ...data.posts] : data.posts));
    setCursor(data.nextCursor);
    setHasMore(Boolean(data.nextCursor));
    setLoading(false);
  };

  useEffect(() => {
    loadFeed();
  }, []);

  return (
    <MainLayout right={<RightRail />}>
      <div className="space-y-5">
        <StoryBar />
        <div id="post-composer" className="scroll-mt-4">
          <PostComposer user={user} onPosted={(post) => setPosts((prev) => [post, ...prev])} />
        </div>

        {loading ? (
          <div className="flex h-40 items-center justify-center">
            <div className="h-8 w-8 animate-spin rounded-full border-2 border-aurora-border border-t-aurora-violet" />
          </div>
        ) : posts.length === 0 ? (
          <div className="rounded-aurora-lg border border-aurora-border bg-aurora-card p-10 text-center">
            <p className="text-aurora-text-muted">
              Your feed is empty. Follow people or create your first post to get started.
            </p>
          </div>
        ) : (
          posts.map((post) => (
            <PostCard
              key={post._id}
              post={post}
              onDeleted={(id) => setPosts((prev) => prev.filter((p) => p._id !== id))}
              onHidden={(hiddenPost) => {
                // Remove immediately and hand PostCard back a `restore` closure it can wire
                // to the toast's "Undo" button — capturing the post's original index here so
                // Undo puts it back where it was, not just at the top or bottom of the feed.
                let idx = -1;
                setPosts((prev) => {
                  idx = prev.findIndex((p) => p._id === hiddenPost._id);
                  return prev.filter((p) => p._id !== hiddenPost._id);
                });
                return () => {
                  setPosts((prev) => {
                    if (prev.some((p) => p._id === hiddenPost._id)) return prev;
                    const next = [...prev];
                    next.splice(Math.min(idx, next.length), 0, hiddenPost);
                    return next;
                  });
                };
              }}
            />
          ))
        )}

        {hasMore && !loading && (
          <button
            onClick={() => loadFeed(cursor)}
            className="w-full rounded-aurora-sm border border-aurora-border py-2.5 text-sm font-medium text-aurora-text-muted transition-aurora hover:border-aurora-violet hover:text-aurora-text"
          >
            Load more
          </button>
        )}
      </div>
    </MainLayout>
  );
}
