import { useState } from 'react';
import api from '../services/api';

export default function FollowButton({ username, initialIsFollowing, onChange, compact = false }) {
  const [isFollowing, setIsFollowing] = useState(initialIsFollowing);
  const [busy, setBusy] = useState(false);

  const toggle = async () => {
    setBusy(true);
    try {
      if (isFollowing) {
        await api.post(`/users/${username}/unfollow`);
        setIsFollowing(false);
        onChange?.(false);
      } else {
        await api.post(`/users/${username}/follow`);
        setIsFollowing(true);
        onChange?.(true);
      }
    } catch (err) {
      console.error('[FollowButton]', err.response?.data?.message);
    } finally {
      setBusy(false);
    }
  };

  return (
    <button
      onClick={toggle}
      disabled={busy}
      className={`flex-shrink-0 rounded-full font-semibold transition-aurora disabled:opacity-60 ${
        compact ? 'px-3 py-1 text-xs' : 'px-4 py-1.5 text-sm'
      } ${
        isFollowing
          ? 'border border-aurora-border text-aurora-text hover:border-aurora-like hover:text-aurora-like'
          : 'bg-aurora-gradient text-white hover:opacity-90'
      }`}
    >
      {isFollowing ? 'Following' : 'Follow'}
    </button>
  );
}
