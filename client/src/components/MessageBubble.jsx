import { useEffect, useRef, useState } from 'react';
import { Link } from 'react-router-dom';
import {
  Check,
  CheckCheck,
  MoreHorizontal,
  Trash2,
  Reply,
  Copy,
  Pencil,
  Forward,
  SmilePlus,
  Flag,
  Download,
  FileText,
} from 'lucide-react';
import api from '../services/api';
import Avatar from './Avatar';
import ReactionPicker from './ReactionPicker';
import ReportModal from './ReportModal';
import { showToast } from '../utils/toast';
import AnchoredPopover from './AnchoredPopover';

function StatusTicks({ message }) {
  if (message.readBy.length > 1) return <CheckCheck size={14} className="text-aurora-cyan" />;
  if (message.deliveredTo.length > 1) return <CheckCheck size={14} className="text-white/60" />;
  return <Check size={14} className="text-white/60" />;
}

function formatBytes(bytes) {
  if (!bytes && bytes !== 0) return '';
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}

// Groups the flat reactions array into { emoji: { count, mine } } for compact display
// beneath the bubble — several users can react with the same emoji, and it should read
// as one pill with a count, not one pill per person.
function groupReactions(reactions, myId) {
  const groups = {};
  for (const r of reactions || []) {
    if (!groups[r.emoji]) groups[r.emoji] = { emoji: r.emoji, count: 0, mine: false };
    groups[r.emoji].count += 1;
    if (String(r.user?._id || r.user) === String(myId)) groups[r.emoji].mine = true;
  }
  return Object.values(groups);
}

