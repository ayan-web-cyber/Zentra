import { useEffect } from 'react';
import { createPortal } from 'react-dom';
import { motion, AnimatePresence } from 'framer-motion';
import { X } from 'lucide-react';

export default function MediaViewer({ media, onClose }) {
  useEffect(() => {
    const onKey = (e) => e.key === 'Escape' && onClose();
    document.addEventListener('keydown', onKey);
    document.body.style.overflow = 'hidden';
    return () => {
      document.removeEventListener('keydown', onKey);
      document.body.style.overflow = '';
    };
  }, [onClose]);

  if (!media) return null;

  return createPortal(
    <AnimatePresence>
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        onClick={onClose}
        className="fixed inset-0 z-[100] flex items-center justify-center bg-black/90 p-4"
      >
        <button
          onClick={onClose}
          aria-label="Close"
          className="absolute right-4 top-4 flex h-10 w-10 items-center justify-center rounded-full bg-white/10 text-white backdrop-blur-aurora transition-aurora hover:bg-white/20"
        >
          <X size={20} />
        </button>

        <motion.div
          initial={{ scale: 0.9 }}
          animate={{ scale: 1 }}
          exit={{ scale: 0.9 }}
          transition={{ type: 'spring', stiffness: 300, damping: 28 }}
          onClick={(e) => e.stopPropagation()}
          className="max-h-[90vh] max-w-[90vw]"
        >
          {media.mimeType?.startsWith('video') ? (
            <video src={media.url} controls autoPlay className="max-h-[90vh] max-w-[90vw] rounded-aurora-sm" />
          ) : (
            <img src={media.url} alt="" className="max-h-[90vh] max-w-[90vw] rounded-aurora-sm object-contain" />
          )}
        </motion.div>
      </motion.div>
    </AnimatePresence>,
    document.body
  );
}
