import { useEffect, useRef, useState } from 'react';
import { useSearchParams } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import { Heart, MessageSquare, Share2, Bookmark, Plus, X } from 'lucide-react';
import api from '../services/api';
import MainLayout from '../layouts/MainLayout';
import Avatar from '../components/Avatar';
import FollowButton from '../components/FollowButton';
import CreateReelModal from '../components/CreateReelModal';
import CommentSection from '../components/CommentSection';
import ShareSheet from '../components/ShareSheet';
import { showToast } from '../utils/toast';

function ReelCard({ reel }) {
  const videoRef = useRef(null);
  const [liked, setLiked] = useState(reel.isLiked);
  const [likeCount, setLikeCount] = useState(reel.likeCount);
  const [muted, setMuted] = useState(true);
  const [saved, setSaved] = useState(reel.isSaved);
  const [shareCount, setShareCount] = useState(reel.shareCount);
  const [commentCount, setCommentCount] = useState(reel.commentCount);
  const [showComments, setShowComments] = useState(false);
  const [showShareSheet, setShowShareSheet] = useState(false);

  useEffect(() => {
    const el = videoRef.current;
    if (!el) return undefined;
    const observer = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting) el.play().catch(() => {});
        else el.pause();
      },
      { threshold: 0.6 }
    );
    observer.observe(el);
    return () => observer.disconnect();
  }, []);

  const toggleLike = async () => {
    const next = !liked;
    setLiked(next);
    setLikeCount((c) => c + (next ? 1 : -1));
    try {
      if (next) await api.post(`/posts/${reel._id}/like`);
      else await api.delete(`/posts/${reel._id}/like`);
    } catch {
      setLiked(!next);
      setLikeCount((c) => c - (next ? 1 : -1));
    }
  };

  // Mirrors PostCard's toggleSave exactly — same endpoint, same optimistic-then-rollback
  // shape — so a reel saved here shows up correctly in Saved posts and vice versa.
  const toggleSave = async () => {
    const next = !saved;
    setSaved(next);
    try {
      if (next) await api.post(`/posts/${reel._id}/save`);
      else await api.delete(`/posts/${reel._id}/save`);
    } catch {
      setSaved(!next);
      showToast('Could not update saved posts.', { type: 'error' });
    }
  };

  // Actually sending the reel somewhere now happens in ShareSheet (send to a friend's
  // chat, copy link, native share, or download); this just keeps the on-screen count
  // in sync once one of those actions succeeds.
  const onShared = () => setShareCount((c) => c + 1);

  return (
    <div
      id={`reel-${reel._id}`}
      className="relative flex h-full w-full snap-start items-center justify-center overflow-hidden bg-black md:rounded-aurora-lg"
    >
      <video
        ref={videoRef}
        src={reel.media?.[0]?.url}
        loop
        muted={muted}
        playsInline
        onClick={() => setMuted((m) => !m)}
        className="h-full w-full object-contain"
      />

      <div className="absolute bottom-20 left-4 right-16 text-white md:bottom-4">
        <div className="mb-1.5 flex items-center gap-2">
          <Avatar src={reel.author?.avatarUrl} name={reel.author?.name} size={32} />
          <span className="text-sm font-semibold">{reel.author?.name}</span>
          <FollowButton username={reel.author?.username} initialIsFollowing={reel.isFollowingAuthor} />
        </div>
        {reel.caption && <p className="text-sm">{reel.caption}</p>}
      </div>

      <div className="absolute bottom-36 right-3 flex flex-col items-center gap-5 text-white md:bottom-24">
        <motion.button whileTap={{ scale: 0.8 }} onClick={toggleLike} aria-label={liked ? 'Unlike' : 'Like'} aria-pressed={liked} className="flex flex-col items-center gap-1">
          <Heart size={26} fill={liked ? '#F43F5E' : 'none'} color={liked ? '#F43F5E' : 'white'} />
          <span className="text-xs">{likeCount}</span>
        </motion.button>
        <button onClick={() => setShowComments(true)} aria-label="View comments" className="flex flex-col items-center gap-1">
          <MessageSquare size={26} />
          <span className="text-xs">{commentCount}</span>
        </button>
        <motion.button whileTap={{ scale: 0.85 }} onClick={() => setShowShareSheet(true)} aria-label="Share reel" className="flex flex-col items-center gap-1">
          <Share2 size={26} />
          {shareCount > 0 && <span className="text-xs">{shareCount}</span>}
        </motion.button>
        <motion.button
          whileTap={{ scale: 0.8 }}
          onClick={toggleSave}
          aria-label={saved ? 'Unsave' : 'Save'}
          aria-pressed={saved}
          className="flex flex-col items-center gap-1"
        >
          <Bookmark size={26} fill={saved ? '#7C3AED' : 'none'} color={saved ? '#7C3AED' : 'white'} />
        </motion.button>
      </div>

      <AnimatePresence>
        {showComments && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="absolute inset-0 z-10 flex items-end justify-center bg-black/60"
            onClick={() => setShowComments(false)}
            onKeyDown={(e) => e.key === 'Escape' && setShowComments(false)}
          >
            <motion.div
              initial={{ y: '100%' }}
              animate={{ y: 0 }}
              exit={{ y: '100%' }}
              transition={{ type: 'spring', damping: 30, stiffness: 300 }}
              role="dialog"
              aria-modal="true"
              aria-label="Comments"
              onClick={(e) => e.stopPropagation()}
              className="max-h-[70%] w-full max-w-md overflow-y-auto rounded-t-aurora-lg bg-aurora-card p-4 text-aurora-text md:rounded-aurora-lg"
            >
              <div className="mb-1 flex items-center justify-between">
                <h2 className="text-sm font-semibold">Comments</h2>
                <button onClick={() => setShowComments(false)} aria-label="Close comments" className="text-aurora-text-muted hover:text-aurora-text">
                  <X size={18} />
                </button>
              </div>
              <CommentSection postId={reel._id} onCommentPosted={() => setCommentCount((c) => c + 1)} />
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      {showShareSheet && <ShareSheet post={reel} onClose={() => setShowShareSheet(false)} onShared={onShared} />}
    </div>
  );
}

