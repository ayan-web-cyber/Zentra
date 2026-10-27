import { useRef, useState } from 'react';
import { UserPlus, Clock, Check, X, UserMinus } from 'lucide-react';
import api from '../services/api';
import { confirmDialog } from '../utils/confirm';
import { showToast } from '../utils/toast';

export default function AddFriendButton({ username, isFriend, status, requestId, onChange }) {
  const [busy, setBusy] = useState(false);
  // `busy` (state) only disables the button visually/functionally after React re-renders,
  // which isn't synchronous — a fast double-click can fire the handler twice in the same
  // tick, before that re-render happens. This ref is checked and set synchronously, so the
  // second call bails out immediately regardless of render timing.
  const inFlightRef = useRef(false);

  const send = async () => {
    if (inFlightRef.current) return;
    inFlightRef.current = true;
    setBusy(true);
    // Optimistic — the button flips to "Request sent" immediately, before the network
    // round-trip resolves, matching the instant feedback a Facebook-style "Add friend"
    // button gives. If the request turns out to already be pending (e.g. a race between
    // two tabs), that's still the correct end state, so no rollback is needed for a 409.
    onChange({ status: 'pending_sent' });
    try {
      await api.post(`/friends/request/${username}`);
    } catch (err) {
      if (err.response?.status !== 409) {
        onChange({ status: 'none' }); // genuine failure — roll back
        showToast(err.response?.data?.message || 'Could not send friend request', { type: 'error' });
      }
    } finally {
      setBusy(false);
      inFlightRef.current = false;
    }
  };

  const cancel = async () => {
    if (inFlightRef.current) return;
    inFlightRef.current = true;
    setBusy(true);
    const previous = status;
    onChange({ status: 'none' });
    try {
      await api.delete(`/friends/request/${username}`);
    } catch {
      onChange({ status: previous }); // request wasn't actually cancellable — restore
    } finally {
      setBusy(false);
      inFlightRef.current = false;
    }
  };

  const respond = async (action) => {
    if (inFlightRef.current) return;
    inFlightRef.current = true;
    setBusy(true);
    try {
      await api.post(`/friends/${requestId}/${action}`);
      onChange(action === 'accept' ? { status: 'friends', isFriend: true } : { status: 'none' });
    } catch (err) {
      console.error(err.response?.data?.message);
    } finally {
      setBusy(false);
      inFlightRef.current = false;
    }
  };

  const unfriend = async () => {
    if (inFlightRef.current) return;
    if (!(await confirmDialog(`Remove ${username} from your friends?`, { danger: true, confirmLabel: 'Remove' }))) return;
    inFlightRef.current = true;
    setBusy(true);
    try {
      await api.delete(`/friends/${username}`);
      // Unfriending also breaks the mutual follow on the server — reflect that here too
      // so the UI doesn't show a stale "Following" state until the next full reload.
      onChange({ status: 'none', isFriend: false, isFollowing: false });
    } catch (err) {
      console.error(err.response?.data?.message);
    } finally {
      setBusy(false);
      inFlightRef.current = false;
    }
  };

  if (isFriend || status === 'friends') {
    return (
      <button
        onClick={unfriend}
        disabled={busy}
        title="Unfriend"
        className="group flex items-center gap-1.5 rounded-full border border-aurora-border px-4 py-1.5 text-sm font-semibold text-aurora-text transition-aurora hover:border-aurora-like hover:text-aurora-like disabled:opacity-60"
      >
        <Check size={15} className="group-hover:hidden" />
        <UserMinus size={15} className="hidden group-hover:block" />
        <span className="group-hover:hidden">Friends</span>
        <span className="hidden group-hover:inline">Unfriend</span>
      </button>
    );
  }

  if (status === 'pending_received') {
    return (
      <div className="flex gap-2">
        <button
          onClick={() => respond('accept')}
          disabled={busy}
          className="flex items-center gap-1.5 rounded-full bg-aurora-gradient px-4 py-1.5 text-sm font-semibold text-white disabled:opacity-60"
        >
          <Check size={15} /> Accept
        </button>
        <button
          onClick={() => respond('reject')}
          disabled={busy}
          className="flex items-center gap-1.5 rounded-full border border-aurora-border px-4 py-1.5 text-sm font-semibold text-aurora-text transition-aurora hover:border-aurora-like hover:text-aurora-like disabled:opacity-60"
        >
          <X size={15} /> Decline
        </button>
      </div>
    );
  }

  if (status === 'pending_sent') {
    return (
      <button
        onClick={cancel}
        disabled={busy}
        title="Cancel request"
        className="group flex items-center gap-1.5 rounded-full border border-aurora-border px-4 py-1.5 text-sm font-semibold text-aurora-text transition-aurora hover:border-aurora-like hover:text-aurora-like disabled:opacity-60"
      >
        <Clock size={15} className="group-hover:hidden" />
        <X size={15} className="hidden group-hover:block" />
        <span className="group-hover:hidden">Request sent</span>
        <span className="hidden group-hover:inline">Cancel request</span>
      </button>
    );
  }

  return (
    <button
      onClick={send}
      disabled={busy}
      className="flex items-center gap-1.5 rounded-full border border-aurora-border px-4 py-1.5 text-sm font-semibold text-aurora-text transition-aurora hover:border-aurora-violet disabled:opacity-60"
    >
      <UserPlus size={15} /> Add friend
    </button>
  );
}
