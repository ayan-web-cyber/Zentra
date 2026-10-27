import { useCallback, useEffect, useRef, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { Mic, MicOff, Video, VideoOff, PhoneOff, Users, Send, Heart } from 'lucide-react';
import api from '../services/api';
import { getSocket } from '../services/socket';
import { useAuth } from '../context/AuthContext';
import Avatar from '../components/Avatar';

// One-to-many broadcast, not a full mesh: the host is the only one publishing a stream.
// Viewers receive-only. This keeps the signaling simple and scales far better than
// everyone-connects-to-everyone for the "small live audience" case this first
// implementation targets — see LiveRoom.js for the note on when an SFU would be needed.
export default function LiveRoomView() {
  const { roomId } = useParams();
  const { user } = useAuth();
  const navigate = useNavigate();

  const [room, setRoom] = useState(null);
  const [isHost, setIsHost] = useState(false);
  const [joined, setJoined] = useState(false);
  const [error, setError] = useState('');
  const [muted, setMuted] = useState(false);
  const [cameraOff, setCameraOff] = useState(false);
  const [participantCount, setParticipantCount] = useState(0);
  const [comments, setComments] = useState([]);
  const [commentText, setCommentText] = useState('');
  const [floatingHearts, setFloatingHearts] = useState([]);

  const localVideoRef = useRef(null);
  const remoteVideoRef = useRef(null);
  const localStreamRef = useRef(null);
  const peersRef = useRef(new Map()); // viewerId -> RTCPeerConnection (host side)
  const hostPcRef = useRef(null); // single connection (viewer side)
  const iceServersRef = useRef([{ urls: 'stun:stun.l.google.com:19302' }]);
  const commentsEndRef = useRef(null);
  // Ref mirror so socket callbacks (closed over once, when the effect below first runs)
  // always see the latest isHost value instead of a stale one from the initial render.
  const isHostRef = useRef(false);
  useEffect(() => {
    isHostRef.current = isHost;
  }, [isHost]);

  useEffect(() => {
    api
      .get('/calls/ice-servers')
      .then(({ data }) => (iceServersRef.current = data.iceServers))
      .catch(() => {});
  }, []);

  const createPeerConnection = useCallback((toUserId, socket) => {
    const pc = new RTCPeerConnection({ iceServers: iceServersRef.current });
    pc.onicecandidate = (e) => {
      if (e.candidate) {
        socket.emit('liveroom:signal', { roomId, toUserId, type: 'ice-candidate', candidate: e.candidate });
      }
    };
    return pc;
  }, [roomId]);

  // Host: publish local media to a newly-joined viewer
  const connectToViewer = useCallback(
    async (viewerId, socket) => {
      const pc = createPeerConnection(viewerId, socket);
      localStreamRef.current?.getTracks().forEach((track) => pc.addTrack(track, localStreamRef.current));
      peersRef.current.set(viewerId, pc);

      const offer = await pc.createOffer();
      await pc.setLocalDescription(offer);
      socket.emit('liveroom:signal', { roomId, toUserId: viewerId, type: 'offer', sdp: offer });
    },
    [createPeerConnection, roomId]
  );

  useEffect(() => {
    let cancelled = false;
    const socket = getSocket();
    if (!socket) return undefined;

    async function setup() {
      try {
        const { data } = await api.get(`/live-rooms/${roomId}`);
        if (cancelled) return;
        if (data.room.status !== 'live') {
          setError('This live room has ended.');
          return;
        }
        setRoom(data.room);
        const hosting = String(data.room.host._id || data.room.host) === String(user._id || user.id);
        setIsHost(hosting);

        if (hosting) {
          const stream = await navigator.mediaDevices.getUserMedia({ audio: true, video: true });
          if (cancelled) return;
          localStreamRef.current = stream;
          if (localVideoRef.current) localVideoRef.current.srcObject = stream;
        }

        socket.emit('liveroom:join', { roomId }, async (res) => {
          if (cancelled) return;
          if (!res?.success) {
            setError(res?.message || 'Could not join this room');
            return;
          }
          setJoined(true);
          setParticipantCount((res.existingParticipants?.length || 0) + 1);

          // If I'm a viewer joining a room where the host is already present, nothing to
          // do yet — the host gets notified via liveroom:participant-joined and will send
          // me an offer. If I'm the host and viewers are already listed (reconnect case),
          // proactively connect to them.
          if (hosting) {
            for (const viewerId of res.existingParticipants || []) {
              connectToViewer(viewerId, socket);
            }
          }
        });
      } catch (err) {
        if (!cancelled) setError(err.response?.data?.message || 'Could not load this room');
      }
    }
    setup();

    const onParticipantJoined = ({ userId: newId }) => {
      setParticipantCount((c) => c + 1);
      if (isHostRef.current) connectToViewer(newId, socket);
    };
    const onParticipantLeft = ({ userId: leftId }) => {
      setParticipantCount((c) => Math.max(0, c - 1));
      peersRef.current.get(leftId)?.close();
      peersRef.current.delete(leftId);
    };
    const onSignal = async ({ fromUserId, type, sdp, candidate }) => {
      try {
        if (isHostRef.current) {
          const pc = peersRef.current.get(fromUserId);
          if (!pc) return;
          if (type === 'answer') await pc.setRemoteDescription(new RTCSessionDescription(sdp));
          else if (type === 'ice-candidate' && candidate) await pc.addIceCandidate(candidate);
        } else {
          if (type === 'offer') {
            const pc = createPeerConnection(fromUserId, socket);
            pc.ontrack = (e) => {
              if (remoteVideoRef.current) remoteVideoRef.current.srcObject = e.streams[0];
            };
            hostPcRef.current = pc;
            await pc.setRemoteDescription(new RTCSessionDescription(sdp));
            const answer = await pc.createAnswer();
            await pc.setLocalDescription(answer);
            socket.emit('liveroom:signal', { roomId, toUserId: fromUserId, type: 'answer', sdp: answer });
          } else if (type === 'ice-candidate' && candidate && hostPcRef.current) {
            await hostPcRef.current.addIceCandidate(candidate);
          }
        }
      } catch (err) {
        console.error('[liveroom signal]', err);
      }
    };
    const onComment = (payload) => setComments((c) => [...c.slice(-99), payload]);
    const onReaction = () => {
      const id = Math.random().toString(36).slice(2);
      setFloatingHearts((h) => [...h, id]);
      setTimeout(() => setFloatingHearts((h) => h.filter((x) => x !== id)), 1800);
    };
    const onEnded = () => setError('The host ended this live room.');

    socket.on('liveroom:participant-joined', onParticipantJoined);
    socket.on('liveroom:participant-left', onParticipantLeft);
    socket.on('liveroom:signal', onSignal);
    socket.on('liveroom:comment', onComment);
    socket.on('liveroom:reaction', onReaction);
    socket.on('liveroom:ended', onEnded);

    return () => {
      cancelled = true;
      socket.emit('liveroom:leave', { roomId });
      socket.off('liveroom:participant-joined', onParticipantJoined);
      socket.off('liveroom:participant-left', onParticipantLeft);
      socket.off('liveroom:signal', onSignal);
      socket.off('liveroom:comment', onComment);
      socket.off('liveroom:reaction', onReaction);
      socket.off('liveroom:ended', onEnded);
      localStreamRef.current?.getTracks().forEach((t) => t.stop());
      peersRef.current.forEach((pc) => pc.close());
      peersRef.current.clear();
      hostPcRef.current?.close();
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [roomId]);

  useEffect(() => {
    commentsEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [comments]);

  const toggleMute = () => {
    localStreamRef.current?.getAudioTracks().forEach((t) => (t.enabled = muted));
    setMuted((m) => !m);
  };
  const toggleCamera = () => {
    localStreamRef.current?.getVideoTracks().forEach((t) => (t.enabled = cameraOff));
    setCameraOff((c) => !c);
  };

  const endRoom = async () => {
    if (isHost) {
      getSocket()?.emit('liveroom:end', { roomId });
      await api.post(`/live-rooms/${roomId}/end`).catch(() => {});
    }
    navigate('/live');
  };

  const sendComment = (e) => {
    e.preventDefault();
    if (!commentText.trim()) return;
    getSocket()?.emit('liveroom:comment', { roomId, text: commentText.trim() });
    setCommentText('');
  };

  const sendReaction = () => {
    getSocket()?.emit('liveroom:reaction', { roomId, emoji: '❤️' });
  };

  if (error) {
    return (
      <div className="flex h-[100dvh] flex-col items-center justify-center gap-4 bg-aurora-bg px-6 text-center">
        <p className="text-aurora-text">{error}</p>
        <button onClick={() => navigate('/live')} className="rounded-aurora-sm bg-aurora-gradient px-5 py-2 font-semibold text-white">
          Back to Live Rooms
        </button>
      </div>
    );
  }

  return (
    <div className="fixed inset-0 z-[100] flex flex-col bg-black">
      <div className="relative flex-1 overflow-hidden">
        <video
          ref={isHost ? localVideoRef : remoteVideoRef}
          autoPlay
          playsInline
          muted={isHost}
          className="h-full w-full object-cover"
        />

        {/* Glassmorphism overlay controls — per spec section 27, used selectively for call/live overlays */}
        <div className="absolute inset-x-0 top-0 flex items-center justify-between p-4">
          <div
            className="flex items-center gap-2 rounded-full px-3 py-1.5"
            style={{ background: 'rgba(20,26,46,0.65)', backdropFilter: 'blur(20px)', border: '1px solid rgba(255,255,255,0.08)' }}
          >
            <Avatar src={room?.host?.avatarUrl} name={room?.host?.name} size={28} />
            <span className="text-sm font-medium text-white">{room?.title}</span>
            <span className="ml-1 rounded-full bg-aurora-like px-1.5 py-0.5 text-[10px] font-bold uppercase text-white">Live</span>
          </div>
          <div
            className="flex items-center gap-1.5 rounded-full px-3 py-1.5 text-sm text-white"
            style={{ background: 'rgba(20,26,46,0.65)', backdropFilter: 'blur(20px)', border: '1px solid rgba(255,255,255,0.08)' }}
          >
            <Users size={14} /> {participantCount}
          </div>
        </div>

        {/* Floating heart reactions */}
        <div className="pointer-events-none absolute bottom-24 right-6 flex h-40 w-10 flex-col-reverse items-center">
          {floatingHearts.map((id) => (
            <Heart key={id} size={22} className="mb-2 animate-bounce text-aurora-like" style={{ animationDuration: '1.6s' }} fill="currentColor" />
          ))}
        </div>

        {/* Live chat */}
        <div className="absolute bottom-20 left-0 max-h-48 w-full max-w-sm space-y-1 overflow-hidden px-4">
          {comments.slice(-6).map((c, i) => (
            <div key={i} className="w-fit max-w-full rounded-full px-3 py-1.5 text-sm text-white" style={{ background: 'rgba(20,26,46,0.55)', backdropFilter: 'blur(12px)' }}>
              <span className="font-semibold">{c.user?.name}</span> <span className="text-white/90">{c.text}</span>
            </div>
          ))}
          <div ref={commentsEndRef} />
        </div>

        {/* Bottom controls */}
        <div
          className="absolute inset-x-0 bottom-0 flex items-center gap-2 p-4"
          style={{ background: 'linear-gradient(to top, rgba(0,0,0,0.6), transparent)' }}
        >
          <form onSubmit={sendComment} className="flex flex-1 items-center gap-2">
            <input
              value={commentText}
              onChange={(e) => setCommentText(e.target.value)}
              placeholder="Say something…"
              maxLength={500}
              className="flex-1 rounded-full px-4 py-2 text-sm text-white outline-none placeholder:text-white/60"
              style={{ background: 'rgba(20,26,46,0.65)', backdropFilter: 'blur(20px)', border: '1px solid rgba(255,255,255,0.08)' }}
            />
            <button type="submit" className="rounded-full bg-aurora-gradient p-2.5 text-white">
              <Send size={16} />
            </button>
          </form>

          <button onClick={sendReaction} className="rounded-full p-2.5 text-white" style={{ background: 'rgba(20,26,46,0.65)', backdropFilter: 'blur(20px)' }}>
            <Heart size={18} />
          </button>

          {isHost && (
            <>
              <button onClick={toggleMute} className="rounded-full p-2.5 text-white" style={{ background: 'rgba(20,26,46,0.65)', backdropFilter: 'blur(20px)' }}>
                {muted ? <MicOff size={18} /> : <Mic size={18} />}
              </button>
              <button onClick={toggleCamera} className="rounded-full p-2.5 text-white" style={{ background: 'rgba(20,26,46,0.65)', backdropFilter: 'blur(20px)' }}>
                {cameraOff ? <VideoOff size={18} /> : <Video size={18} />}
              </button>
            </>
          )}
          <button onClick={endRoom} className="rounded-full bg-aurora-like p-2.5 text-white">
            <PhoneOff size={18} />
          </button>
        </div>
      </div>
    </div>
  );
}
