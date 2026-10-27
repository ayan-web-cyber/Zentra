import { useState } from 'react';
import { X, Search, BellOff, Bell, Palette, Trash2, Ban, ShieldCheck, Check, LogOut } from 'lucide-react';
import api from '../services/api';
import { CHAT_THEMES } from '../utils/chatThemes';
import { confirmDialog } from '../utils/confirm';

// Row wrapper shared by every action in this menu, so the list reads consistently.
function OptionRow({ icon, label, danger, onClick, disabled }) {
  return (
    <button
      onClick={onClick}
      disabled={disabled}
      className={`flex w-full items-center gap-3 rounded-aurora-sm px-3 py-2.5 text-left text-sm transition-aurora disabled:cursor-not-allowed disabled:opacity-50 ${
        danger ? 'text-aurora-like hover:bg-aurora-like/10' : 'text-aurora-text hover:bg-aurora-bg'
      }`}
    >
      {icon}
      {label}
    </button>
  );
}

export default function ChatOptionsModal({ conversation, onClose, onOpenSearch, onUpdate, onDeleted }) {
  const [busy, setBusy] = useState(false);
  const [showThemes, setShowThemes] = useState(false);
  const other = !conversation.isGroup ? conversation.participants[0] : null;
  const isBlocked = conversation.iBlockedThem;
  // A community's auto-created group chat: deleting it only hides it from this user's list
  // (see leaveConversation on the server) — it never removes their community membership.
  const isCommunityChat = Boolean(conversation.community);
  const isStandaloneGroup = conversation.isGroup && !isCommunityChat;

  const toggleMute = async () => {
    setBusy(true);
    try {
      const { data } = await api.post(`/conversations/${conversation._id}/mute`);
      onUpdate({ mutedByMe: data.mutedByMe });
    } catch (err) {
      console.error(err.response?.data?.message);
    }
    setBusy(false);
  };

  const pickTheme = async (theme) => {
    setBusy(true);
    try {
      await api.patch(`/conversations/${conversation._id}/theme`, { theme });
      onUpdate({ theme });
      setShowThemes(false);
    } catch (err) {
      console.error(err.response?.data?.message);
    }
    setBusy(false);
  };

  const clearChat = async () => {
    if (!(await confirmDialog('Clear this chat? Messages will be removed from your view only — the other person keeps theirs.', { danger: true, confirmLabel: 'Clear' }))) return;
    setBusy(true);
    try {
      await api.post(`/conversations/${conversation._id}/clear`);
      onUpdate({ clearedAt: new Date().toISOString() });
      onClose();
    } catch (err) {
      console.error(err.response?.data?.message);
      setBusy(false);
    }
  };

  const deleteChat = async () => {
    const confirmText = isStandaloneGroup
      ? "Leave this group? You'll stop receiving its messages, and other members can see you left."
      : isCommunityChat
        ? 'Delete this chat? It will be removed from your chat list. You’ll stay a member of the community, and can reopen the chat any time from the community page.'
        : 'Delete this chat? It will be removed from your chat list. The other person keeps theirs.';
    if (!(await confirmDialog(confirmText, { danger: true, confirmLabel: isStandaloneGroup ? 'Leave' : 'Delete' }))) return;
    setBusy(true);
    try {
      await api.post(`/conversations/${conversation._id}/leave`);
      onDeleted?.(conversation._id);
      onClose();
    } catch (err) {
      console.error(err.response?.data?.message);
      setBusy(false);
    }
  };

  const toggleBlock = async () => {
    if (!other) return;
    const verb = isBlocked ? 'unblock' : 'block';
    if (verb === 'block' && !(await confirmDialog(`Block ${other.name}? They won't be able to message or call you.`, { danger: true, confirmLabel: 'Block' }))) return;
    setBusy(true);
    try {
      await api.post(`/users/${other.username}/${verb}`);
      onUpdate({ iBlockedThem: !isBlocked });
      onClose();
    } catch (err) {
      console.error(err.response?.data?.message);
      setBusy(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 px-4">
      <div className="w-full max-w-xs rounded-aurora-lg border border-aurora-border bg-aurora-card p-4">
        <div className="mb-2 flex items-center justify-between">
          <h2 className="text-sm font-bold text-aurora-text">Chat options</h2>
          <button onClick={onClose} aria-label="Close" className="text-aurora-text-muted hover:text-aurora-text">
            <X size={18} />
          </button>
        </div>

        {!showThemes ? (
          <div className="space-y-0.5">
            <OptionRow
              icon={<Search size={16} />}
              label="Search in chat"
              onClick={() => {
                onOpenSearch();
                onClose();
              }}
            />
            <OptionRow
              icon={conversation.mutedByMe ? <Bell size={16} /> : <BellOff size={16} />}
              label={conversation.mutedByMe ? 'Unmute notifications' : 'Mute notifications'}
              onClick={toggleMute}
              disabled={busy}
            />
            <OptionRow
              icon={<Palette size={16} />}
              label="Chat theme"
              onClick={() => setShowThemes(true)}
              disabled={busy}
            />
            <OptionRow icon={<Trash2 size={16} />} label="Clear chat" onClick={clearChat} disabled={busy} danger />
            <OptionRow
              icon={isStandaloneGroup ? <LogOut size={16} /> : <Trash2 size={16} />}
              label={isStandaloneGroup ? 'Leave group' : 'Delete chat'}
              onClick={deleteChat}
              disabled={busy}
              danger
            />
            {other && (
              <OptionRow
                icon={isBlocked ? <ShieldCheck size={16} /> : <Ban size={16} />}
                label={isBlocked ? `Unblock ${other.name}` : `Block ${other.name}`}
                onClick={toggleBlock}
                disabled={busy}
                danger={!isBlocked}
              />
            )}
          </div>
        ) : (
          <div>
            <button
              onClick={() => setShowThemes(false)}
              className="mb-2 text-xs text-aurora-text-muted hover:text-aurora-text"
            >
              ← Back
            </button>
            <div className="grid grid-cols-2 gap-2">
              {Object.entries(CHAT_THEMES).map(([key, t]) => (
                <button
                  key={key}
                  onClick={() => pickTheme(key)}
                  disabled={busy}
                  className="flex flex-col items-center gap-1.5 rounded-aurora-sm border border-aurora-border p-2 transition-aurora hover:border-aurora-violet disabled:opacity-50"
                >
                  <div
                    className="relative h-9 w-full rounded-aurora-sm"
                    style={{ backgroundImage: t.gradient }}
                  >
                    {conversation.theme === key && (
                      <span className="absolute right-1 top-1 flex h-4 w-4 items-center justify-center rounded-full bg-black/40 text-white">
                        <Check size={10} />
                      </span>
                    )}
                  </div>
                  <span className="text-xs text-aurora-text-muted">{t.label}</span>
                </button>
              ))}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
