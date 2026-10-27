import { createPortal } from 'react-dom';
import { motion } from 'framer-motion';
import { Phone, PhoneOff, Video } from 'lucide-react';
import Avatar from './Avatar';
import { useCall } from '../context/CallContext';

export default function IncomingCallModal() {
  const { callState, callType, remoteUser, acceptCall, rejectCall } = useCall();

  if (callState !== 'incoming') return null;

  return createPortal(
    <div className="fixed inset-0 z-[200] flex items-center justify-center bg-black/80 px-4">
      <motion.div
        initial={{ scale: 0.9, opacity: 0 }}
        animate={{ scale: 1, opacity: 1 }}
        className="w-full max-w-xs rounded-aurora-lg border border-aurora-border bg-aurora-card p-8 text-center shadow-aurora"
      >
        <Avatar src={remoteUser?.avatarUrl} name={remoteUser?.name} size={88} className="mx-auto mb-4" />
        <h2 className="text-lg font-bold text-aurora-text">{remoteUser?.name}</h2>
        <p className="mb-6 text-sm text-aurora-text-muted">
          Incoming {callType === 'video' ? 'video' : 'voice'} call…
        </p>

        <div className="flex justify-center gap-8">
          <motion.button
            whileTap={{ scale: 0.9 }}
            onClick={rejectCall}
            aria-label="Decline"
            className="flex h-14 w-14 items-center justify-center rounded-full bg-aurora-like text-white"
          >
            <PhoneOff size={22} />
          </motion.button>
          <motion.button
            whileTap={{ scale: 0.9 }}
            onClick={acceptCall}
            aria-label="Accept"
            className="flex h-14 w-14 items-center justify-center rounded-full bg-green-500 text-white"
          >
            {callType === 'video' ? <Video size={22} /> : <Phone size={22} />}
          </motion.button>
        </div>
      </motion.div>
    </div>,
    document.body
  );
}
