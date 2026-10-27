import { useEffect, useRef, useState } from 'react';
import { createPortal } from 'react-dom';
import { motion } from 'framer-motion';
import { Mic, MicOff, Video, VideoOff, PhoneOff, Volume2 } from 'lucide-react';
import Avatar from './Avatar';
import { useCall } from '../context/CallContext';

function useCallTimer(active) {
  const [seconds, setSeconds] = useState(0);
  useEffect(() => {
    if (!active) return undefined;
    setSeconds(0);
    const interval = setInterval(() => setSeconds((s) => s + 1), 1000);
    return () => clearInterval(interval);
  }, [active]);
  const mins = String(Math.floor(seconds / 60)).padStart(2, '0');
  const secs = String(seconds % 60).padStart(2, '0');
  return `${mins}:${secs}`;
}

export default function CallScreen() {
  const { callState, callType, remoteUser, localStream, remoteStream, muted, cameraOff, endCall, toggleMute, toggleCamera } =
    useCall();
  const localVideoRef = useRef(null);
  const remoteVideoRef = useRef(null);
  const duration = useCallTimer(callState === 'connected');

  useEffect(() => {
    if (localVideoRef.current && localStream) localVideoRef.current.srcObject = localStream;
  }, [localStream]);
  useEffect(() => {
    if (remoteVideoRef.current && remoteStream) remoteVideoRef.current.srcObject = remoteStream;
  }, [remoteStream]);

  if (callState !== 'calling' && callState !== 'connected') return null;

  const isVideo = callType === 'video';

  return createPortal(
    <div className="fixed inset-0 z-[200] flex flex-col bg-aurora-bg">
      {isVideo && remoteStream ? (
        <video ref={remoteVideoRef} autoPlay playsInline className="absolute inset-0 h-full w-full object-cover" />
      ) : (
        <div className="absolute inset-0 flex items-center justify-center bg-gradient-to-br from-[#0B1020] via-[#141A2E] to-[#0B1020]" />
      )}

      {/* Center identity block, shown always for voice, or as a fallback before video connects */}
      {(!isVideo || !remoteStream) && (
        <div className="relative z-10 flex flex-1 flex-col items-center justify-center text-center">
          <Avatar src={remoteUser?.avatarUrl} name={remoteUser?.name} size={120} className="mb-4" />
          <h2 className="text-xl font-bold text-white">{remoteUser?.name}</h2>
          <p className="mt-1 text-sm text-white/70">
            {callState === 'calling' ? 'Ringing…' : duration}
          </p>
        </div>
      )}

      {isVideo && remoteStream && (
        <div className="absolute left-4 top-4 z-10 rounded-full bg-black/40 px-3 py-1 text-xs text-white backdrop-blur-aurora">
          {duration}
        </div>
      )}

      {/* Local preview (video calls only) */}
      {isVideo && localStream && (
        <motion.video
          ref={localVideoRef}
          autoPlay
          playsInline
          muted
          drag
          dragConstraints={{ top: 0, bottom: 400, left: -200, right: 200 }}
          className="absolute right-4 top-4 z-10 h-40 w-28 rounded-aurora-sm border border-white/20 object-cover shadow-aurora"
        />
      )}

      {/* Glassmorphism control panel */}
      <div className="relative z-10 flex items-center justify-center gap-5 pb-10 pt-6">
        <motion.button
          whileTap={{ scale: 0.9 }}
          onClick={toggleMute}
          aria-label={muted ? 'Unmute' : 'Mute'}
          className="flex h-12 w-12 items-center justify-center rounded-full text-white backdrop-blur-aurora"
          style={{ background: 'rgba(20,26,46,0.65)', border: '1px solid rgba(255,255,255,0.08)' }}
        >
          {muted ? <MicOff size={20} /> : <Mic size={20} />}
        </motion.button>

        {isVideo && (
          <motion.button
            whileTap={{ scale: 0.9 }}
            onClick={toggleCamera}
            aria-label={cameraOff ? 'Turn camera on' : 'Turn camera off'}
            className="flex h-12 w-12 items-center justify-center rounded-full text-white backdrop-blur-aurora"
            style={{ background: 'rgba(20,26,46,0.65)', border: '1px solid rgba(255,255,255,0.08)' }}
          >
            {cameraOff ? <VideoOff size={20} /> : <Video size={20} />}
          </motion.button>
        )}

        <motion.button
          whileTap={{ scale: 0.9 }}
          aria-label="Speaker"
          className="flex h-12 w-12 items-center justify-center rounded-full text-white backdrop-blur-aurora"
          style={{ background: 'rgba(20,26,46,0.65)', border: '1px solid rgba(255,255,255,0.08)' }}
        >
          <Volume2 size={20} />
        </motion.button>

        <motion.button
          whileTap={{ scale: 0.9 }}
          onClick={endCall}
          aria-label="End call"
          className="flex h-14 w-14 items-center justify-center rounded-full bg-aurora-like text-white shadow-aurora"
        >
          <PhoneOff size={24} />
        </motion.button>
      </div>
    </div>,
    document.body
  );
}
