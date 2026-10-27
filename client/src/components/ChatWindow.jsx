import { useEffect, useMemo, useRef, useState } from 'react';
import { Link } from 'react-router-dom';
import { ChevronLeft, Phone, Video, MoreVertical, Users, BellOff, Search, X, ChevronUp, ChevronDown, Ban } from 'lucide-react';
import api from '../services/api';
import { getSocket } from '../services/socket';
import { useAuth } from '../context/AuthContext';
import { useCall } from '../context/CallContext';
import Avatar from './Avatar';
import MessageBubble from './MessageBubble';
import MessageComposer from './MessageComposer';
import ForwardMessageModal from './ForwardMessageModal';
import GroupMembersModal from './GroupMembersModal';
import ChatOptionsModal from './ChatOptionsModal';
import MediaViewer from './MediaViewer';
import { themeGradient } from '../utils/chatThemes';

function lastSeenLabel(dateStr) {
  if (!dateStr) return 'Offline';
  const minutes = Math.floor((Date.now() - new Date(dateStr)) / 60000);
  if (minutes < 1) return 'Active just now';
  if (minutes < 60) return `Active ${minutes}m ago`;
  const hours = Math.floor(minutes / 60);
  if (hours < 24) return `Active ${hours}h ago`;
  return `Active ${Math.floor(hours / 24)}d ago`;
}

