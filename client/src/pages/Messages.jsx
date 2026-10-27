import { useEffect, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { SquarePen, PhoneCall } from 'lucide-react';
import api from '../services/api';
import { getSocket } from '../services/socket';
import MainLayout from '../layouts/MainLayout';
import ChatList from '../components/ChatList';
import ChatWindow from '../components/ChatWindow';
import NewConversationModal from '../components/NewConversationModal';
import CallHistoryModal from '../components/CallHistoryModal';

export default function Messages() {
  const { conversationId } = useParams();
  const navigate = useNavigate();
  const [conversations, setConversations] = useState([]);
  const [active, setActive] = useState(null);
  const [loading, setLoading] = useState(true);
  const [creating, setCreating] = useState(false);
  const [showCallHistory, setShowCallHistory] = useState(false);

  const load = async () => {
    const { data } = await api.get('/conversations');
    setConversations(data.conversations);
    setLoading(false);
  };

  useEffect(() => {
    load();
  }, []);

  // Previously, opening a chat only ever changed local state (`active`), never the URL.
  // That meant the browser/OS back button (and swipe-back gesture on mobile) didn't close
  // the chat — it left /messages entirely — and refreshing or sharing a link always landed
  // back on the empty list. Now the open conversation lives at /messages/:conversationId,
  // so this effect keeps `active` in sync whenever the URL (and thus browser history) changes.
  useEffect(() => {
    if (!conversationId) {
      setActive(null);
      return;
    }
    const match = conversations.find((c) => c._id === conversationId);
    if (match) setActive(match);
  }, [conversationId, conversations]);

  const openConversation = (convo) => {
    setActive(convo);
    navigate(`/messages/${convo._id}`);
  };

  const closeConversation = () => {
    setActive(null);
    navigate('/messages');
  };

  useEffect(() => {
    const socket = getSocket();
    const bumpConversation = (msg) => {
      setConversations((prev) => {
        const idx = prev.findIndex((c) => c._id === msg.conversation);
        if (idx === -1) return prev;
        const updated = { ...prev[idx], lastMessage: { text: msg.text || `Sent a ${msg.type}`, sender: msg.sender._id, sentAt: msg.createdAt } };
        const rest = prev.filter((_, i) => i !== idx);
        return [updated, ...rest];
      });
    };
    // Fired when a community is deleted — its chat disappears from every member's list live,
    // not just for whoever clicked delete.
    const handleRemoved = ({ conversationId }) => {
      setConversations((prev) => prev.filter((c) => c._id !== conversationId));
      setActive((prev) => {
        if (prev?._id !== conversationId) return prev;
        navigate('/messages');
        return null;
      });
    };
    // Fired when someone else creates a group with you in it, or adds you to an existing
    // one. Without this the new group only showed up after a manual refresh, which makes
    // a brand-new group chat look broken to everyone except the person who made it.
    const handleAdded = ({ conversation }) => {
      setConversations((prev) => (prev.some((c) => c._id === conversation._id) ? prev : [conversation, ...prev]));
    };

    socket?.on('message:new', bumpConversation);
    socket?.on('conversation:removed', handleRemoved);
    socket?.on('conversation:new', handleAdded);
    return () => {
      socket?.off('message:new', bumpConversation);
      socket?.off('conversation:removed', handleRemoved);
      socket?.off('conversation:new', handleAdded);
    };
  }, [navigate]);

  const handleDeleted = (conversationId) => {
    setConversations((prev) => prev.filter((c) => c._id !== conversationId));
    closeConversation();
  };

  const handleStarted = (convo) => {
    setConversations((prev) => (prev.some((c) => c._id === convo._id) ? prev : [convo, ...prev]));
    openConversation(convo);
    setCreating(false);
  };

  return (
    // With a conversation open on a phone this is a full-screen chat screen with its own
    // back button in the header, so the bottom tab bar comes off — that gives the composer
    // the full height instead of squeezing it between the message list and a nav bar the
    // user can't reach past the on-screen keyboard anyway. On the conversation LIST the
    // tab bar stays, since that's a normal browsing screen.
    <MainLayout fullBleed hideMobileNav={!!active}>
      <div className="grid h-full min-h-0 grid-cols-1 lg:grid-cols-[minmax(260px,320px)_1fr]">
        {/*
          Root cause of the "chat won't scroll, header/composer stay pinned, other
          panel peeks through" bug: a CSS grid item's default min-height/min-width
          is `auto`, meaning it refuses to shrink below its content size no matter
          what the track is sized to. With unbounded message history that content
          size grows without limit, the grid quietly grows past the viewport
          instead of clipping/scrolling internally ("grid blowout") — and whatever
          didn't fit just got clipped by the outer overflow-hidden, which is why
          the list column looked half-eaten in the screenshot. `min-h-0`/`min-w-0`
          on every level between here and the scrollable pane closes that hole.
        */}
        <div className={`flex min-h-0 min-w-0 flex-col border-r border-aurora-border ${active ? 'hidden lg:flex' : ''}`}>
          <div className="flex items-center justify-between px-4 py-3">
            <h1 className="text-lg font-bold text-aurora-text">Messages</h1>
            <div className="flex items-center gap-3">
              <button
                onClick={() => setShowCallHistory(true)}
                aria-label="Call history"
                className="text-aurora-text-muted transition-aurora hover:text-aurora-violet"
              >
                <PhoneCall size={19} />
              </button>
              <button onClick={() => setCreating(true)} aria-label="New message" className="text-aurora-violet">
                <SquarePen size={20} />
              </button>
            </div>
          </div>
          <div className="min-h-0 flex-1 overflow-y-auto px-2 pb-4">
            {loading ? (
              <div className="flex h-32 items-center justify-center">
                <div className="h-6 w-6 animate-spin rounded-full border-2 border-aurora-border border-t-aurora-violet" />
              </div>
            ) : conversations.length === 0 ? (
              <p className="px-3 py-6 text-center text-sm text-aurora-text-muted">
                No conversations yet — tap the pencil to message someone.
              </p>
            ) : (
              <ChatList conversations={conversations} activeId={active?._id} onSelect={openConversation} />
            )}
          </div>
        </div>

        <div className={`min-h-0 min-w-0 ${active ? 'flex flex-col' : 'hidden lg:flex lg:items-center lg:justify-center'}`}>
          {active ? (
            <ChatWindow
              conversation={active}
              onBack={closeConversation}
              onDeleted={handleDeleted}
              onConversationUpdate={(patch) => {
                setActive((prev) => (prev ? { ...prev, ...patch } : prev));
                setConversations((prev) => prev.map((c) => (c._id === active._id ? { ...c, ...patch } : c)));
              }}
            />
          ) : (
            <p className="text-sm text-aurora-text-muted">Select a conversation to start chatting</p>
          )}
        </div>
      </div>

      {creating && <NewConversationModal onClose={() => setCreating(false)} onStarted={handleStarted} />}
      {showCallHistory && <CallHistoryModal onClose={() => setShowCallHistory(false)} />}
    </MainLayout>
  );
}
