import { useEffect, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { ArrowLeft } from 'lucide-react';
import api from '../services/api';
import MainLayout from '../layouts/MainLayout';
import PostCard from '../components/PostCard';

// There was no existing single-post page or link convention in the app to reuse (Reels has
// its own ?id= deep link into the reels feed, but that's specific to reels/video). This is
// the smallest addition that makes "Copy link" on a post produce a URL that actually
// resolves to something when opened later, reusing the existing GET /posts/:postId endpoint
// and the existing PostCard component rather than building a second post-rendering path.
export default function PostDetail() {
  const { postId } = useParams();
  const navigate = useNavigate();
  const [post, setPost] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    let cancelled = false;
    setLoading(true);
    setError('');
    api
      .get(`/posts/${postId}`)
      .then(({ data }) => {
        if (!cancelled) setPost(data.post);
      })
      .catch((err) => {
        if (cancelled) return;
        setError(
          err.response?.status === 404
            ? "This post doesn't exist or is no longer available."
            : err.response?.status === 403
              ? "You don't have permission to view this post."
              : 'Could not load this post.'
        );
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, [postId]);

  return (
    <MainLayout>
      <div className="mx-auto max-w-xl space-y-4">
        <button
          onClick={() => navigate(-1)}
          aria-label="Go back"
          className="flex items-center gap-1.5 text-sm text-aurora-text-muted transition-aurora hover:text-aurora-text"
        >
          <ArrowLeft size={16} /> Back
        </button>

        {loading ? (
          <div className="flex h-40 items-center justify-center">
            <div className="h-8 w-8 animate-spin rounded-full border-2 border-aurora-border border-t-aurora-violet" />
          </div>
        ) : error ? (
          <div className="rounded-aurora-lg border border-aurora-border bg-aurora-card p-10 text-center">
            <p className="text-aurora-text-muted">{error}</p>
          </div>
        ) : post ? (
          <PostCard post={post} onDeleted={() => navigate('/home')} />
        ) : null}
      </div>
    </MainLayout>
  );
}