export default function MessageBubble({
  message,
  isOwn,
  myId,
  showSenderIdentity = false,
  isGroup = false,
  gradient,
  highlighted = false,
  onMediaClick,
  onReply,
  onEdit,
  onForward,
  onJumpTo,
}) {
  const [showMenu, setShowMenu] = useState(false);
  const [showPicker, setShowPicker] = useState(false);
  // Real DOM anchor for the portal-rendered ReactionPicker (see ReactionPicker.jsx for
  // why it can no longer be positioned relative to the bubble itself).
  const reactButtonRef = useRef(null);
  const menuButtonRef = useRef(null);
  const [showReport, setShowReport] = useState(false);
  const [deleted, setDeleted] = useState(message.isDeleted);
  const [reactions, setReactions] = useState(message.reactions || []);

  // This component stays mounted across re-renders (keyed by message._id in ChatWindow),
  // so the useState above only seeds `reactions` on first mount. Without this, reactions
  // added by OTHER users — which arrive as a fresh `message` prop via the
  // message:reaction:update socket event — never show up here; only this user's own
  // optimistic taps (which call setReactions directly) were ever visible.
  useEffect(() => {
    setReactions(message.reactions || []);
  }, [message.reactions]);

  const myReaction = reactions.find((r) => String(r.user?._id || r.user) === String(myId));
  const groupedReactions = groupReactions(reactions, myId);
  const hasCopyableText = message.type === 'text' && !!message.text && !deleted;

  const handleDelete = async () => {
    try {
      await api.delete(`/messages/${message._id}`);
      setDeleted(true);
    } catch (err) {
      showToast(err.response?.data?.message || 'Could not delete message.', { type: 'error' });
    }
    setShowMenu(false);
  };

  const handleCopy = async () => {
    setShowMenu(false);
    try {
      await navigator.clipboard.writeText(message.text);
      showToast('Message copied', { type: 'success' });
    } catch {
      showToast("Couldn't copy — your browser blocked clipboard access.", { type: 'error' });
    }
  };

  const handleReact = async (emoji) => {
    const toggledOff = myReaction?.emoji === emoji;
    // Optimistic update — the server broadcasts message:reaction:update to the whole
    // conversation (including us) a moment later, which reconciles this if anything about
    // the toggle disagreed with what we predicted here.
    setReactions((prev) => {
      const withoutMine = prev.filter((r) => String(r.user?._id || r.user) !== String(myId));
      return toggledOff ? withoutMine : [...withoutMine, { user: myId, emoji }];
    });
    try {
      await api.post(`/messages/${message._id}/react`, { emoji: toggledOff ? null : emoji });
    } catch (err) {
      setReactions(message.reactions || []); // roll back on failure
      showToast(err.response?.data?.message || 'Could not react to that message.', { type: 'error' });
    }
  };

  const canEdit = isOwn && message.type === 'text' && !deleted;
  const canDelete = isOwn && !deleted;
  const canForward = !deleted;
  const canReply = !deleted;
  const canReact = !deleted;

  return (
    <div className={`flex gap-2 ${isOwn ? 'justify-end' : 'justify-start'}`}>
      {/* Sender avatar for incoming group messages — reserves the slot even when the
          identity label is skipped (consecutive messages from the same person) so
          bubbles stay aligned instead of jumping left/right. */}
      {!isOwn && isGroup && (
        <div className="w-7 flex-shrink-0 self-end">
          {showSenderIdentity && (
            <Link to={`/profile/${message.sender.username}`} aria-label={`${message.sender.name}'s profile`}>
              <Avatar src={message.sender.avatarUrl} name={message.sender.name} size={28} />
            </Link>
          )}
        </div>
      )}

      <div className={`group flex max-w-[75%] flex-col ${isOwn ? 'items-end' : 'items-start'}`}>
        {showSenderIdentity && (
          <Link
            to={`/profile/${message.sender.username}`}
            className="mb-0.5 px-1 text-xs font-medium text-aurora-text-muted transition-aurora hover:text-aurora-cyan"
          >
            {message.sender.name}
          </Link>
        )}

        <div className={`flex items-end gap-1.5 ${isOwn ? 'flex-row-reverse' : ''}`}>
          <div className="relative">
            <div
              className={`relative rounded-aurora-sm px-3.5 py-2 text-sm ${
                isOwn ? 'text-white' : 'bg-aurora-card text-aurora-text'
              } ${highlighted ? 'ring-2 ring-aurora-cyan' : ''}`}
              style={isOwn ? { backgroundImage: gradient } : undefined}
            >
              {message.forwardedFrom && !deleted && (
                <div className="mb-1 flex items-center gap-1 text-[10px] italic opacity-70">
                  <Forward size={10} /> Forwarded
                </div>
              )}

              {message.replyTo && !deleted && (
                <button
                  type="button"
                  onClick={() => onJumpTo?.(message.replyTo._id)}
                  className="mb-1 block w-full rounded-aurora-sm border-l-2 border-white/40 bg-black/10 px-2 py-1 text-left text-xs opacity-80 transition-aurora hover:opacity-100"
                >
                  {message.replyTo.sender?.name}: {message.replyTo.text?.slice(0, 60) || `a ${message.replyTo.type || 'message'}`}
                </button>
              )}

              {deleted ? (
                <span className="italic opacity-60">This message was deleted</span>
              ) : message.type === 'image' ? (
                // Both sender and recipient can open the full-size view — clicking never
                // depends on who sent it, only on there being media to look at.
                <button
                  type="button"
                  onClick={() => onMediaClick?.(message.media)}
                  className="block max-w-full cursor-zoom-in"
                  aria-label="View photo"
                >
                  <img src={message.media?.url} alt="" className="max-h-64 max-w-full rounded-aurora-sm object-cover" />
                </button>
              ) : message.type === 'video' ? (
                <button
                  type="button"
                  onClick={() => onMediaClick?.(message.media)}
                  className="block max-w-full cursor-zoom-in"
                  aria-label="View video full screen"
                >
                  <video src={message.media?.url} className="max-h-64 max-w-full rounded-aurora-sm" />
                </button>
              ) : message.type === 'voice' ? (
                // Native <audio controls> ignores flex/max-w constraints on its own, so it
                // was overflowing the bubble on narrow screens — cap it explicitly.
                <audio src={message.media?.url} controls className="h-9 w-56 max-w-full sm:w-64" />
              ) : message.type === 'file' ? (
                <a
                  href={message.media?.url}
                  target="_blank"
                  rel="noopener noreferrer"
                  download={message.media?.filename}
                  className="flex min-w-[10rem] items-center gap-2.5 rounded-aurora-sm bg-black/10 px-2.5 py-2"
                >
                  <FileText size={22} className="flex-shrink-0" />
                  <span className="min-w-0 flex-1">
                    <span className="block truncate text-xs font-medium">{message.media?.filename || 'File'}</span>
                    <span className="block text-[10px] opacity-70">{formatBytes(message.media?.size)}</span>
                  </span>
                  <Download size={14} className="flex-shrink-0" />
                </a>
              ) : message.type === 'post' ? (
                message.sharedPost ? (
                  <Link
                    to={`/post/${message.sharedPost._id}`}
                    className="flex w-56 max-w-full items-center gap-2.5 rounded-aurora-sm bg-black/10 p-2 transition-aurora hover:bg-black/20"
                  >
                    {message.sharedPost.thumbnailUrl ? (
                      <img
                        src={message.sharedPost.thumbnailUrl}
                        alt=""
                        className="h-12 w-12 flex-shrink-0 rounded-aurora-sm object-cover"
                      />
                    ) : (
                      <span className="flex h-12 w-12 flex-shrink-0 items-center justify-center rounded-aurora-sm bg-black/20 text-lg">
                        {message.sharedPost.type === 'music' ? '🎵' : message.sharedPost.type === 'voice' ? '🎤' : '📷'}
                      </span>
                    )}
                    <span className="min-w-0 flex-1">
                      <span className="block truncate text-xs font-medium">{message.sharedPost.author?.name}'s post</span>
                      <span className="block truncate text-[11px] opacity-70">
                        {message.sharedPost.song
                          ? `${message.sharedPost.song.title} · ${message.sharedPost.song.artist}`
                          : message.sharedPost.caption || 'View post'}
                      </span>
                    </span>
                  </Link>
                ) : (
                  <span className="italic opacity-60">This post is no longer available</span>
                )
              ) : (
                <span className="whitespace-pre-wrap">{message.text}</span>
              )}

              {message.isEdited && !deleted && <span className="ml-1 text-[10px] opacity-60">(edited)</span>}

              <div
                className={`mt-1 flex items-center gap-1 text-[10px] ${
                  isOwn ? 'justify-end text-white/70' : 'text-aurora-text-muted'
                }`}
              >
                {new Date(message.createdAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                {isOwn && <StatusTicks message={message} />}
              </div>
            </div>

            {showPicker && (
              <ReactionPicker
                currentEmoji={myReaction?.emoji}
                align={isOwn ? 'right' : 'left'}
                anchorEl={reactButtonRef.current}
                onSelect={handleReact}
                onClose={() => setShowPicker(false)}
              />
            )}
          </div>

          {!deleted && (
            <div className="relative flex items-center gap-0.5 opacity-100 transition-aurora md:opacity-0 md:group-hover:opacity-100">
              {canReact && (
                <button
                  ref={reactButtonRef}
                  onClick={() => setShowPicker((s) => !s)}
                  aria-label="React to message"
                  aria-haspopup="menu"
                  aria-expanded={showPicker}
                  className="text-aurora-text-muted hover:text-aurora-violet"
                >
                  <SmilePlus size={14} />
                </button>
              )}
              <button
                ref={menuButtonRef}
                onClick={() => setShowMenu((s) => !s)}
                aria-label="Message options"
                aria-haspopup="menu"
                aria-expanded={showMenu}
                className="text-aurora-text-muted hover:text-aurora-text"
              >
                <MoreHorizontal size={14} />
              </button>
              <AnchoredPopover
                open={showMenu}
                anchorEl={menuButtonRef.current}
                onClose={() => setShowMenu(false)}
                align={isOwn ? 'right' : 'left'}
                className="w-36 overflow-hidden rounded-aurora-sm border border-aurora-border bg-aurora-card shadow-aurora"
              >
                <div role="menu">
                  {canReply && (
                    <button
                      onClick={() => {
                        onReply?.(message);
                        setShowMenu(false);
                      }}
                      role="menuitem"
                      className="flex w-full items-center gap-2 px-3 py-2 text-left text-xs text-aurora-text hover:bg-aurora-bg"
                    >
                      <Reply size={12} /> Reply
                    </button>
                  )}
                  {hasCopyableText && (
                    <button onClick={handleCopy} role="menuitem" className="flex w-full items-center gap-2 px-3 py-2 text-left text-xs text-aurora-text hover:bg-aurora-bg">
                      <Copy size={12} /> Copy
                    </button>
                  )}
                  {canEdit && (
                    <button
                      onClick={() => {
                        onEdit?.(message);
                        setShowMenu(false);
                      }}
                      role="menuitem"
                      className="flex w-full items-center gap-2 px-3 py-2 text-left text-xs text-aurora-text hover:bg-aurora-bg"
                    >
                      <Pencil size={12} /> Edit
                    </button>
                  )}
                  {canForward && (
                    <button
                      onClick={() => {
                        onForward?.(message);
                        setShowMenu(false);
                      }}
                      role="menuitem"
                      className="flex w-full items-center gap-2 px-3 py-2 text-left text-xs text-aurora-text hover:bg-aurora-bg"
                    >
                      <Forward size={12} /> Forward
                    </button>
                  )}
                  {!isOwn && (
                    <button
                      onClick={() => {
                        setShowReport(true);
                        setShowMenu(false);
                      }}
                      role="menuitem"
                      className="flex w-full items-center gap-2 px-3 py-2 text-left text-xs text-aurora-text hover:bg-aurora-bg"
                    >
                      <Flag size={12} /> Report
                    </button>
                  )}
                  {canDelete && (
                    <button onClick={handleDelete} role="menuitem" className="flex w-full items-center gap-2 px-3 py-2 text-left text-xs text-aurora-like hover:bg-aurora-bg">
                      <Trash2 size={12} /> Delete
                    </button>
                  )}
                </div>
              </AnchoredPopover>
            </div>
          )}
        </div>

        {groupedReactions.length > 0 && (
          <div className={`mt-0.5 flex flex-wrap gap-1 ${isOwn ? 'justify-end' : 'justify-start'}`}>
            {groupedReactions.map((g) => (
              <button
                key={g.emoji}
                type="button"
                onClick={() => handleReact(g.emoji)}
                aria-label={`${g.mine ? 'Remove your' : 'Add'} ${g.emoji} reaction${g.count > 1 ? ` (${g.count} reacted)` : ''}`}
                className={`flex items-center gap-1 rounded-full border px-1.5 py-0.5 text-[11px] transition-aurora ${
                  g.mine
                    ? 'border-aurora-violet bg-aurora-violet/15 text-aurora-text'
                    : 'border-aurora-border bg-aurora-card text-aurora-text-muted hover:bg-aurora-bg'
                }`}
              >
                <span>{g.emoji}</span>
                {g.count > 1 && <span>{g.count}</span>}
              </button>
            ))}
          </div>
        )}
      </div>

      {showReport && (
        <ReportModal targetType="message" targetId={message._id} targetName={message.sender?.name} onClose={() => setShowReport(false)} />
      )}
    </div>
  );
}
