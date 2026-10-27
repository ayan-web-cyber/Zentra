import { useRef, useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { X, Video, Upload } from 'lucide-react';
import api from '../services/api';

// Focused, video-only composer opened straight from the Reels page. Unlike the general
// PostComposer (where "Make this a Reel" is a checkbox easy to miss), this always creates
// a reel — nothing to toggle, nothing to get wrong.
export default function CreateReelModal({ onClose, onCreated }) {
  const [file, setFile] = useState(null);
  const [preview, setPreview] = useState(null);
  const [caption, setCaption] = useState('');
  const [posting, setPosting] = useState(false);
  const [error, setError] = useState('');
  const fileInputRef = useRef(null);

  const onPickFile = (e) => {
    const f = e.target.files?.[0];
    if (!f) return;
    if (!f.type.startsWith('video/')) {
      setError('Reels must be a video file.');
      return;
    }
    setError('');
    setFile(f);
    setPreview(URL.createObjectURL(f));
  };

  const submit = async () => {
    if (!file) return;
    setPosting(true);
    setError('');
    try {
      const form = new FormData();
      form.append('file', file);
      form.append('kind', 'post');
      const { data: mediaData } = await api.post('/media/upload', form);

      const { data } = await api.post('/posts', {
        type: 'video',
        caption,
        mediaIds: [mediaData.media.id],
        isReel: true,
      });

      onCreated(data.post);
      onClose();
    } catch (err) {
      setError(err.response?.data?.message || 'Could not post that reel. Please try again.');
    } finally {
      setPosting(false);
    }
  };

  return (
    <AnimatePresence>
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        onClick={onClose}
        className="fixed inset-0 z-[100] flex items-center justify-center bg-black/70 p-4"
      >
        <motion.div
          initial={{ scale: 0.94, opacity: 0 }}
          animate={{ scale: 1, opacity: 1 }}
          exit={{ scale: 0.94, opacity: 0 }}
          transition={{ type: 'spring', stiffness: 300, damping: 28 }}
          onClick={(e) => e.stopPropagation()}
          className="w-full max-w-sm rounded-aurora-lg border border-aurora-border bg-aurora-card p-5"
        >
          <div className="mb-4 flex items-center justify-between">
            <h2 className="text-base font-bold text-aurora-text">Create Reel</h2>
            <button onClick={onClose} aria-label="Close" className="text-aurora-text-muted hover:text-aurora-text">
              <X size={20} />
            </button>
          </div>

          {!preview ? (
            <button
              onClick={() => fileInputRef.current?.click()}
              className="flex aspect-[9/16] w-full flex-col items-center justify-center gap-2 rounded-aurora-md border-2 border-dashed border-aurora-border text-aurora-text-muted transition-aurora hover:border-aurora-violet hover:text-aurora-violet"
            >
              <Upload size={28} />
              <span className="text-sm font-medium">Upload a video</span>
              <span className="text-xs">Vertical video works best</span>
            </button>
          ) : (
            <div className="relative aspect-[9/16] w-full overflow-hidden rounded-aurora-md bg-black">
              <video src={preview} className="h-full w-full object-contain" controls />
              <button
                onClick={() => {
                  setFile(null);
                  setPreview(null);
                }}
                className="absolute right-2 top-2 flex h-7 w-7 items-center justify-center rounded-full bg-black/60 text-white"
              >
                <X size={14} />
              </button>
            </div>
          )}

          <input ref={fileInputRef} type="file" accept="video/*" hidden onChange={onPickFile} />

          <textarea
            value={caption}
            onChange={(e) => setCaption(e.target.value)}
            placeholder="Write a caption…"
            rows={2}
            className="mt-3 w-full resize-none rounded-aurora-sm border border-aurora-border bg-aurora-bg px-3 py-2 text-sm text-aurora-text outline-none focus:border-aurora-violet"
          />

          {error && <p className="mt-2 text-xs text-aurora-like">{error}</p>}

          <motion.button
            whileHover={{ scale: 1.02 }}
            whileTap={{ scale: 0.97 }}
            onClick={submit}
            disabled={!file || posting}
            className="mt-3 flex w-full items-center justify-center gap-1.5 rounded-full bg-aurora-gradient py-2.5 text-sm font-semibold text-white disabled:opacity-50"
          >
            <Video size={16} />
            {posting ? 'Posting…' : 'Post Reel'}
          </motion.button>
        </motion.div>
      </motion.div>
    </AnimatePresence>
  );
}
