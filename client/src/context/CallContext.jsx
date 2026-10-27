import { createContext, useCallback, useContext, useEffect, useRef, useState } from 'react';
import api from '../services/api';
import { getSocket } from '../services/socket';
import { useAuth } from './AuthContext';
import { startRingback, startRingtone, stopTone } from '../utils/ringtone';
import { showToast } from '../utils/toast';

const CallContext = createContext(null);

// Call lifecycle: 'idle' | 'calling' (I invited, ringing out) | 'incoming' (they invited me) |
// 'connected' (media flowing). One call at a time, matching the spec's 1:1 calling scope.
export function CallProvider({ children }) {
  const { user } = useAuth();
  const [callState, setCallState] = useState('idle');
  const [callType, setCallType] = useState(null); // 'voice' | 'video'
  const [remoteUser, setRemoteUser] = useState(null);
  const [localStream, setLocalStream] = useState(null);
  const [remoteStream, setRemoteStream] = useState(null);
  const [muted, setMuted] = useState(false);
  const [cameraOff, setCameraOff] = useState(false);

  const pcRef = useRef(null);
  const callIdRef = useRef(null);
  const iceServersRef = useRef([{ urls: 'stun:stun.l.google.com:19302' }]);

  useEffect(() => {
    if (!user) return;
    api
      .get('/calls/ice-servers')
      .then(({ data }) => {
        iceServersRef.current = data.iceServers;
      })
      .catch(() => {
        /* fall back to the default public-STUN-only ref already set above */
      });
  }, [user]);

  const cleanup = useCallback(() => {
    pcRef.current?.close();
    pcRef.current = null;
    localStream?.getTracks().forEach((t) => t.stop());
    setLocalStream(null);
    setRemoteStream(null);
    setCallState('idle');
    setRemoteUser(null);
    setCallType(null);
    callIdRef.current = null;
    setMuted(false);
    setCameraOff(false);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [localStream]);

  const createPeerConnection = useCallback((toUserId) => {
    const pc = new RTCPeerConnection({ iceServers: iceServersRef.current });

    pc.onicecandidate = (e) => {
      if (e.candidate) {
        getSocket()?.emit('call:signal', { toUserId, type: 'ice-candidate', candidate: e.candidate });
      }
    };
    pc.ontrack = (e) => setRemoteStream(e.streams[0]);

    pcRef.current = pc;
    return pc;
  }, []);

  const startCall = useCallback(
    async (targetUser, type) => {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true, video: type === 'video' });
      setLocalStream(stream);
      setCallType(type);
      setRemoteUser(targetUser);
      setCallState('calling');

      const pc = createPeerConnection(targetUser._id);
      stream.getTracks().forEach((track) => pc.addTrack(track, stream));

      getSocket()?.emit('call:invite', { toUserId: targetUser._id, callType: type }, async (res) => {
        if (!res?.success) {
          showToast(res?.message || 'Could not place call', { type: 'error' });
          cleanup();
          return;
        }
        callIdRef.current = res.callId;

        const offer = await pc.createOffer();
        await pc.setLocalDescription(offer);
        getSocket()?.emit('call:signal', { toUserId: targetUser._id, type: 'offer', sdp: offer });
      });
    },
    [createPeerConnection, cleanup]
  );

  const acceptCall = useCallback(async () => {
    const stream = await navigator.mediaDevices.getUserMedia({ audio: true, video: callType === 'video' });
    setLocalStream(stream);
    const pc = createPeerConnection(remoteUser.id || remoteUser._id);
    stream.getTracks().forEach((track) => pc.addTrack(track, stream));

    if (pc._pendingOffer) {
      await pc.setRemoteDescription(new RTCSessionDescription(pc._pendingOffer));
      const answer = await pc.createAnswer();
      await pc.setLocalDescription(answer);
      getSocket()?.emit('call:signal', {
        toUserId: remoteUser.id || remoteUser._id,
        type: 'answer',
        sdp: answer,
      });
    }

    getSocket()?.emit('call:accept', { callId: callIdRef.current });
    setCallState('connected');
  }, [callType, remoteUser, createPeerConnection]);

  const rejectCall = useCallback(() => {
    getSocket()?.emit('call:reject', { callId: callIdRef.current });
    cleanup();
  }, [cleanup]);

  const endCall = useCallback(() => {
    if (callIdRef.current) getSocket()?.emit('call:end', { callId: callIdRef.current });
    cleanup();
  }, [cleanup]);

  const toggleMute = useCallback(() => {
    localStream?.getAudioTracks().forEach((t) => (t.enabled = muted));
    setMuted((m) => !m);
  }, [localStream, muted]);

  const toggleCamera = useCallback(() => {
    localStream?.getVideoTracks().forEach((t) => (t.enabled = cameraOff));
    setCameraOff((c) => !c);
  }, [localStream, cameraOff]);

  useEffect(() => {
    const socket = getSocket();
    if (!socket || !user) return undefined;

    const onIncoming = ({ callId, callType: type, from }) => {
      if (callState !== 'idle') {
        // Busy — auto-reject rather than silently dropping the invite.
        socket.emit('call:reject', { callId });
        return;
      }
      callIdRef.current = callId;
      setCallType(type);
      setRemoteUser(from);
      setCallState('incoming');
    };

    const onSignal = async ({ type, sdp, candidate }) => {
      const pc = pcRef.current;
      if (!pc) return;
      if (type === 'offer') {
        pc._pendingOffer = sdp; // consumed by acceptCall once the callee's local stream is ready
      } else if (type === 'answer') {
        await pc.setRemoteDescription(new RTCSessionDescription(sdp));
        setCallState('connected');
      } else if (type === 'ice-candidate' && candidate) {
        try {
          await pc.addIceCandidate(new RTCIceCandidate(candidate));
        } catch {
          /* candidate arrived before remote description — safe to ignore */
        }
      }
    };

    const onAccepted = () => setCallState('connected');
    const onRejected = () => {
      showToast(`${remoteUser?.name || 'They'} declined the call`);
      cleanup();
    };
    const onEnded = () => cleanup();

    socket.on('call:incoming', onIncoming);
    socket.on('call:signal', onSignal);
    socket.on('call:accepted', onAccepted);
    socket.on('call:rejected', onRejected);
    socket.on('call:ended', onEnded);
    socket.on('call:missed', onEnded);

    return () => {
      socket.off('call:incoming', onIncoming);
      socket.off('call:signal', onSignal);
      socket.off('call:accepted', onAccepted);
      socket.off('call:rejected', onRejected);
      socket.off('call:ended', onEnded);
      socket.off('call:missed', onEnded);
    };
  }, [user, callState, remoteUser, cleanup]);

  // For an incoming call, the peer connection can't be created until acceptCall runs
  // (needs the local stream first) — but the offer may arrive over 'call:signal' before
  // that. We lazily create a placeholder pc as soon as we know a call is incoming so
  // onSignal has somewhere to stash the offer.
  useEffect(() => {
    if (callState === 'incoming' && !pcRef.current) {
      createPeerConnection(remoteUser?.id || remoteUser?._id);
    }
  }, [callState, remoteUser, createPeerConnection]);

  // Ringback while ringing out, ringtone while ringing in, silence otherwise (connected,
  // idle, or after either side ends/rejects — cleanup() always brings callState back to idle).
  useEffect(() => {
    if (callState === 'calling') startRingback();
    else if (callState === 'incoming') startRingtone();
    else stopTone();
    return stopTone;
  }, [callState]);

  return (
    <CallContext.Provider
      value={{
        callState,
        callType,
        remoteUser,
        localStream,
        remoteStream,
        muted,
        cameraOff,
        startCall,
        acceptCall,
        rejectCall,
        endCall,
        toggleMute,
        toggleCamera,
      }}
    >
      {children}
    </CallContext.Provider>
  );
}

export function useCall() {
  const ctx = useContext(CallContext);
  if (!ctx) throw new Error('useCall must be used within a CallProvider');
  return ctx;
}
