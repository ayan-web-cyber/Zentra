import { useRef, useState } from 'react';
import { Link } from 'react-router-dom';
import { motion } from 'framer-motion';
import {
  Heart,
  MessageSquare,
  Share2,
  Bookmark,
  MoreHorizontal,
  Trash2,
  Expand,
  Flag,
  VolumeX,
  Link2,
  EyeOff,
} from 'lucide-react';
import api from '../services/api';
import { useAuth } from '../context/AuthContext';
import Avatar from './Avatar';
import CommentSection from './CommentSection';
import CaptionText from './CaptionText';
import MediaViewer from './MediaViewer';
import ReportModal from './ReportModal';
import AudioPlayer from './AudioPlayer';
import ShareSheet from './ShareSheet';
import { showToast } from '../utils/toast';
import { confirmDialog } from '../utils/confirm';
import AnchoredPopover from './AnchoredPopover';

function timeAgo(dateStr) {
  const seconds = Math.floor((Date.now() - new Date(dateStr)) / 1000);
  if (seconds < 60) return 'just now';
  const minutes = Math.floor(seconds / 60);
  if (minutes < 60) return `${minutes}m`;
  const hours = Math.floor(minutes / 60);
  if (hours < 24) return `${hours}h`;
  return `${Math.floor(hours / 24)}d`;
}