export default function ChatWindow({ conversation, onBack, onConversationUpdate, onDeleted }) {
  const { user } = useAuth();
  const { startCall, callState } = useCall();
  const [messages, setMessages] = useState([]);
  const [loading, setLoading] = useState(true);
  const [typingUser, setTypingUser] = useState(null);
  const [online, setOnline] = useState(conversation.participants[0]?.isOnline);
  const [lastSeen, setLastSeen] = useState(conversation.participants[0]?.lastSeen);
  const [showMembers, setShowMembers] = useState(false);
  const [showOptions, setShowOptions] = useState(false);
  const [showSearch, setShowSearch] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [matchIndex, setMatchIndex] = useState(0);
  const [viewerMedia, setViewerMedia] = useState(null);
  const [replyingTo, setReplyingTo] = useState(null);
  const [editingMessage, setEditingMessage] = useState(null);
  const [forwardingMessage, setForwardingMessage] = useState(null);
  const [jumpHighlight, setJumpHighlight] = useState(null);
  const bottomRef = useRef(null);
  const messageRefs = useRef({});

  const other = !conversation.isGroup ? conversation.participants[0] : null;
  const blockedEitherWay = conversation.iBlockedThem || conversation.theyBlockedMe;

  useEffect(() => {
    let mounted = true;
    setLoading(true);

    api.get(`/conversations/${conversation._id}/messages`).then(({ data }) => {
      if (mounted) {
        setMessages(data.messages);
        setLoading(false);
      }
    });

    const socket = getSocket();
    socket?.emit('conversation:join', conversation._id);
    socket?.emit('message:read', { conversationId: conversation._id });

    const onNewMessage = (msg) => {
      if (msg.conversation === conversation._id) {
        setMessages((prev) => (prev.some((m) => m._id === msg._id) ? prev : [...prev, msg]));
        socket?.emit('message:read', { conversationId: conversation._id });
      }
    };
    const onTyping = ({ conversationId, userId, isTyping }) => {
      if (conversationId === conversation._id && userId !== user._id) {
        setTypingUser(isTyping ? userId : null);
      }
    };
    const onPresence = ({ userId, isOnline, lastSeen: seen }) => {
      if (other && userId === other._id) {
        setOnline(isOnline);
        setLastSeen(seen);
      }
    };
    const onReadUpdate = ({ conversationId, userId }) => {
      if (conversationId === conversation._id) {
        setMessages((prev) =>
          prev.map((m) => (m.readBy.includes(userId) ? m : { ...m, readBy: [...m.readBy, userId] }))
        );
      }
    };
    // Someone edited a message — swap in the fresh text/isEdited flag wherever it's loaded.
    const onEdited = (updated) => {
      if (updated.conversation !== conversation._id) return;
      setMessages((prev) => prev.map((m) => (m._id === updated._id ? { ...m, ...updated } : m)));
    };
    // Sender-only "delete for everyone" — reflect it live for the other participant(s)
    // too, not just the sender's own optimistic local state.
    const onMessageDeleted = ({ conversationId, messageId }) => {
      if (conversationId !== conversation._id) return;
      setMessages((prev) =>
        prev.map((m) => (m._id === messageId ? { ...m, isDeleted: true, text: '', media: null } : m))
      );
    };
    const onReactionUpdate = ({ conversationId, messageId, reactions }) => {
      if (conversationId !== conversation._id) return;
      setMessages((prev) => prev.map((m) => (m._id === messageId ? { ...m, reactions } : m)));
    };

    socket?.on('message:new', onNewMessage);
    socket?.on('typing:update', onTyping);
    socket?.on('presence:update', onPresence);
    socket?.on('message:read:update', onReadUpdate);
    socket?.on('message:edited', onEdited);
    socket?.on('message:deleted', onMessageDeleted);
    socket?.on('message:reaction:update', onReactionUpdate);

    return () => {
      mounted = false;
      socket?.emit('conversation:leave', conversation._id);
      socket?.off('message:new', onNewMessage);
      socket?.off('typing:update', onTyping);
      socket?.off('presence:update', onPresence);
      socket?.off('message:read:update', onReadUpdate);
      socket?.off('message:edited', onEdited);
      socket?.off('message:deleted', onMessageDeleted);
      socket?.off('message:reaction:update', onReactionUpdate);
    };
  }, [conversation._id]);

  useEffect(() => {
    if (!showSearch) bottomRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages, typingUser]);

  // Clear any in-progress reply/edit when switching conversations — carrying either
  // across to a different chat would silently attach it to the wrong thread.
  useEffect(() => {
    setReplyingTo(null);
    setEditingMessage(null);
  }, [conversation._id]);

  // Clicking a reply preview scrolls to (and briefly highlights) the original message
  // when it's already loaded in this window; older, unloaded history has nothing to
  // scroll to yet since this view doesn't paginate history in.
  const jumpToMessage = (messageId) => {
    const el = messageRefs.current[messageId];
    if (!el) return;
    el.scrollIntoView({ behavior: 'smooth', block: 'center' });
    setJumpHighlight(messageId);
    setTimeout(() => setJumpHighlight((cur) => (cur === messageId ? null : cur)), 1500);
  };

  // Search is scoped to whatever's currently loaded in this window — the app doesn't
  // paginate older history into the chat yet, so this covers everything visible to scroll to.
  const matches = useMemo(() => {
    const q = searchQuery.trim().toLowerCase();
    if (!q) return [];
    return messages.filter((m) => !m.isDeleted && m.type === 'text' && m.text?.toLowerCase().includes(q));
  }, [searchQuery, messages]);

  useEffect(() => {
    setMatchIndex(0);
  }, [searchQuery]);

  useEffect(() => {
    const current = matches[matchIndex];
    if (current) messageRefs.current[current._id]?.scrollIntoView({ behavior: 'smooth', block: 'center' });
  }, [matchIndex, matches]);

  const closeSearch = () => {
    setShowSearch(false);
    setSearchQuery('');
  };

  const gradient = themeGradient(conversation.theme);

  return (
    <div className="flex h-full min-h-0 flex-col">
      <div className="flex items-center gap-3 border-b border-aurora-border px-4 py-3">
        <button onClick={onBack} aria-label="Back to conversations" className="text-aurora-text-muted lg:hidden">
          <ChevronLeft size={20} />
        </button>

        {/* The whole identity block is one clear, clickable target — this is the fix:
            previously this was plain text/icons with no way to get to the other
            person's (or group members') profile from inside a chat. */}
        {conversation.isGroup ? (
          <button
            onClick={() => setShowMembers(true)}
            className="flex min-w-0 flex-1 items-center gap-3 rounded-aurora-sm py-1 text-left transition-aurora hover:bg-aurora-card"
          >
            <div className="flex flex-shrink-0 -space-x-3">
              {conversation.participants.slice(0, 3).map((p) => (
                <Avatar key={p._id} src={p.avatarUrl} name={p.name} size={36} className="border-2 border-aurora-bg" />
              ))}
              {conversation.participants.length === 0 && (
                <div className="flex h-9 w-9 items-center justify-center rounded-full bg-aurora-gradient text-white">
                  <Users size={16} />
                </div>
              )}
            </div>
            <div className="min-w-0">
              <div className="truncate text-sm font-semibold text-aurora-text">{conversation.groupName}</div>
              <div className="truncate text-xs text-aurora-text-muted">
                {conversation.participants.length + 1} members · tap to view
              </div>
            </div>
          </button>
        ) : (
          <Link
            to={`/profile/${other?.username}`}
            className="flex min-w-0 flex-1 items-center gap-3 rounded-aurora-sm py-1 transition-aurora hover:bg-aurora-card"
          >
            <div className="relative flex-shrink-0">
              <Avatar src={other?.avatarUrl} name={other?.name} size={36} />
              {online && (
                <span className="absolute bottom-0 right-0 h-2.5 w-2.5 rounded-full border-2 border-aurora-bg bg-green-400" />
              )}
            </div>
            <div className="min-w-0">
              {/* Full name is never truncated by CSS here — this container has its own
                  min-w-0 so it can shrink, but the name itself gets the space it needs. */}
              <div className="flex items-center gap-1.5 truncate text-sm font-semibold text-aurora-text">
                <span className="truncate">{other?.name}</span>
                {conversation.mutedByMe && <BellOff size={12} className="flex-shrink-0 text-aurora-text-muted" />}
              </div>
              <div className="truncate text-xs text-aurora-text-muted">
                {blockedEitherWay ? 'Blocked' : online ? 'Online' : lastSeenLabel(lastSeen)}
              </div>
            </div>
          </Link>
        )}

        {!conversation.isGroup && (
          <div className="flex flex-shrink-0 items-center gap-3 text-aurora-text-muted">
            <button
              onClick={() => startCall(other, 'voice')}
              disabled={blockedEitherWay || callState !== 'idle'}
              aria-label="Voice call"
              className="transition-aurora hover:text-aurora-violet disabled:opacity-30 disabled:hover:text-aurora-text-muted"
            >
              <Phone size={18} />
            </button>
            <button
              onClick={() => startCall(other, 'video')}
              disabled={blockedEitherWay || callState !== 'idle'}
              aria-label="Video call"
              className="transition-aurora hover:text-aurora-violet disabled:opacity-30 disabled:hover:text-aurora-text-muted"
            >
              <Video size={18} />
            </button>
          </div>
        )}
        <button
          onClick={() => setShowOptions(true)}
          aria-label="More options"
          className="flex-shrink-0 text-aurora-text-muted hover:text-aurora-text"
        >
          <MoreVertical size={18} />
        </button>
      </div>

      {showSearch && (
        <div className="flex items-center gap-2 border-b border-aurora-border bg-aurora-bg px-4 py-2">
          <Search size={16} className="flex-shrink-0 text-aurora-text-muted" />
          <input
            autoFocus
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Search in this chat…"
            className="min-w-0 flex-1 bg-transparent text-sm text-aurora-text outline-none placeholder:text-aurora-text-muted"
          />
          {searchQuery && (
            <span className="flex-shrink-0 text-xs text-aurora-text-muted">
              {matches.length ? `${matchIndex + 1}/${matches.length}` : '0/0'}
            </span>
          )}
          <button
            aria-label="Previous match"
            disabled={!matches.length}
            onClick={() => setMatchIndex((i) => (i - 1 + matches.length) % matches.length)}
            className="flex-shrink-0 text-aurora-text-muted hover:text-aurora-text disabled:opacity-30"
          >
            <ChevronUp size={16} />
          </button>
          <button
            aria-label="Next match"
            disabled={!matches.length}
            onClick={() => setMatchIndex((i) => (i + 1) % matches.length)}
            className="flex-shrink-0 text-aurora-text-muted hover:text-aurora-text disabled:opacity-30"
          >
            <ChevronDown size={16} />
          </button>
          <button aria-label="Close search" onClick={closeSearch} className="flex-shrink-0 text-aurora-text-muted hover:text-aurora-text">
            <X size={16} />
          </button>
        </div>
      )}

      {blockedEitherWay && (
        <div className="flex items-center gap-2 border-b border-aurora-border bg-aurora-like/10 px-4 py-2 text-xs text-aurora-like">
          <Ban size={14} className="flex-shrink-0" />
          {conversation.iBlockedThem
            ? `You blocked ${other?.name}. Unblock them from chat options to message again.`
            : `You can't reply — this conversation isn't accepting new messages.`}
        </div>
      )}

      <div className="min-h-0 flex-1 space-y-2 overflow-y-auto px-4 py-4">
        {loading ? (
          <div className="flex h-full items-center justify-center">
            <div className="h-7 w-7 animate-spin rounded-full border-2 border-aurora-border border-t-aurora-violet" />
          </div>
        ) : (
          messages.map((msg, i) => {
            const isOwn = msg.sender._id === user._id;
            // In a group, show the sender's name/avatar whenever it changes from the
            // previous message, so it's always clear whose message you're reading.
            const showSenderIdentity =
              conversation.isGroup && !isOwn && (i === 0 || messages[i - 1].sender._id !== msg.sender._id);
            const isMatch = showSearch && searchQuery.trim() && matches[matchIndex]?._id === msg._id;
            return (
              <div key={msg._id} ref={(el) => (messageRefs.current[msg._id] = el)}>
                <MessageBubble
                  message={msg}
                  isOwn={isOwn}
                  myId={user._id}
                  showSenderIdentity={showSenderIdentity}
                  isGroup={conversation.isGroup}
                  gradient={gradient}
                  highlighted={isMatch || jumpHighlight === msg._id}
                  onMediaClick={setViewerMedia}
                  onReply={setReplyingTo}
                  onEdit={setEditingMessage}
                  onForward={setForwardingMessage}
                  onJumpTo={jumpToMessage}
                />
              </div>
            );
          })
        )}
        {typingUser && <div className="text-xs italic text-aurora-text-muted">{other?.name} is typing…</div>}
        <div ref={bottomRef} />
      </div>

      <MessageComposer
        conversationId={conversation._id}
        onSent={(msg) => setMessages((prev) => (prev.some((m) => m._id === msg._id) ? prev : [...prev, msg]))}
        onEdited={(updated) => setMessages((prev) => prev.map((m) => (m._id === updated._id ? { ...m, ...updated } : m)))}
        disabled={blockedEitherWay}
        disabledMessage={
          conversation.iBlockedThem
            ? `You blocked ${other?.name}. Unblock them to send a message.`
            : "You can't send messages in this conversation."
        }
        replyingTo={replyingTo}
        onCancelReply={() => setReplyingTo(null)}
        editingMessage={editingMessage}
        onCancelEdit={() => setEditingMessage(null)}
      />

      {showMembers && (
        <GroupMembersModal
          conversation={conversation}
          onClose={() => setShowMembers(false)}
          onUpdate={onConversationUpdate}
        />
      )}

      {showOptions && (
        <ChatOptionsModal
          conversation={conversation}
          onClose={() => setShowOptions(false)}
          onOpenSearch={() => setShowSearch(true)}
          onUpdate={(patch) => {
            onConversationUpdate?.(patch);
            if (patch.clearedAt) setMessages([]);
          }}
          onDeleted={onDeleted}
        />
      )}

      {viewerMedia && <MediaViewer media={viewerMedia} onClose={() => setViewerMedia(null)} />}
      {forwardingMessage && (
        <ForwardMessageModal message={forwardingMessage} onClose={() => setForwardingMessage(null)} />
      )}
    </div>
  );
}
