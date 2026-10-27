import { Users, BellOff } from 'lucide-react';
import Avatar from './Avatar';
import { useAuth } from '../context/AuthContext';

function timeAgo(dateStr) {
  if (!dateStr) return '';
  const seconds = Math.floor((Date.now() - new Date(dateStr)) / 1000);
  if (seconds < 60) return 'now';
  const minutes = Math.floor(seconds / 60);
  if (minutes < 60) return `${minutes}m`;
  const hours = Math.floor(minutes / 60);
  if (hours < 24) return `${hours}h`;
  return `${Math.floor(hours / 24)}d`;
}

export default function ChatList({ conversations, activeId, onSelect }) {
  const { user } = useAuth();

  const labelFor = (convo) => {
    if (convo.isGroup) return convo.groupName;
    return convo.participants[0]?.name || 'Unknown';
  };

  const avatarFor = (convo) => {
    if (convo.isGroup) {
      return (
        <div className="flex h-11 w-11 items-center justify-center rounded-full bg-aurora-gradient text-white">
          <Users size={18} />
        </div>
      );
    }
    return <Avatar src={convo.participants[0]?.avatarUrl} name={convo.participants[0]?.name} size={44} />;
  };

  const isOnline = (convo) => !convo.isGroup && convo.participants[0]?.isOnline;

  return (
    <div className="space-y-1">
      {conversations.map((convo) => {
        const isUnread =
          convo.lastMessage?.sender &&
          String(convo.lastMessage.sender) !== String(user?._id) &&
          !convo.lastMessage.readByMe;

        return (
          <button
            key={convo._id}
            onClick={() => onSelect(convo)}
            className={`flex w-full items-center gap-3 rounded-aurora-sm px-3 py-2.5 text-left transition-aurora ${
              activeId === convo._id ? 'bg-aurora-gradient' : 'hover:bg-aurora-card'
            }`}
          >
            <div className="relative">
              {avatarFor(convo)}
              {isOnline(convo) && (
                <span className="absolute bottom-0 right-0 h-3 w-3 rounded-full border-2 border-aurora-bg bg-green-400" />
              )}
            </div>
            <div className="min-w-0 flex-1">
              <div
                className={`flex items-center gap-1.5 truncate text-sm font-medium ${
                  activeId === convo._id ? 'text-white' : 'text-aurora-text'
                }`}
              >
                <span className="truncate">{labelFor(convo)}</span>
                {convo.mutedByMe && (
                  <BellOff
                    size={12}
                    className={`flex-shrink-0 ${activeId === convo._id ? 'text-white/70' : 'text-aurora-text-muted'}`}
                  />
                )}
              </div>
              <div
                className={`truncate text-xs ${activeId === convo._id ? 'text-white/80' : 'text-aurora-text-muted'}`}
              >
                {convo.lastMessage?.text || 'Say hello 👋'}
              </div>
            </div>
            {convo.lastMessage?.sentAt && (
              <span className={`text-xs ${activeId === convo._id ? 'text-white/70' : 'text-aurora-text-muted'}`}>
                {timeAgo(convo.lastMessage.sentAt)}
              </span>
            )}
          </button>
        );
      })}
    </div>
  );
}
