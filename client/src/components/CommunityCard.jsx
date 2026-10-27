import { Link } from 'react-router-dom';
import { Users, Lock } from 'lucide-react';
import api from '../services/api';

export default function CommunityCard({ community, onJoined }) {
  const join = async (e) => {
    e.preventDefault();
    e.stopPropagation();
    try {
      await api.post(`/communities/${community._id}/join`);
      onJoined?.(community._id);
    } catch (err) {
      console.error('[CommunityCard join]', err.response?.data?.message);
    }
  };

  return (
    <Link
      to={`/community/${community.slug}`}
      className="group overflow-hidden rounded-aurora-lg border border-aurora-border bg-aurora-card transition-aurora hover:border-aurora-violet"
    >
      <div
        className="h-20 w-full bg-aurora-gradient bg-cover bg-center"
        style={community.cover ? { backgroundImage: `url(${community.cover.url})` } : undefined}
      />
      <div className="-mt-6 px-4">
        <div className="flex h-12 w-12 items-center justify-center rounded-2xl border-4 border-aurora-card bg-aurora-bg text-2xl">
          {community.avatar ? (
            <img src={community.avatar.url} alt="" className="h-full w-full rounded-2xl object-cover" />
          ) : (
            community.icon
          )}
        </div>
      </div>

      <div className="p-4 pt-2">
        <div className="flex items-center gap-1.5">
          <h3 className="truncate font-semibold text-aurora-text group-hover:text-aurora-violet">{community.name}</h3>
          {community.privacy === 'private' && <Lock size={12} className="flex-shrink-0 text-aurora-text-muted" />}
        </div>
        <p className="mt-1 line-clamp-2 text-xs text-aurora-text-muted">{community.description || 'No description yet.'}</p>

        <div className="mt-3 flex items-center justify-between">
          <span className="flex items-center gap-1 text-xs text-aurora-text-muted">
            <Users size={13} /> {community.memberCount} {community.memberCount === 1 ? 'member' : 'members'}
          </span>
          {community.isMember ? (
            <span className="rounded-full border border-aurora-border px-3 py-1 text-xs font-medium text-aurora-text-muted">
              Joined
            </span>
          ) : (
            <button
              onClick={join}
              className="rounded-full bg-aurora-gradient px-3 py-1 text-xs font-semibold text-white transition-aurora hover:opacity-90"
            >
              Join
            </button>
          )}
        </div>
      </div>
    </Link>
  );
}
