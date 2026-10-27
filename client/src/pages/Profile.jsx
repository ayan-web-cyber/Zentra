import { useEffect, useRef, useState } from 'react';
import { useParams } from 'react-router-dom';
import { Camera } from 'lucide-react';
import api from '../services/api';
import { useAuth } from '../context/AuthContext';
import MainLayout from '../layouts/MainLayout';
import Avatar from '../components/Avatar';
import FollowButton from '../components/FollowButton';
import AddFriendButton from '../components/AddFriendButton';
import FriendsListModal from '../components/FriendsListModal';
import FollowListModal from '../components/FollowListModal';
import EditProfileModal from '../components/EditProfileModal';
import PostCard from '../components/PostCard';

export default function Profile() {
  const { username } = useParams();
  const { user: me, refresh } = useAuth();
  const [profile, setProfile] = useState(null);
  const [loading, setLoading] = useState(true);
  const [editing, setEditing] = useState(false);
  const [showFriends, setShowFriends] = useState(false);
  const [followTab, setFollowTab] = useState(null); // 'followers' | 'following' | null
  const [posts, setPosts] = useState([]);
  const [postsLoading, setPostsLoading] = useState(true);
  const avatarInputRef = useRef(null);
  const coverInputRef = useRef(null);

  const isSelf = me?.username === username;

  const load = async () => {
    setLoading(true);
    try {
      const { data } = await api.get(`/users/${username}`);
      setProfile(data.user);
    } finally {
      setLoading(false);
    }
  };

  const loadPosts = async () => {
    setPostsLoading(true);
    try {
      const { data } = await api.get(`/posts/user/${username}`);
      setPosts(data.posts);
    } finally {
      setPostsLoading(false);
    }
  };

  useEffect(() => {
    load();
    loadPosts();
  }, [username]);

  const onAvatarChange = async (e) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const form = new FormData();
    form.append('file', file);
    const { data } = await api.post('/users/me/avatar', form);
    setProfile((p) => ({ ...p, avatarUrl: data.avatarUrl }));
    refresh();
  };

  const onCoverChange = async (e) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const form = new FormData();
    form.append('file', file);
    const { data } = await api.post('/users/me/cover', form);
    setProfile((p) => ({ ...p, coverUrl: data.coverUrl }));
  };

  if (loading) {
    return (
      <MainLayout>
        <div className="flex h-64 items-center justify-center">
          <div className="h-8 w-8 animate-spin rounded-full border-2 border-aurora-border border-t-aurora-violet" />
        </div>
      </MainLayout>
    );
  }

  if (!profile) {
    return (
      <MainLayout>
        <div className="rounded-aurora-lg border border-aurora-border bg-aurora-card p-10 text-center">
          <p className="text-aurora-text-muted">This user couldn't be found.</p>
        </div>
      </MainLayout>
    );
  }

  return (
    <MainLayout>
      <div className="overflow-hidden rounded-aurora-lg border border-aurora-border bg-aurora-card">
        {/* Cover */}
        <div className="relative h-40 bg-aurora-gradient sm:h-56">
          {profile.coverUrl && (
            <img src={profile.coverUrl} alt="" className="h-full w-full object-cover" />
          )}
          {isSelf && (
            <>
              <button
                onClick={() => coverInputRef.current?.click()}
                className="absolute bottom-3 right-3 flex items-center gap-1.5 rounded-full bg-black/50 px-3 py-1.5 text-xs font-medium text-white backdrop-blur-aurora transition-aurora hover:bg-black/70"
              >
                <Camera size={14} /> Change cover
              </button>
              <input ref={coverInputRef} type="file" accept="image/*" hidden onChange={onCoverChange} />
            </>
          )}
        </div>

        {/* Header */}
        <div className="px-6 pb-6">
          <div className="-mt-10 flex items-end justify-between">
            <div className="relative">
              <Avatar src={profile.avatarUrl} name={profile.name} size={88} className="border-4 border-aurora-card" />
              {isSelf && (
                <>
                  <button
                    onClick={() => avatarInputRef.current?.click()}
                    aria-label="Change avatar"
                    className="absolute bottom-0 right-0 flex h-7 w-7 items-center justify-center rounded-full bg-aurora-gradient text-white"
                  >
                    <Camera size={13} />
                  </button>
                  <input ref={avatarInputRef} type="file" accept="image/*" hidden onChange={onAvatarChange} />
                </>
              )}
            </div>

            <div className="flex gap-2 pb-1">
              {isSelf ? (
                <button
                  onClick={() => setEditing(true)}
                  className="rounded-full border border-aurora-border px-4 py-1.5 text-sm font-semibold text-aurora-text transition-aurora hover:border-aurora-violet"
                >
                  Edit profile
                </button>
              ) : (
                <>
                  <AddFriendButton
                    username={profile.username}
                    isFriend={profile.isFriend}
                    status={profile.friendRequestStatus}
                    requestId={profile.friendRequestId}
                    onChange={({ status, ...rest }) =>
                      setProfile((p) => {
                        const next = { ...p, friendRequestStatus: status, ...rest };
                        // Unfriending here breaks the mutual follow the server created on
                        // accept — reflect that in this profile's counts immediately rather
                        // than waiting on a reload.
                        if (p.isFriend && rest.isFriend === false) {
                          next.friendCount = Math.max(0, p.friendCount - 1);
                          next.followerCount = Math.max(0, p.followerCount - 1);
                          next.followingCount = Math.max(0, p.followingCount - 1);
                        } else if (!p.isFriend && rest.isFriend === true) {
                          next.friendCount = p.friendCount + 1;
                          next.followerCount = p.followerCount + 1;
                          next.followingCount = p.followingCount + 1;
                        }
                        return next;
                      })
                    }
                  />
                  <FollowButton
                    username={profile.username}
                    initialIsFollowing={profile.isFollowing}
                    onChange={(nowFollowing) =>
                      setProfile((p) => ({
                        ...p,
                        followerCount: p.followerCount + (nowFollowing ? 1 : -1),
                      }))
                    }
                  />
                </>
              )}
            </div>
          </div>

          <h1 className="mt-3 text-xl font-bold text-aurora-text">{profile.name}</h1>
          <p className="text-sm text-aurora-text-muted">@{profile.username}</p>
          {profile.bio && <p className="mt-2 text-sm text-aurora-text">{profile.bio}</p>}

          <div className="mt-4 flex gap-6 text-sm">
            <button onClick={() => setFollowTab('followers')} className="transition-aurora hover:text-aurora-violet">
              <strong className="text-aurora-text">{profile.followerCount}</strong>{' '}
              <span className="text-aurora-text-muted">Followers</span>
            </button>
            <button onClick={() => setFollowTab('following')} className="transition-aurora hover:text-aurora-violet">
              <strong className="text-aurora-text">{profile.followingCount}</strong>{' '}
              <span className="text-aurora-text-muted">Following</span>
            </button>
            <button onClick={() => setShowFriends(true)} className="transition-aurora hover:text-aurora-violet">
              <strong className="text-aurora-text">{profile.friendCount}</strong>{' '}
              <span className="text-aurora-text-muted">Friends</span>
            </button>
          </div>
        </div>
      </div>

      {followTab && (
        <FollowListModal
          username={profile.username}
          initialTab={followTab}
          onClose={() => setFollowTab(null)}
          onCountsChange={(_tab, isNowFollowing) => {
            // Following/unfollowing a row in the modal changes the *viewer's own* following
            // count, not this profile's counts — except when the viewer is looking at their
            // own profile, in which case that's the same number shown here.
            if (!isSelf) return;
            setProfile((p) => ({
              ...p,
              followingCount: Math.max(0, p.followingCount + (isNowFollowing ? 1 : -1)),
            }));
          }}
        />
      )}

      {showFriends && (
        <FriendsListModal
          username={profile.username}
          isOwnProfile={isSelf}
          onClose={() => setShowFriends(false)}
          onFriendRemoved={() =>
            setProfile((p) => ({
              ...p,
              friendCount: Math.max(0, p.friendCount - 1),
              followerCount: Math.max(0, p.followerCount - 1),
              followingCount: Math.max(0, p.followingCount - 1),
            }))
          }
        />
      )}

      <div className="mt-6 space-y-5">
        <h2 className="text-sm font-semibold text-aurora-text-muted">Posts</h2>
        {postsLoading ? (
          <div className="flex h-32 items-center justify-center">
            <div className="h-7 w-7 animate-spin rounded-full border-2 border-aurora-border border-t-aurora-violet" />
          </div>
        ) : posts.length === 0 ? (
          <div className="rounded-aurora-lg border border-aurora-border bg-aurora-card p-10 text-center text-sm text-aurora-text-muted">
            {isSelf ? "You haven't posted anything yet." : `${profile.name} hasn't posted anything yet.`}
          </div>
        ) : (
          posts.map((post) => (
            <PostCard
              key={post._id}
              post={post}
              onDeleted={(id) => setPosts((prev) => prev.filter((p) => p._id !== id))}
            />
          ))
        )}
      </div>

      {editing && (
        <EditProfileModal
          user={profile}
          onClose={() => setEditing(false)}
          onSaved={(updated) => setProfile((p) => ({ ...p, ...updated }))}
        />
      )}
    </MainLayout>
  );
}
