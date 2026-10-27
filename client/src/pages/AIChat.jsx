import { useCallback, useEffect, useRef, useState } from 'react';
import {
  Sparkles,
  Send,
  Trash2,
  Plus,
  MessageSquare,
  PanelLeft,
  MoreVertical,
  Pencil,
  Check,
  X,
} from 'lucide-react';
import api from '../services/api';
import MainLayout from '../layouts/MainLayout';
import { confirmDialog } from '../utils/confirm';

// Section 38 — general-purpose "ask anything" chat, distinct from the narrow AI Assist
// tools (caption/rewrite/translate) that live inside PostComposer. Backed by the same
// provider-agnostic seam in server/services/aiService.js, so this page doesn't know or
// care whether AI_PROVIDER is anthropic or groq — only whether it's configured at all.
//
// A user has MANY named threads, listed in the history panel on the left. Three rules drive
// most of the state handling below:
//   1. "New chat" creates nothing on the server — it just sets activeId to null. The thread
//      is created by the first send (POST .../chats/new/messages). No empty rows in history.
//   2. Every mutating response returns the canonical conversation summary, which gets
//      upserted into `conversations` — so a thread's auto-generated title and its position
//      in the list update without a second round trip to refetch the list.
//   3. Titles come from the model on the first exchange and are then editable inline.

// Compact relative time for the history list — "2h", "3d" — so long titles get the room
// instead of a full timestamp.
function shortAgo(date) {
  if (!date) return '';
  const secs = Math.max(0, (Date.now() - new Date(date).getTime()) / 1000);
  if (secs < 60) return 'now';
  if (secs < 3600) return `${Math.floor(secs / 60)}m`;
  if (secs < 86400) return `${Math.floor(secs / 3600)}h`;
  if (secs < 604800) return `${Math.floor(secs / 86400)}d`;
  return new Date(date).toLocaleDateString(undefined, { month: 'short', day: 'numeric' });
}

