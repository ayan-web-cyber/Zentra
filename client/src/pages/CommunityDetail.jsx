import { useEffect, useRef, useState } from 'react';
import { useParams, useNavigate, Link } from 'react-router-dom';
import {
  Users,
  Lock,
  MessageCircle,
  Plus,
  Shield,
  Crown,
  Pencil,
  UserPlus,
  UserMinus,
  MoreHorizontal,
  Trash2,
} from 'lucide-react';
import api from '../services/api';
import { useAuth } from '../context/AuthContext';
import MainLayout from '../layouts/MainLayout';
import Avatar from '../components/Avatar';
import PostComposer from '../components/PostComposer';
import PostCard from '../components/PostCard';
import EventCard from '../components/EventCard';
import CreateEventModal from '../components/CreateEventModal';
import EditCommunityModal from '../components/EditCommunityModal';
import InviteMembersModal from '../components/InviteMembersModal';
import AnchoredPopover from '../components/AnchoredPopover';
import { confirmDialog } from '../utils/confirm';
import { showToast } from '../utils/toast';

export default function CommunityDetail() {
  const { idOrSlug } = useParams();
  const navigate = useNavigate();
  const { user } = useAuth();

  const [community, setCommunity] = useState(null);
  const [loading, setLoading] = useState(true);
  const [tab, setTab] = useState('posts'); // 'posts' | 'events' | 'members'
  const [posts, setPosts] = useState([]);
  const [postsLoading, setPostsLoading] = useState(true);
  const [events, setEvents] = useState([]);
  const [eventsLoading, setEventsLoading] = useState(false);
  const [members, setMembers] = useState([]);
  const [membersLoading, setMembersLoading] = useState(false);
  const [creatingEvent, setCreatingEvent] = useState(false);
  const [editing, setEditing] = useState(false);
  const [inviting, setInviting] = useState(false);
  const [busy, setBusy] = useState(false);
  const [leaveError, setLeaveError] = useState(null);
  const [showMoreMenu, setShowMoreMenu] = useState(false);
  const moreMenuButtonRef = useRef(null);
  const [deleting, setDeleting] = useState(false);

  const loadCommunity = async () => {
    setLoading(true);
    try {
      const { data } = await api.get(`/communities/${idOrSlug}`);
      setCommunity(data.community);
    } catch (err) {
      console.error('[CommunityDetail load]', err.response?.data?.message);
      setCommunity(null);
    } finally {
      setLoading(false);
    }
  };

  const loadPosts = async (id) => {
    setPostsLoading(true);
    try {
      const { data } = await api.get(`/communities/${id}/posts`);
      setPosts(data.posts);
    } finally {
      setPostsLoading(false);
    }
  };

  const loadEvents = async (id) => {
    setEventsLoading(true);
    try {
      const { data } = await api.get('/events', { params: { communityId: id, when: 'upcoming' } });
      setEvents(data.events);
    } finally {
      setEventsLoading(false);
    }
  };

  const loadMembers = async (id) => {
    setMembersLoading(true);
    try {
      const { data } = await api.get(`/communities/${id}/members`);
      setMembers(data.members);
    } finally {
      setMembersLoading(false);
    }
  };

  useEffect(() => {
    loadCommunity();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [idOrSlug]);

  useEffect(() => {
    if (!community) return;
    if (tab === 'posts') loadPosts(community._id);
    if (tab === 'events') loadEvents(community._id);
    if (tab === 'members') loadMembers(community._id);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [community?._id, tab]);

  const msSinceJoined = community?.viewerJoinedAt ? Date.now() - new Date(community.viewerJoinedAt).getTime() : null;
  const leaveCooldownMs = community?.leaveCooldownMs ?? 24 * 60 * 60 * 1000;
  const canLeaveNow = msSinceJoined === null || msSinceJoined >= leaveCooldownMs;

  const toggleMembership = async () => {
    setLeaveError(null);
    setBusy(true);
    try {
      if (community.isMember) {
        await api.post(`/communities/${community._id}/leave`);
        setCommunity((c) => ({ ...c, isMember: false, memberCount: c.memberCount - 1, viewerJoinedAt: null }));
      } else {
        await api.post(`/communities/${community._id}/join`);
        setCommunity((c) => ({ ...c, isMember: true, memberCount: c.memberCount + 1, viewerJoinedAt: new Date().toISOString() }));
      }
    } catch (err) {
      setLeaveError(err.response?.data?.message || 'Something went wrong.');
      console.error('[CommunityDetail membership]', err.response?.data?.message);
    } finally {
      setBusy(false);
    }
  };

  const removeMember = async (userId) => {
    if (!(await confirmDialog('Remove this member from the community?', { danger: true, confirmLabel: 'Remove' }))) return;
    try {
      await api.delete(`/communities/${community._id}/members/${userId}`);
      setMembers((prev) => prev.filter((m) => m._id !== userId));
      setCommunity((c) => ({ ...c, memberCount: Math.max(0, c.memberCount - 1) }));
    } catch (err) {
      console.error('[CommunityDetail removeMember]', err.response?.data?.message);
      showToast(err.response?.data?.message || 'Could not remove member.', { type: 'error' });
    }
  };

  const deleteCommunity = async () => {
    const ok = await confirmDialog(
      `Delete "${community.name}"? This removes it for every member and can\u2019t be undone.`,
      { danger: true, confirmLabel: 'Delete' }
    );
    if (!ok) return;
    setDeleting(true);
    try {
      await api.delete(`/communities/${community._id}`);
      navigate('/communities');
    } catch (err) {
      console.error('[CommunityDetail deleteCommunity]', err.response?.data?.message);
      showToast(err.response?.data?.message || 'Could not delete community.', { type: 'error' });
      setDeleting(false);
    }
  };

  const openChat = async () => {
    try {
      const { data } = await api.post(`/communities/${community._id}/chat`);
      navigate(`/messages/${data.conversationId}`);
    } catch (err) {
      console.error('[CommunityDetail openChat]', err.response?.data?.message);
    }
  };

  const promote = async (userId) => {
    await api.post(`/communities/${community._id}/moderators/${userId}`);
    loadMembers(community._id);
  };
  const demote = async (userId) => {
    await api.delete(`/communities/${community._id}/moderators/${userId}`);
    loadMembers(community._id);
  };

  if (loading) {
    return (
      <MainLayout>
        <div className="flex h-40 items-center justify-center">
          <div className="h-8 w-8 animate-spin rounded-full border-2 border-aurora-border border-t-aurora-violet" />
        </div>
      </MainLayout>
    );
  }

  if (!community) {
    return (
      <MainLayout>
        <div className="rounded-aurora-lg border border-aurora-border bg-aurora-card p-10 text-center text-aurora-text-muted">
          Community not found.
        </div>
      </MainLayout>
    );
  }

  return (
    <MainLayout>
      <div className="space-y-5">
        <div className="overflow-hidden rounded-aurora-lg border border-aurora-border bg-aurora-card">
          <div
            className="h-32 w-full bg-aurora-gradient bg-cover bg-center sm:h-44"
            style={community.cover ? { backgroundImage: `url(${community.cover.url})` } : undefined}
          />
          <div className="px-5 pb-5">
            <div className="-mt-8 flex h-16 w-16 items-center justify-center rounded-2xl border-4 border-aurora-card bg-aurora-bg text-3xl sm:h-20 sm:w-20">
              {community.avatar ? (
                <img src={community.avatar.url} alt="" className="h-full w-full rounded-2xl object-cover" />
              ) : (
                community.icon
              )}
            </div>

            <div className="mt-3 flex flex-wrap items-start justify-between gap-3">
              <div>
                <div className="flex items-center gap-1.5">
                  <h1 className="text-xl font-bold text-aurora-text">{community.name}</h1>
                  {community.privacy === 'private' && <Lock size={14} className="text-aurora-text-muted" />}
                </div>
                <p className="mt-1 max-w-xl text-sm text-aurora-text-muted">{community.description}</p>
                <div className="mt-2 flex items-center gap-3 text-xs text-aurora-text-muted">
                  <span className="flex items-center gap-1">
                    <Users size={13} /> {community.memberCount} members
                  </span>
                  <span className="rounded-full bg-aurora-bg px-2 py-0.5">{community.category}</span>
                </div>
              </div>

              <div className="flex flex-wrap gap-2">
                {community.isModerator && (
                  <button
                    onClick={() => setInviting(true)}
                    className="flex items-center gap-1.5 rounded-full border border-aurora-border px-4 py-2 text-sm font-semibold text-aurora-text transition-aurora hover:border-aurora-violet"
                  >
                    <UserPlus size={16} /> Invite
                  </button>
                )}
                {community.isModerator && (
                  <button
                    onClick={() => setEditing(true)}
                    className="flex items-center gap-1.5 rounded-full border border-aurora-border px-4 py-2 text-sm font-semibold text-aurora-text transition-aurora hover:border-aurora-violet"
                  >
                    <Pencil size={16} /> Edit
                  </button>
                )}
                {community.isMember && (
                  <button
                    onClick={openChat}
                    className="flex items-center gap-1.5 rounded-full border border-aurora-border px-4 py-2 text-sm font-semibold text-aurora-text transition-aurora hover:border-aurora-violet"
                  >
                    <MessageCircle size={16} /> Chat
                  </button>
                )}
                <button
                  onClick={() => {
                    if (community.isMember && !community.isCreator && !canLeaveNow) {
                      const hoursLeft = Math.ceil((leaveCooldownMs - msSinceJoined) / (60 * 60 * 1000));
                      setLeaveError(`You can leave this community in about ${hoursLeft}h.`);
                      return;
                    }
                    toggleMembership();
                  }}
                  disabled={busy || (community.isMember && community.isCreator)}
                  title={
                    community.isMember && community.isCreator
                      ? 'The creator can\u2019t leave — delete the community instead'
                      : undefined
                  }
                  className={
                    community.isMember
                      ? 'rounded-full border border-aurora-border px-5 py-2 text-sm font-semibold text-aurora-text transition-aurora hover:border-aurora-like hover:text-aurora-like disabled:opacity-60'
                      : 'rounded-full bg-aurora-gradient px-5 py-2 text-sm font-semibold text-white transition-aurora hover:opacity-90 disabled:opacity-60'
                  }
                >
                  {community.isMember ? 'Joined' : 'Join'}
                </button>
                {community.isCreator && (
                  <div className="relative">
                    <button
                      ref={moreMenuButtonRef}
                      onClick={() => setShowMoreMenu((s) => !s)}
                      aria-label="More options"
                      aria-haspopup="menu"
                      aria-expanded={showMoreMenu}
                      className="flex h-[38px] w-[38px] items-center justify-center rounded-full border border-aurora-border text-aurora-text-muted transition-aurora hover:border-aurora-like hover:text-aurora-like"
                    >
                      <MoreHorizontal size={18} />
                    </button>
                    <AnchoredPopover
                      open={showMoreMenu}
                      anchorEl={moreMenuButtonRef.current}
                      onClose={() => setShowMoreMenu(false)}
                      align="right"
                      className="w-48 overflow-hidden rounded-aurora-sm border border-aurora-border bg-aurora-card shadow-aurora"
                    >
                      <div role="menu">
                        <button
                          onClick={() => {
                            setShowMoreMenu(false);
                            deleteCommunity();
                          }}
                          disabled={deleting}
                          role="menuitem"
                          className="flex w-full items-center gap-2 px-3 py-2.5 text-left text-sm text-aurora-like transition-aurora hover:bg-aurora-bg disabled:opacity-60"
                        >
                          <Trash2 size={14} /> {deleting ? 'Deleting…' : 'Delete community'}
                        </button>
                      </div>
                    </AnchoredPopover>
                  </div>
                )}
              </div>
            </div>
            {leaveError && <p className="mt-2 text-xs text-aurora-like">{leaveError}</p>}
          </div>
        </div>

        <div className="flex gap-2 border-b border-aurora-border">
          {['posts', 'events', 'members'].map((t) => (
            <button
              key={t}
              onClick={() => setTab(t)}
              className={`px-4 py-2.5 text-sm font-semibold capitalize transition-aurora ${
                tab === t ? 'border-b-2 border-aurora-violet text-aurora-text' : 'text-aurora-text-muted hover:text-aurora-text'
              }`}
            >
              {t}
            </button>
          ))}
        </div>

        {tab === 'posts' && (
          <div className="space-y-5">
            {community.isMember && (
              <PostComposer
                user={user}
                communityId={community._id}
                placeholder={`Share something with ${community.name}…`}
                onPosted={(post) => setPosts((prev) => [post, ...prev])}
              />
            )}
            {postsLoading ? (
              <div className="flex h-32 items-center justify-center">
                <div className="h-8 w-8 animate-spin rounded-full border-2 border-aurora-border border-t-aurora-violet" />
              </div>
            ) : posts.length === 0 ? (
              <div className="rounded-aurora-lg border border-aurora-border bg-aurora-card p-10 text-center text-aurora-text-muted">
                No posts yet. {community.isMember ? 'Be the first to share something!' : 'Join to start the conversation.'}
              </div>
            ) : (
              posts.map((post) => (
                <PostCard
                  key={post._id}
                  post={post}
                  canModerate={community.isModerator}
                  onDeleted={(id) => setPosts((prev) => prev.filter((p) => p._id !== id))}
                />
              ))
            )}
          </div>
        )}

        {tab === 'events' && (
          <div className="space-y-4">
            {community.isMember && (
              <button
                onClick={() => setCreatingEvent(true)}
                className="flex items-center gap-1.5 rounded-full bg-aurora-gradient px-4 py-2 text-sm font-semibold text-white transition-aurora hover:opacity-90"
              >
                <Plus size={16} /> Create event
              </button>
            )}
            {eventsLoading ? (
              <div className="flex h-32 items-center justify-center">
                <div className="h-8 w-8 animate-spin rounded-full border-2 border-aurora-border border-t-aurora-violet" />
              </div>
            ) : events.length === 0 ? (
              <div className="rounded-aurora-lg border border-aurora-border bg-aurora-card p-10 text-center text-aurora-text-muted">
                No upcoming events.
              </div>
            ) : (
              <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                {events.map((e) => (
                  <EventCard key={e._id} event={e} />
                ))}
              </div>
            )}
          </div>
        )}

        {tab === 'members' && (
          <div className="divide-y divide-aurora-border rounded-aurora-lg border border-aurora-border bg-aurora-card">
            {membersLoading ? (
              <div className="flex h-32 items-center justify-center">
                <div className="h-8 w-8 animate-spin rounded-full border-2 border-aurora-border border-t-aurora-violet" />
              </div>
            ) : (
              members.map((m) => (
                <div key={m._id} className="flex items-center gap-3 px-4 py-3">
                  <Link to={`/profile/${m.username}`} className="flex flex-1 items-center gap-3 min-w-0">
                    <Avatar src={m.avatarUrl} name={m.name} size={40} />
                    <div className="min-w-0">
                      <div className="truncate text-sm font-medium text-aurora-text">{m.name}</div>
                      <div className="truncate text-xs text-aurora-text-muted">@{m.username}</div>
                    </div>
                  </Link>
                  {m.isCreator && (
                    <span className="flex items-center gap-1 rounded-full bg-aurora-violet/15 px-2 py-0.5 text-[10px] font-medium text-aurora-violet">
                      <Crown size={11} /> Creator
                    </span>
                  )}
                  {!m.isCreator && m.isModerator && (
                    <span className="flex items-center gap-1 rounded-full bg-aurora-bg px-2 py-0.5 text-[10px] font-medium text-aurora-text-muted">
                      <Shield size={11} /> Mod
                    </span>
                  )}
                  {community.isCreator && !m.isCreator && (
                    <button
                      onClick={() => (m.isModerator ? demote(m._id) : promote(m._id))}
                      className="text-xs font-medium text-aurora-cyan hover:underline"
                    >
                      {m.isModerator ? 'Remove mod' : 'Make mod'}
                    </button>
                  )}
                  {community.isModerator && !m.isCreator && m._id !== user?._id && (
                    <button
                      onClick={() => removeMember(m._id)}
                      className="flex items-center gap-1 text-xs font-medium text-aurora-like hover:underline"
                    >
                      <UserMinus size={12} /> Remove
                    </button>
                  )}
                </div>
              ))
            )}
          </div>
        )}
      </div>

      {creatingEvent && (
        <CreateEventModal
          communityId={community._id}
          onClose={() => setCreatingEvent(false)}
          onCreated={(event) => {
            setCreatingEvent(false);
            setEvents((prev) => [event, ...prev]);
          }}
        />
      )}

      {editing && (
        <EditCommunityModal
          community={community}
          onClose={() => setEditing(false)}
          onSaved={(updated) => setCommunity((c) => ({ ...c, ...updated }))}
        />
      )}

      {inviting && (
        <InviteMembersModal
          communityId={community._id}
          onClose={() => setInviting(false)}
        />
      )}
    </MainLayout>
  );
}