export default function PostCard({ post, onDeleted, onHidden, onUnsaved, canModerate = false }) {
  const { user } = useAuth();
  const [liked, setLiked] = useState(post.isLiked);
  const [likeCount, setLikeCount] = useState(post.likeCount);
  const [saved, setSaved] = useState(post.isSaved);
  const [shareCount, setShareCount] = useState(post.shareCount);
  const [showComments, setShowComments] = useState(false);
  const [showShareSheet, setShowShareSheet] = useState(false);
  const [showMenu, setShowMenu] = useState(false);
  const menuButtonRef = useRef(null);
  const [showReport, setShowReport] = useState(false);
  const [muting, setMuting] = useState(false);
  const [muted, setMuted] = useState(false);
  const [viewerMedia, setViewerMedia] = useState(null);
  const [deleted, setDeleted] = useState(false);
  const [pollResults, setPollResults] = useState(
    post.type === 'poll' ? post.poll.options.map((o) => o.votes.length) : null
  );
  const [voted, setVoted] = useState(false);

  const isOwner = post.isOwner ?? user?._id === post.author?._id;
  // A community admin/moderator can delete any post in their community, not just their own —
  // the server enforces this too, this just decides whether to show the option.
  const canManage = isOwner || canModerate;

  const toggleLike = async () => {
    const next = !liked;
    setLiked(next);
    setLikeCount((c) => c + (next ? 1 : -1));
    try {
      if (next) await api.post(`/posts/${post._id}/like`);
      else await api.delete(`/posts/${post._id}/like`);
    } catch {
      setLiked(!next);
      setLikeCount((c) => c - (next ? 1 : -1));
    }
  };

  const toggleSave = async () => {
    const next = !saved;
    setSaved(next);
    try {
      if (next) await api.post(`/posts/${post._id}/save`);
      else await api.delete(`/posts/${post._id}/save`);
      // Lets a dedicated "Saved" list (which only exists because it's saved) drop the
      // card the moment it's unsaved, instead of leaving a stale, no-longer-saved item.
      if (!next) onUnsaved?.(post._id);
    } catch {
      setSaved(!next);
    }
  };

  // Actually sending the post somewhere — to a friend's chat, to another app, or as a
  // copied link — now happens in ShareSheet; this just keeps the visible count in sync
  // once any of those actions succeeds.
  const onShared = () => setShareCount((c) => c + 1);

  const vote = async (optionIndex) => {
    try {
      const { data } = await api.post(`/posts/${post._id}/vote`, { optionIndex });
      setPollResults(data.results.map((r) => r.votes));
      setVoted(true);
    } catch (err) {
      console.error(err.response?.data?.message);
    }
  };

  const handleDelete = async () => {
    if (!(await confirmDialog('Delete this post? This can’t be undone.', { danger: true, confirmLabel: 'Delete' }))) return;
    try {
      await api.delete(`/posts/${post._id}`);
      setDeleted(true);
      onDeleted?.(post._id);
    } catch (err) {
      console.error(err.response?.data?.message);
    }
  };

  const handleCopyLink = async () => {
    setShowMenu(false);
    // /post/:postId is a new minimal route (see PostDetail.jsx) — there was no existing
    // single-post page or link convention to reuse (Reels has its own ?id= deep link, but
    // that's reel-specific), so this is the smallest addition that makes the copied URL
    // actually resolve to something when opened later.
    const url = `${window.location.origin}/post/${post._id}`;
    try {
      await navigator.clipboard.writeText(url);
      showToast('Post link copied', { type: 'success' });
    } catch {
      showToast("Couldn't copy — your browser blocked clipboard access.", { type: 'error' });
    }
  };

  const handleHide = async () => {
    setShowMenu(false);
    // Optimistic: remove from the current feed immediately (onHidden returns a `restore`
    // closure that puts it back at its original position) and only commit the hide
    // server-side after a short delay, so Undo can cancel it outright instead of doing a
    // hide-then-unhide round trip.
    const restore = onHidden?.(post);
    let undone = false;
    showToast('Post hidden', {
      action: {
        label: 'Undo',
        onClick: () => {
          undone = true;
          restore?.();
        },
      },
    });
    setTimeout(async () => {
      if (undone) return;
      try {
        await api.post(`/posts/${post._id}/hide`);
      } catch (err) {
        console.error(err.response?.data?.message);
        // The post already disappeared from the feed locally — if persisting the hide
        // failed, put it back rather than leaving it silently missing.
        restore?.();
        showToast('Could not hide that post — restored it.', { type: 'error' });
      }
    }, 2600); // slightly longer than the toast's own 2500ms duration
  };

  const handleMute = async () => {
    setMuting(true);
    setShowMenu(false);
    try {
      await api.post(`/users/${post.author.username}/mute`);
      // Muting is silent from the muted person's side, but the viewer should see it take
      // effect right away rather than waiting for the next feed refresh.
      setMuted(true);
    } catch (err) {
      console.error(err.response?.data?.message);
    } finally {
      setMuting(false);
    }
  };

  if (deleted || muted) return null;

  const totalVotes = pollResults?.reduce((a, b) => a + b, 0) || 0;

  return (
    <article className="rounded-aurora-lg border border-aurora-border bg-aurora-card p-4">
      <div className="mb-3 flex items-start justify-between">
        <div className="flex items-center gap-3">
          <Avatar src={post.author?.avatarUrl} name={post.author?.name} size={40} />
          <div>
            <div className="text-sm font-semibold text-aurora-text">
              {post.author?.name}
              {post.mood && <span className="ml-1.5 font-normal text-aurora-text-muted">is feeling {post.mood}</span>}
            </div>
            <div className="text-xs text-aurora-text-muted">
              @{post.author?.username} · {timeAgo(post.createdAt)}
              {post.isEdited && ' · edited'}
              {post.community && (
                <>
                  {' · '}
                  <Link to={`/community/${post.community.slug}`} className="text-aurora-cyan hover:underline">
                    {post.community.icon} {post.community.name}
                  </Link>
                </>
              )}
            </div>
            {post.taggedUsers?.length > 0 && (
              <div className="mt-0.5 text-xs text-aurora-text-muted">
                with{' '}
                {post.taggedUsers.map((t, i) => (
                  <span key={t._id}>
                    <Link to={`/profile/${t.username}`} className="font-medium text-aurora-cyan hover:underline">
                      {t.name}
                    </Link>
                    {i < post.taggedUsers.length - 1 && ', '}
                  </span>
                ))}
              </div>
            )}
          </div>
        </div>

        <div className="relative">
          <button
            ref={menuButtonRef}
            onClick={() => setShowMenu((s) => !s)}
            aria-label="Post options"
            aria-haspopup="menu"
            aria-expanded={showMenu}
            className="text-aurora-text-muted transition-aurora hover:text-aurora-text"
          >
            <MoreHorizontal size={18} />
          </button>
          <AnchoredPopover
            open={showMenu}
            anchorEl={menuButtonRef.current}
            onClose={() => setShowMenu(false)}
            align="right"
            className="w-44 overflow-hidden rounded-aurora-sm border border-aurora-border bg-aurora-card shadow-aurora"
          >
            <div role="menu">
              {canManage && (
                <button
                  onClick={handleDelete}
                  role="menuitem"
                  className="flex w-full items-center gap-2 px-3 py-2 text-left text-sm text-aurora-like transition-aurora hover:bg-aurora-bg"
                >
                  <Trash2 size={14} /> Delete
                  {!isOwner && <span className="ml-auto text-[10px] text-aurora-text-muted">admin</span>}
                </button>
              )}

              <button
                onClick={handleCopyLink}
                role="menuitem"
                className="flex w-full items-center gap-2 px-3 py-2 text-left text-sm text-aurora-text transition-aurora hover:bg-aurora-bg"
              >
                <Link2 size={14} /> Copy link
              </button>

              {/* Hiding only affects this viewer's own feed (see HiddenPost model) — makes
                  sense for any post, including your own, so it isn't gated by isOwner. */}
              <button
                onClick={handleHide}
                role="menuitem"
                className="flex w-full items-center gap-2 px-3 py-2 text-left text-sm text-aurora-text transition-aurora hover:bg-aurora-bg"
              >
                <EyeOff size={14} /> Hide post
              </button>

              {/* Report and mute are for other people's posts — reporting your own makes no
                  sense, and the server rejects it anyway. */}
              {!isOwner && (
                <>
                  <button
                    onClick={() => {
                      setShowMenu(false);
                      setShowReport(true);
                    }}
                    role="menuitem"
                    className="flex w-full items-center gap-2 px-3 py-2 text-left text-sm text-aurora-text transition-aurora hover:bg-aurora-bg"
                  >
                    <Flag size={14} /> Report post
                  </button>
                  <button
                    onClick={handleMute}
                    disabled={muting}
                    role="menuitem"
                    className="flex w-full items-center gap-2 px-3 py-2 text-left text-sm text-aurora-text transition-aurora hover:bg-aurora-bg disabled:opacity-50"
                  >
                    <VolumeX size={14} /> Mute {post.author?.name?.split(' ')[0] || 'user'}
                  </button>
                </>
              )}
            </div>
          </AnchoredPopover>
        </div>
      </div>

      {post.caption && <CaptionText text={post.caption} className="mb-3 text-sm leading-relaxed text-aurora-text" />}

      {post.type === 'voice' && post.media?.[0] ? (
        <div className="mb-3">
          <AudioPlayer src={post.media[0].url} title={`${post.author?.name}'s voice post`} variant="voice" />
        </div>
      ) : post.type === 'music' && post.song ? (
        <div className="mb-3">
          <AudioPlayer
            src={post.song.audioUrl}
            title={post.song.title}
            subtitle={post.song.artist}
            coverColor={post.song.coverColor}
            variant="music"
          />
        </div>
      ) : (
        post.media?.length > 0 && (
          <div
            className="group relative mb-3 cursor-zoom-in overflow-hidden rounded-aurora-sm"
            onClick={() => setViewerMedia(post.media[0])}
          >
            {post.media[0].mimeType?.startsWith('video') ? (
              <video src={post.media[0].url} className="max-h-96 w-full object-cover" muted />
            ) : (
              <img src={post.media[0].url} alt="" className="max-h-96 w-full object-cover" />
            )}
            <div className="pointer-events-none absolute inset-0 flex items-center justify-center bg-black/0 transition-aurora group-hover:bg-black/20">
              <Expand
                size={28}
                className="text-white opacity-100 transition-aurora md:opacity-0 md:group-hover:opacity-100"
              />
            </div>
          </div>
        )
      )}

      {post.type === 'poll' && (
        <div className="mb-3 space-y-2">
          <p className="text-sm font-medium text-aurora-text">{post.poll.question}</p>
          {post.poll.options.map((opt, i) => {
            const votes = pollResults[i];
            const pct = totalVotes ? Math.round((votes / totalVotes) * 100) : 0;
            return (
              <button
                key={i}
                onClick={() => !voted && vote(i)}
                disabled={voted}
                className="relative w-full overflow-hidden rounded-aurora-sm border border-aurora-border px-3 py-2 text-left text-sm"
              >
                {voted && (
                  <motion.div
                    initial={{ width: 0 }}
                    animate={{ width: `${pct}%` }}
                    transition={{ duration: 0.5 }}
                    className="absolute inset-y-0 left-0 bg-aurora-gradient opacity-30"
                  />
                )}
                <span className="relative flex justify-between text-aurora-text">
                  {opt.text}
                  {voted && <span className="text-aurora-text-muted">{pct}%</span>}
                </span>
              </button>
            );
          })}
        </div>
      )}

      <div className="flex items-center gap-5 text-sm text-aurora-text-muted">
        <motion.button
          whileTap={{ scale: 0.8 }}
          onClick={toggleLike}
          className="flex items-center gap-1.5"
          style={{ color: liked ? '#F43F5E' : undefined }}
        >
          <motion.span animate={liked ? { scale: [1, 1.3, 1] } : { scale: 1 }} transition={{ duration: 0.3 }}>
            <Heart size={17} fill={liked ? '#F43F5E' : 'none'} />
          </motion.span>
          {likeCount}
        </motion.button>

        <button onClick={() => setShowComments((s) => !s)} className="flex items-center gap-1.5">
          <MessageSquare size={17} />
          {post.commentCount}
        </button>

        <motion.button whileTap={{ scale: 0.85 }} onClick={() => setShowShareSheet(true)} aria-label="Share post" className="flex items-center gap-1.5">
          <Share2 size={17} />
          {shareCount > 0 && shareCount}
        </motion.button>

        <motion.button
          whileTap={{ scale: 0.8 }}
          onClick={toggleSave}
          className="ml-auto"
          style={{ color: saved ? '#7C3AED' : undefined }}
        >
          <Bookmark size={17} fill={saved ? '#7C3AED' : 'none'} />
        </motion.button>
      </div>

      {showComments && <CommentSection postId={post._id} />}

      {showShareSheet && <ShareSheet post={post} onClose={() => setShowShareSheet(false)} onShared={onShared} />}

      <MediaViewer media={viewerMedia} onClose={() => setViewerMedia(null)} />

      {showReport && (
        <ReportModal
          targetType="post"
          targetId={post._id}
          targetName={`Post by ${post.author?.name}`}
          onClose={() => setShowReport(false)}
        />
      )}
    </article>
  );
}