export default function AIChat() {
  const [configured, setConfigured] = useState(null); // null = not checked yet
  const [conversations, setConversations] = useState([]);
  const [activeId, setActiveId] = useState(null); // null = unsaved new chat
  const [messages, setMessages] = useState([]);

  const [booting, setBooting] = useState(true);
  const [loadingThread, setLoadingThread] = useState(false);
  const [input, setInput] = useState('');
  const [sending, setSending] = useState(false);
  const [error, setError] = useState('');

  const [drawerOpen, setDrawerOpen] = useState(false); // history panel on mobile
  const [menuId, setMenuId] = useState(null); // which row's ⋮ menu is open
  const [renamingId, setRenamingId] = useState(null);
  const [renameValue, setRenameValue] = useState('');

  const bottomRef = useRef(null);
  const inputRef = useRef(null);
  const renameRef = useRef(null);

  const activeConvo = conversations.find((c) => c._id === activeId) || null;

  // Keeps the list sorted the way the server sorts it (most recent activity first) so an
  // optimistic local update can't briefly disagree with what a refetch would return.
  const upsertConversation = useCallback((summary) => {
    setConversations((prev) => {
      const next = [summary, ...prev.filter((c) => c._id !== summary._id)];
      return next.sort((a, b) => new Date(b.lastMessageAt) - new Date(a.lastMessageAt));
    });
  }, []);

  useEffect(() => {
    (async () => {
      try {
        const { data } = await api.get('/ai/status');
        setConfigured(data.configured);
        if (data.configured) {
          const listRes = await api.get('/ai/chats');
          const list = listRes.data.conversations || [];
          setConversations(list);
          // Reopen the most recent thread rather than dropping the user into a blank one —
          // this page used to be a single continuous conversation, and landing back where
          // you left off matches that expectation.
          if (list.length > 0) {
            setActiveId(list[0]._id);
            const threadRes = await api.get(`/ai/chats/${list[0]._id}`);
            setMessages(threadRes.data.messages || []);
          }
        }
      } catch {
        setConfigured(false);
      } finally {
        setBooting(false);
      }
    })();
  }, []);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages, sending]);

  useEffect(() => {
    if (renamingId) renameRef.current?.select();
  }, [renamingId]);

  // Any click outside a row menu closes it. Registered once rather than per-row so there's
  // no chance of a stale listener surviving a list re-render.
  useEffect(() => {
    if (!menuId) return undefined;
    const close = () => setMenuId(null);
    const onKeyDown = (e) => e.key === 'Escape' && close();
    window.addEventListener('click', close);
    window.addEventListener('keydown', onKeyDown);
    return () => {
      window.removeEventListener('click', close);
      window.removeEventListener('keydown', onKeyDown);
    };
  }, [menuId]);

  const openChat = async (id) => {
    setDrawerOpen(false);
    setMenuId(null);
    if (id === activeId) return;
    setError('');
    setActiveId(id);
    setMessages([]);
    setLoadingThread(true);
    try {
      const { data } = await api.get(`/ai/chats/${id}`);
      setMessages(data.messages || []);
      if (data.conversation) upsertConversation(data.conversation);
    } catch {
      setError('Could not open that chat.');
    } finally {
      setLoadingThread(false);
    }
  };

  // Purely local — see note (1) at the top of this file.
  const newChat = () => {
    setActiveId(null);
    setMessages([]);
    setInput('');
    setError('');
    setDrawerOpen(false);
    setMenuId(null);
    inputRef.current?.focus();
  };

  const send = async (e) => {
    e.preventDefault();
    const text = input.trim();
    if (!text || sending) return;

    setError('');
    setInput('');
    // Optimistic: show the user's message immediately, then replace the whole list with
    // server state once the reply lands (the response carries the canonical history).
    setMessages((prev) => [...prev, { role: 'user', content: text, createdAt: new Date().toISOString() }]);
    setSending(true);
    try {
      const { data } = await api.post(`/ai/chats/${activeId || 'new'}/messages`, { message: text });
      setMessages(data.messages);
      if (data.conversation) {
        // On the first send of a new thread this is where activeId stops being null and the
        // model-generated title appears in the history list — no refetch needed.
        setActiveId(data.conversation._id);
        upsertConversation(data.conversation);
      }
    } catch (err) {
      setError(err.response?.data?.message || "Couldn't get a response. Please try again.");
      // Roll back the optimistic bubble so the conversation doesn't show an unanswered
      // question sitting next to an error banner — the text goes back in the composer.
      setMessages((prev) => prev.slice(0, -1));
      setInput(text);
    } finally {
      setSending(false);
    }
  };

  const startRename = (convo) => {
    setMenuId(null);
    setRenamingId(convo._id);
    setRenameValue(convo.title);
  };

  const submitRename = async (id) => {
    const title = renameValue.trim();
    setRenamingId(null);
    if (!title) return;
    const previous = conversations.find((c) => c._id === id);
    if (!previous || previous.title === title) return;

    // Optimistic — a rename is instant and cheap to undo if the request fails.
    setConversations((prev) => prev.map((c) => (c._id === id ? { ...c, title } : c)));
    try {
      const { data } = await api.patch(`/ai/chats/${id}`, { title });
      if (data.conversation) upsertConversation(data.conversation);
    } catch {
      setConversations((prev) => prev.map((c) => (c._id === id ? previous : c)));
      setError('Could not rename that chat.');
    }
  };

  const deleteChat = async (id) => {
    setMenuId(null);
    if (!(await confirmDialog('Delete this chat? This cannot be undone.', { danger: true, confirmLabel: 'Delete' }))) return;
    try {
      await api.delete(`/ai/chats/${id}`);
      setConversations((prev) => prev.filter((c) => c._id !== id));
      if (id === activeId) {
        setActiveId(null);
        setMessages([]);
      }
    } catch {
      setError('Could not delete that chat.');
    }
  };

  const deleteAll = async () => {
    if (!(await confirmDialog('Delete every AI chat in your history? This cannot be undone.', { danger: true, confirmLabel: 'Delete all' }))) return;
    try {
      await api.delete('/ai/chats');
      setConversations([]);
      setActiveId(null);
      setMessages([]);
      setDrawerOpen(false);
    } catch {
      setError('Could not clear your chat history.');
    }
  };

  // --- History panel (shared by the desktop column and the mobile drawer) ---
  const historyPanel = (
    <div className="flex h-full min-h-0 flex-col">
      <div className="p-3">
        <button
          onClick={newChat}
          className="flex w-full items-center justify-center gap-2 rounded-aurora-sm bg-aurora-gradient px-3 py-2.5 text-sm font-semibold text-white transition-aurora hover:opacity-90"
        >
          <Plus size={16} /> New chat
        </button>
      </div>

      <div className="min-h-0 flex-1 overflow-y-auto px-2 pb-2">
        {conversations.length === 0 ? (
          <p className="px-2 py-6 text-center text-xs text-aurora-text-muted">
            No saved chats yet. Ask something and this thread will be named and saved here
            automatically.
          </p>
        ) : (
          <ul className="flex flex-col gap-0.5">
            {conversations.map((c) => {
              const isActive = c._id === activeId;
              return (
                <li key={c._id} className="relative">
                  {renamingId === c._id ? (
                    <div className="flex items-center gap-1 px-1.5 py-1">
                      <input
                        ref={renameRef}
                        value={renameValue}
                        maxLength={80}
                        onChange={(e) => setRenameValue(e.target.value)}
                        onKeyDown={(e) => {
                          if (e.key === 'Enter') submitRename(c._id);
                          if (e.key === 'Escape') setRenamingId(null);
                        }}
                        aria-label="Chat name"
                        className="min-w-0 flex-1 rounded-aurora-sm border border-aurora-violet bg-aurora-bg px-2 py-1.5 text-sm text-aurora-text focus:outline-none"
                      />
                      <button
                        onClick={() => submitRename(c._id)}
                        aria-label="Save name"
                        className="flex h-7 w-7 flex-shrink-0 items-center justify-center rounded-full text-aurora-cyan hover:bg-aurora-bg"
                      >
                        <Check size={15} />
                      </button>
                      <button
                        onClick={() => setRenamingId(null)}
                        aria-label="Cancel rename"
                        className="flex h-7 w-7 flex-shrink-0 items-center justify-center rounded-full text-aurora-text-muted hover:bg-aurora-bg"
                      >
                        <X size={15} />
                      </button>
                    </div>
                  ) : (
                    <div
                      className={`group flex items-center gap-1 rounded-aurora-sm pr-1 transition-aurora ${
                        isActive ? 'bg-aurora-bg' : 'hover:bg-aurora-bg/60'
                      }`}
                    >
                      <button
                        onClick={() => openChat(c._id)}
                        aria-current={isActive ? 'true' : undefined}
                        className="min-w-0 flex-1 px-2.5 py-2 text-left"
                      >
                        <div className="flex items-center gap-2">
                          <MessageSquare
                            size={14}
                            className={`flex-shrink-0 ${isActive ? 'text-aurora-violet' : 'text-aurora-text-muted'}`}
                          />
                          <span
                            className={`truncate text-sm ${
                              isActive ? 'font-semibold text-aurora-text' : 'text-aurora-text'
                            }`}
                          >
                            {c.title}
                          </span>
                          <span className="ml-auto flex-shrink-0 text-[10px] text-aurora-text-muted">
                            {shortAgo(c.lastMessageAt)}
                          </span>
                        </div>
                        {c.preview && (
                          <p className="mt-0.5 truncate pl-6 text-xs text-aurora-text-muted">{c.preview}</p>
                        )}
                      </button>

                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          setMenuId(menuId === c._id ? null : c._id);
                        }}
                        aria-label={`Options for ${c.title}`}
                        aria-haspopup="menu"
                        aria-expanded={menuId === c._id}
                        className="flex h-7 w-7 flex-shrink-0 items-center justify-center rounded-full text-aurora-text-muted opacity-100 transition-aurora hover:bg-aurora-card focus:opacity-100 md:opacity-0 md:group-hover:opacity-100"
                      >
                        <MoreVertical size={15} />
                      </button>
                    </div>
                  )}

                  {menuId === c._id && (
                    <div
                      role="menu"
                      onClick={(e) => e.stopPropagation()}
                      className="absolute right-1 top-full z-20 mt-1 w-36 overflow-hidden rounded-aurora-sm border border-aurora-border bg-aurora-card shadow-aurora"
                    >
                      <button
                        role="menuitem"
                        onClick={() => startRename(c)}
                        className="flex w-full items-center gap-2 px-3 py-2 text-left text-xs text-aurora-text hover:bg-aurora-bg"
                      >
                        <Pencil size={13} /> Rename
                      </button>
                      <button
                        role="menuitem"
                        onClick={() => deleteChat(c._id)}
                        className="flex w-full items-center gap-2 px-3 py-2 text-left text-xs text-aurora-like hover:bg-aurora-bg"
                      >
                        <Trash2 size={13} /> Delete
                      </button>
                    </div>
                  )}
                </li>
              );
            })}
          </ul>
        )}
      </div>

      {conversations.length > 0 && (
        <div className="border-t border-aurora-border p-2">
          <button
            onClick={deleteAll}
            className="flex w-full items-center justify-center gap-1.5 rounded-aurora-sm px-2 py-2 text-xs text-aurora-text-muted transition-aurora hover:bg-aurora-bg hover:text-aurora-like"
          >
            <Trash2 size={13} /> Clear all history
          </button>
        </div>
      )}
    </div>
  );

  return (
    <MainLayout fullBleed>
      <div className="flex h-full min-h-0">
        {/* Desktop history column */}
        {configured !== false && (
          <aside className="hidden w-64 flex-shrink-0 border-r border-aurora-border lg:flex lg:flex-col">
            {historyPanel}
          </aside>
        )}

        {/* Mobile history drawer */}
        {drawerOpen && (
          <div className="fixed inset-0 z-50 lg:hidden">
            <button
              aria-label="Close chat history"
              onClick={() => setDrawerOpen(false)}
              className="absolute inset-0 bg-black/60 backdrop-blur-sm"
            />
            <div className="absolute inset-y-0 left-0 flex w-72 max-w-[85%] flex-col border-r border-aurora-border bg-aurora-card">
              <div className="flex items-center justify-between border-b border-aurora-border px-3 py-2.5">
                <span className="text-sm font-bold text-aurora-text">Chat history</span>
                <button
                  onClick={() => setDrawerOpen(false)}
                  aria-label="Close chat history"
                  className="flex h-8 w-8 items-center justify-center rounded-full text-aurora-text-muted hover:bg-aurora-bg"
                >
                  <X size={17} />
                </button>
              </div>
              {historyPanel}
            </div>
          </div>
        )}

        {/* Chat column */}
        <div className="flex min-w-0 flex-1 flex-col">
          <div className="flex items-center gap-2 border-b border-aurora-border px-3 py-3 lg:px-4">
            {configured !== false && (
              <button
                onClick={() => setDrawerOpen(true)}
                aria-label="Open chat history"
                className="flex h-9 w-9 flex-shrink-0 items-center justify-center rounded-full text-aurora-text-muted transition-aurora hover:bg-aurora-card lg:hidden"
              >
                <PanelLeft size={18} />
              </button>
            )}

            <div className="flex h-9 w-9 flex-shrink-0 items-center justify-center rounded-full bg-aurora-gradient text-white">
              <Sparkles size={17} />
            </div>

            <div className="min-w-0 flex-1">
              <h1 className="truncate text-base font-bold text-aurora-text">
                {activeConvo ? activeConvo.title : 'New chat'}
              </h1>
              <p className="truncate text-xs text-aurora-text-muted">
                Ask anything — not just about Zentra
              </p>
            </div>

            {activeConvo && (
              <button
                onClick={() => {
                  // On mobile the rename input lives inside the drawer, so open it too —
                  // otherwise the button would appear to do nothing on a phone.
                  if (window.innerWidth < 1024) setDrawerOpen(true);
                  startRename(activeConvo);
                }}
                aria-label="Rename this chat"
                className="flex h-9 w-9 flex-shrink-0 items-center justify-center rounded-full text-aurora-text-muted transition-aurora hover:bg-aurora-card hover:text-aurora-text"
              >
                <Pencil size={16} />
              </button>
            )}

            {configured !== false && (
              <button
                onClick={newChat}
                aria-label="Start a new chat"
                className="flex h-9 w-9 flex-shrink-0 items-center justify-center rounded-full text-aurora-text-muted transition-aurora hover:bg-aurora-card hover:text-aurora-text"
              >
                <Plus size={18} />
              </button>
            )}
          </div>

          <div className="min-h-0 flex-1 overflow-y-auto px-4 py-4">
            {booting || loadingThread ? (
              <div className="flex h-32 items-center justify-center">
                <div className="h-6 w-6 animate-spin rounded-full border-2 border-aurora-border border-t-aurora-violet" />
              </div>
            ) : configured === false ? (
              <div className="mx-auto max-w-sm py-16 text-center">
                <Sparkles size={28} className="mx-auto mb-3 text-aurora-text-muted" />
                <p className="text-sm font-medium text-aurora-text">AI Chat isn't set up on this server yet</p>
                <p className="mt-1.5 text-xs text-aurora-text-muted">
                  An admin needs to set <code className="rounded bg-aurora-card px-1 py-0.5">AI_PROVIDER</code> and
                  an API key in the server environment (Anthropic or the free Groq tier both work).
                </p>
              </div>
            ) : messages.length === 0 ? (
              <div className="mx-auto max-w-sm py-16 text-center">
                <Sparkles size={28} className="mx-auto mb-3 text-aurora-violet" />
                <p className="text-sm font-medium text-aurora-text">Ask me anything</p>
                <p className="mt-1.5 text-xs text-aurora-text-muted">
                  General knowledge, writing help, explanations, brainstorming — this isn't limited to
                  Zentra. This chat gets a name automatically once you send your first message.
                </p>
              </div>
            ) : (
              <div className="mx-auto flex max-w-2xl flex-col gap-3">
                {messages.map((m, i) => (
                  <div key={i} className={`flex ${m.role === 'user' ? 'justify-end' : 'justify-start'}`}>
                    <div
                      className={`max-w-[85%] whitespace-pre-wrap rounded-aurora-sm px-3.5 py-2.5 text-sm ${
                        m.role === 'user' ? 'bg-aurora-gradient text-white' : 'bg-aurora-card text-aurora-text'
                      }`}
                    >
                      {m.content}
                    </div>
                  </div>
                ))}
                {sending && (
                  <div className="flex justify-start">
                    <div className="flex items-center gap-1 rounded-aurora-sm bg-aurora-card px-3.5 py-2.5">
                      <span className="h-1.5 w-1.5 animate-bounce rounded-full bg-aurora-text-muted [animation-delay:-0.3s]" />
                      <span className="h-1.5 w-1.5 animate-bounce rounded-full bg-aurora-text-muted [animation-delay:-0.15s]" />
                      <span className="h-1.5 w-1.5 animate-bounce rounded-full bg-aurora-text-muted" />
                    </div>
                  </div>
                )}
                <div ref={bottomRef} />
              </div>
            )}
          </div>

          {error && <p className="px-4 pb-1 text-center text-xs text-aurora-like">{error}</p>}

          {configured !== false && (
            <form onSubmit={send} className="flex items-center gap-2 border-t border-aurora-border px-4 py-3">
              <input
                ref={inputRef}
                value={input}
                onChange={(e) => setInput(e.target.value)}
                placeholder={activeId ? 'Reply to the AI assistant...' : 'Start a new conversation...'}
                disabled={sending || booting}
                className="min-w-0 flex-1 rounded-aurora-sm border border-aurora-border bg-aurora-card px-3.5 py-2.5 text-sm text-aurora-text placeholder:text-aurora-text-muted focus:border-aurora-violet focus:outline-none"
              />
              <button
                type="submit"
                disabled={!input.trim() || sending || booting}
                aria-label="Send"
                className="flex h-10 w-10 flex-shrink-0 items-center justify-center rounded-full bg-aurora-gradient text-white transition-aurora disabled:opacity-40"
              >
                <Send size={16} />
              </button>
            </form>
          )}
        </div>
      </div>
    </MainLayout>
  );
}
