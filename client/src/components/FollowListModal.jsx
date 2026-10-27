import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { X } from 'lucide-react';
import api from '../services/api';
import Avatar from './Avatar';
import FollowButton from './FollowButton';

// Combined followers/following list with a tab switcher. Mirrors FriendsListModal's
// look, but each row can independently follow/unfollow since these are separate,
// asymmetric relationships (unlike friends).
export default function FollowListModal({ username, initialTab = 'followers', onClose, onCountsChange }) {
  const [tab, setTab] = useState(initialTab);
  const [followers, setFollowers] = useState(null);
  const [following, setFollowing] = useState(null);

  useEffect(() => {
    let cancelled = false;
    const endpoint = tab === 'followers' ? 'followers' : 'following';
    const alreadyLoaded = tab === 'followers' ? followers : following;

    if (alreadyLoaded) return;

    api
      .get(`/users/${username}/${endpoint}`)
      .then(({ data }) => {
        if (cancelled) return;
        if (tab === 'followers') setFollowers(data.followers);
        else setFollowing(data.following);
      })
      .catch((err) => {
        if (cancelled) return;
        console.error('[FollowListModal]', err.response?.data?.message);
        // Fall back to an empty list rather than leaving the tab stuck on a spinner forever.
        if (tab === 'followers') setFollowers([]);
        else setFollowing([]);
      });

    return () => {
      cancelled = true;
    };
  }, [tab, username]); // eslint-disable-line react-hooks/exhaustive-deps

  const list = tab === 'followers' ? followers : following;
  // Deriving loading from the list itself (rather than a separate state variable) means
  // it can never fall out of sync with which tab is actually selected.
  const loading = list === null;

  const handleFollowChange = (userId, isNowFollowing) => {
    onCountsChange?.(tab, isNowFollowing);
    // Keep the "following" list itself in sync — an unfollow there should drop the row.
    if (tab === 'following' && !isNowFollowing) {
      setFollowing((prev) => prev.filter((u) => u._id !== userId));
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 px-4">
      <div className="w-full max-w-sm rounded-aurora-lg border border-aurora-border bg-aurora-card p-5">
        <div className="mb-4 flex items-center justify-between">
          <div className="flex gap-1 rounded-full bg-aurora-bg p-1">
            <button
              onClick={() => setTab('followers')}
              className={
                tab === 'followers'
                  ? 'rounded-full bg-aurora-gradient px-3 py-1 text-sm font-semibold text-white'
                  : 'rounded-full px-3 py-1 text-sm font-medium text-aurora-text-muted transition-aurora hover:text-aurora-text'
              }
            >
              Followers
            </button>
            <button
              onClick={() => setTab('following')}
              className={
                tab === 'following'
                  ? 'rounded-full bg-aurora-gradient px-3 py-1 text-sm font-semibold text-white'
                  : 'rounded-full px-3 py-1 text-sm font-medium text-aurora-text-muted transition-aurora hover:text-aurora-text'
              }
            >
              Following
            </button>
          </div>
          <button onClick={onClose} aria-label="Close" className="text-aurora-text-muted hover:text-aurora-text">
            <X size={20} />
          </button>
        </div>

        <div className="max-h-96 space-y-1 overflow-y-auto">
          {loading ? (
            <div className="flex h-24 items-center justify-center">
              <div className="h-6 w-6 animate-spin rounded-full border-2 border-aurora-border border-t-aurora-violet" />
            </div>
          ) : list.length === 0 ? (
            <p className="py-6 text-center text-sm text-aurora-text-muted">
              {tab === 'followers' ? 'No followers yet.' : 'Not following anyone yet.'}
            </p>
          ) : (
            list.map((u) => (
              <div key={u._id} className="flex items-center gap-3 rounded-aurora-sm px-2 py-2 hover:bg-aurora-bg">
                <Link to={`/profile/${u.username}`} onClick={onClose} className="flex flex-1 items-center gap-3 min-w-0">
                  <div className="relative flex-shrink-0">
                    <Avatar src={u.avatarUrl} name={u.name} size={40} />
                    {u.isOnline && (
                      <span className="absolute bottom-0 right-0 h-2.5 w-2.5 rounded-full border-2 border-aurora-card bg-green-400" />
                    )}
                  </div>
                  <div className="min-w-0">
                    <p className="truncate text-sm font-medium text-aurora-text">{u.name}</p>
                    <p className="truncate text-xs text-aurora-text-muted">@{u.username}</p>
                  </div>
                </Link>
                {!u.isViewer && (
                  <FollowButton
                    username={u.username}
                    initialIsFollowing={u.isFollowedByViewer}
                    onChange={(isNowFollowing) => handleFollowChange(u._id, isNowFollowing)}
                  />
                )}
              </div>
            ))
          )}
        </div>
      </div>
    </div>
  );
}
