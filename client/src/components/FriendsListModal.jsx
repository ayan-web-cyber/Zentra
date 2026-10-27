import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { X, UserMinus } from 'lucide-react';
import api from '../services/api';
import Avatar from './Avatar';
import { confirmDialog } from '../utils/confirm';

export default function FriendsListModal({ username, isOwnProfile, onClose, onFriendRemoved }) {
  const [friends, setFriends] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    api.get(`/users/${username}/friends`).then(({ data }) => {
      setFriends(data.friends);
      setLoading(false);
    });
  }, [username]);

  const unfriend = async (friend) => {
    if (!(await confirmDialog(`Remove ${friend.name} from your friends?`, { danger: true, confirmLabel: 'Remove' }))) return;
    try {
      await api.delete(`/friends/${friend.username}`);
      setFriends((prev) => prev.filter((f) => f._id !== friend._id));
      onFriendRemoved?.();
    } catch (err) {
      console.error(err.response?.data?.message);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 px-4">
      <div className="w-full max-w-sm rounded-aurora-lg border border-aurora-border bg-aurora-card p-5">
        <div className="mb-4 flex items-center justify-between">
          <h2 className="text-lg font-bold text-aurora-text">Friends</h2>
          <button onClick={onClose} aria-label="Close" className="text-aurora-text-muted hover:text-aurora-text">
            <X size={20} />
          </button>
        </div>

        <div className="max-h-96 space-y-1 overflow-y-auto">
          {loading ? (
            <div className="flex h-24 items-center justify-center">
              <div className="h-6 w-6 animate-spin rounded-full border-2 border-aurora-border border-t-aurora-violet" />
            </div>
          ) : friends.length === 0 ? (
            <p className="py-6 text-center text-sm text-aurora-text-muted">No friends yet.</p>
          ) : (
            friends.map((f) => (
              <div key={f._id} className="flex items-center gap-3 rounded-aurora-sm px-2 py-2 hover:bg-aurora-bg">
                <Link to={`/profile/${f.username}`} onClick={onClose} className="flex flex-1 items-center gap-3 min-w-0">
                  <div className="relative flex-shrink-0">
                    <Avatar src={f.avatarUrl} name={f.name} size={40} />
                    {f.isOnline && (
                      <span className="absolute bottom-0 right-0 h-2.5 w-2.5 rounded-full border-2 border-aurora-card bg-green-400" />
                    )}
                  </div>
                  <div className="min-w-0">
                    <p className="truncate text-sm font-medium text-aurora-text">{f.name}</p>
                    <p className="truncate text-xs text-aurora-text-muted">@{f.username}</p>
                  </div>
                </Link>
                {isOwnProfile && (
                  <button
                    onClick={() => unfriend(f)}
                    aria-label={`Unfriend ${f.name}`}
                    className="flex-shrink-0 text-aurora-text-muted transition-aurora hover:text-aurora-like"
                  >
                    <UserMinus size={16} />
                  </button>
                )}
              </div>
            ))
          )}
        </div>
      </div>
    </div>
  );
}
