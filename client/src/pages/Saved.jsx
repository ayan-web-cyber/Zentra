import { useEffect, useState } from 'react';
import { Bookmark } from 'lucide-react';
import api from '../services/api';
import MainLayout from '../layouts/MainLayout';
import PostCard from '../components/PostCard';

export default function Saved() {
  const [posts, setPosts] = useState(null); // null = loading
  const [error, setError] = useState(false);

  useEffect(() => {
    api
      .get('/posts/saved')
      .then(({ data }) => setPosts(data.posts))
      .catch(() => setError(true));
  }, []);

  const dropPost = (id) => setPosts((prev) => (prev ? prev.filter((p) => p._id !== id) : prev));

  return (
    <MainLayout>
      <div className="space-y-5">
        <div>
          <h1 className="text-xl font-semibold text-aurora-text">Saved</h1>
          <p className="text-sm text-aurora-text-muted">Posts and reels you've saved for later.</p>
        </div>

        {posts === null ? (
          <div className="flex h-40 items-center justify-center">
            <div className="h-8 w-8 animate-spin rounded-full border-2 border-aurora-border border-t-aurora-violet" />
          </div>
        ) : error ? (
          <div className="rounded-aurora-lg border border-aurora-border bg-aurora-card p-10 text-center">
            <p className="text-aurora-text-muted">Couldn't load your saved items. Try again in a moment.</p>
          </div>
        ) : posts.length === 0 ? (
          <div className="rounded-aurora-lg border border-aurora-border bg-aurora-card p-10 text-center">
            <Bookmark className="mx-auto mb-3 text-aurora-text-muted" size={28} />
            <p className="text-aurora-text-muted">
              Nothing saved yet. Tap the bookmark icon on any post or reel to keep it here.
            </p>
          </div>
        ) : (
          posts.map((post) => (
            <PostCard
              key={post._id}
              post={post}
              onDeleted={(id) => dropPost(id)}
              onHidden={(hiddenPost) => {
                dropPost(hiddenPost._id);
                return () => {}; // no undo slot here; re-saving/unhiding brings it back on refresh
              }}
              onUnsaved={(id) => dropPost(id)}
            />
          ))
        )}
      </div>
    </MainLayout>
  );
}