export default function Reels() {
  const [reels, setReels] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showCreate, setShowCreate] = useState(false);
  const [searchParams] = useSearchParams();
  const targetId = searchParams.get('id');

  useEffect(() => {
    (async () => {
      const { data } = await api.get('/posts/reels/feed');
      let list = data.reels;

      // Deep-linked from Explore's "Popular reels" — if that reel didn't make the first
      // page of the feed, fetch it directly so it's still there to scroll to.
      if (targetId && !list.some((r) => r._id === targetId)) {
        try {
          const { data: single } = await api.get(`/posts/${targetId}`);
          list = [single.post, ...list];
        } catch {
          // reel may have been deleted since — fall back to the regular feed silently
        }
      }

      setReels(list);
      setLoading(false);
    })();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [targetId]);

  useEffect(() => {
    if (!targetId || loading) return;
    const el = document.getElementById(`reel-${targetId}`);
    el?.scrollIntoView({ behavior: 'auto', block: 'start' });
  }, [targetId, loading]);

  const handleCreated = (post) => {
    setReels((prev) => [post, ...prev]);
  };

  return (
    <MainLayout fullBleed>
      {loading ? (
        <div className="flex h-full items-center justify-center">
          <div className="h-8 w-8 animate-spin rounded-full border-2 border-aurora-border border-t-aurora-violet" />
        </div>
      ) : reels.length === 0 ? (
        <div className="flex h-full flex-col items-center justify-center gap-4 p-6">
          <div className="rounded-aurora-lg border border-aurora-border bg-aurora-card p-10 text-center text-sm text-aurora-text-muted">
            No reels yet. Be the first to post one.
          </div>
          <motion.button
            whileHover={{ scale: 1.03 }}
            whileTap={{ scale: 0.96 }}
            onClick={() => setShowCreate(true)}
            className="flex items-center gap-1.5 rounded-full bg-aurora-gradient px-5 py-2.5 text-sm font-semibold text-white"
          >
            <Plus size={16} /> Create a Reel
          </motion.button>
        </div>
      ) : (
        <div className="relative h-full snap-y snap-mandatory overflow-y-auto md:space-y-4 md:py-4">
          {reels.map((reel) => (
            <ReelCard key={reel._id} reel={reel} />
          ))}
        </div>
      )}

      <motion.button
        whileHover={{ scale: 1.08 }}
        whileTap={{ scale: 0.92 }}
        onClick={() => setShowCreate(true)}
        aria-label="Create Reel"
        className="fixed bottom-24 right-4 z-30 flex h-13 w-13 items-center justify-center rounded-full bg-aurora-gradient p-3.5 text-white shadow-aurora md:bottom-8 md:right-8"
      >
        <Plus size={22} />
      </motion.button>

      {showCreate && <CreateReelModal onClose={() => setShowCreate(false)} onCreated={handleCreated} />}
    </MainLayout>
  );
}
