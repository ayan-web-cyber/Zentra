import { useEffect, useRef, useState } from 'react';
import { createPortal } from 'react-dom';
import { motion } from 'framer-motion';
import { X, ChevronLeft, ChevronRight, Trash2, Volume2, VolumeX } from 'lucide-react';
import api from '../services/api';
import Avatar from './Avatar';

const STORY_DURATION_MS = 5000;

export default function StoryViewer({ groups, startIndex, onClose }) {
  const [groupIndex, setGroupIndex] = useState(startIndex);
  const [storyIndex, setStoryIndex] = useState(0);
  const [progress, setProgress] = useState(0);
  const [confirmingDelete, setConfirmingDelete] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const [manualMuted, setManualMuted] = useState(null); // null = use the default for this story
  const timerRef = useRef(null);
  const videoRef = useRef(null);
  const audioRef = useRef(null);
  const confirmingDeleteRef = useRef(false);

  useEffect(() => {
    confirmingDeleteRef.current = confirmingDelete;
  }, [confirmingDelete]);

  const group = groups[groupIndex];
  const story = group?.stories[storyIndex];

  const goNext = () => {
    setConfirmingDelete(false);
    if (!group) return onClose();
    if (storyIndex < group.stories.length - 1) {
      setStoryIndex((i) => i + 1);
    } else if (groupIndex < groups.length - 1) {
      setGroupIndex((i) => i + 1);
      setStoryIndex(0);
    } else {
      onClose();
    }
  };

  const goPrev = () => {
    setConfirmingDelete(false);
    if (storyIndex > 0) {
      setStoryIndex((i) => i - 1);
    } else if (groupIndex > 0) {
      setGroupIndex((i) => i - 1);
      setStoryIndex(groups[groupIndex - 1].stories.length - 1);
    }
  };

  useEffect(() => {
    if (!story) return undefined;
    api.post(`/stories/${story._id}/view`).catch(() => {});
    setManualMuted(null);

    setProgress(0);
    const start = Date.now();
    let pausedAt = null;
    let totalPaused = 0;
    timerRef.current = setInterval(() => {
      if (confirmingDeleteRef.current) {
        if (pausedAt === null) pausedAt = Date.now();
        return;
      }
      if (pausedAt !== null) {
        totalPaused += Date.now() - pausedAt;
        pausedAt = null;
      }
      const pct = Math.min(((Date.now() - start - totalPaused) / STORY_DURATION_MS) * 100, 100);
      setProgress(pct);
      if (pct >= 100) goNext();
    }, 50);

    return () => clearInterval(timerRef.current);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [groupIndex, storyIndex]);

  // Play the attached song (if any) in sync with the story, independently of
  // whatever the underlying photo/video is doing with its own audio.
  useEffect(() => {
    const audio = audioRef.current;
    if (!audio) return undefined;
    if (story?.song?.audioUrl) {
      audio.src = story.song.audioUrl;
      audio.currentTime = story.song.startTime || 0;
      audio.play().catch(() => {});
    } else {
      audio.pause();
    }
    return () => audio.pause();
  }, [story?._id, story?.song?.audioUrl]);

  if (!story) return null;

  // A video's own sound is muted by default once a song is attached (unless the
  // person explicitly asked to keep it), matching how the composer described it.
  // Photos/text with no video element ignore this entirely.
  const defaultMuted = story.song ? !story.song.keepOriginalAudio : false;
  const videoMuted = manualMuted === null ? defaultMuted : manualMuted;
  const hasVideo = story.type === 'video';

  const handleDelete = async () => {
    setDeleting(true);
    try {
      await api.delete(`/stories/${story._id}`);
      // Remove locally so the progress bars/count reflect it immediately, then
      // let the caller (StoryBar) refetch the feed once we close.
      group.stories.splice(storyIndex, 1);
      if (group.stories.length === 0) {
        onClose();
      } else if (storyIndex >= group.stories.length) {
        setStoryIndex(group.stories.length - 1);
        setConfirmingDelete(false);
      } else {
        setConfirmingDelete(false);
      }
    } catch (err) {
      console.error('[StoryViewer] delete failed', err.response?.data?.message);
    } finally {
      setDeleting(false);
    }
  };

  return createPortal(
    <div className="fixed inset-0 z-[100] flex items-center justify-center bg-black">
      <div className="relative h-full w-full max-w-md">
        {/* Progress bars */}
        <div className="absolute inset-x-2 top-2 z-10 flex gap-1">
          {group.stories.map((_, i) => (
            <div key={i} className="h-1 flex-1 overflow-hidden rounded-full bg-white/30">
              <motion.div
                className="h-full bg-white"
                style={{
                  width: i < storyIndex ? '100%' : i === storyIndex ? `${progress}%` : '0%',
                }}
              />
            </div>
          ))}
        </div>

        {/* Header */}
        <div className="absolute inset-x-2 top-6 z-10 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Avatar src={group.author.avatarUrl} name={group.author.name} size={32} />
            <span className="text-sm font-medium text-white">{group.author.name}</span>
          </div>
          <div className="flex items-center gap-3">
            {hasVideo && (
              <button
                onClick={() => setManualMuted(!videoMuted)}
                aria-label={videoMuted ? 'Unmute' : 'Mute'}
                className="text-white"
              >
                {videoMuted ? <VolumeX size={20} /> : <Volume2 size={20} />}
              </button>
            )}
            {story.isOwn && (
              <button onClick={() => setConfirmingDelete(true)} aria-label="Delete story" className="text-white">
                <Trash2 size={20} />
              </button>
            )}
            <button onClick={onClose} aria-label="Close" className="text-white">
              <X size={22} />
            </button>
          </div>
        </div>

        {/* Content */}
        <div className="flex h-full w-full items-center justify-center">
          {story.type === 'text' ? (
            <div
              className="flex h-full w-full items-center justify-center p-8 text-center text-2xl font-semibold text-white"
              style={{ background: story.backgroundColor }}
            >
              {story.textContent}
            </div>
          ) : story.type === 'video' ? (
            <video
              ref={videoRef}
              src={story.mediaUrl}
              className="h-full w-full object-contain"
              autoPlay
              muted={videoMuted}
              playsInline
            />
          ) : (
            <img src={story.mediaUrl} alt="" className="h-full w-full object-contain" />
          )}

          {story.textOverlay?.text && (
            <div
              className={`pointer-events-none absolute inset-x-0 z-[5] flex justify-center px-6 text-center ${
                story.textOverlay.position === 'top'
                  ? 'top-16'
                  : story.textOverlay.position === 'bottom'
                    ? 'bottom-24'
                    : 'top-1/2 -translate-y-1/2'
              }`}
            >
              <span
                className="max-w-full break-words text-xl font-bold drop-shadow-[0_1px_8px_rgba(0,0,0,0.7)]"
                style={{ color: story.textOverlay.color }}
              >
                {story.textOverlay.text}
              </span>
            </div>
          )}
        </div>

        {/* Caption + song chip */}
        {(story.caption || story.song) && (
          <div className="absolute inset-x-4 bottom-8 z-10 space-y-1.5 text-center">
            {story.song && (
              <p className="mx-auto inline-flex max-w-full items-center gap-1.5 rounded-full bg-black/40 px-3 py-1 text-xs font-medium text-white">
                🎵 {story.song.title} — {story.song.artist}
              </p>
            )}
            {story.caption && <p className="text-sm text-white drop-shadow-[0_1px_6px_rgba(0,0,0,0.7)]">{story.caption}</p>}
          </div>
        )}

        {/* Tap zones (disabled while confirming delete so taps don't skip past it) */}
        {!confirmingDelete && (
          <>
            <button onClick={goPrev} className="absolute inset-y-0 left-0 w-1/3" aria-label="Previous story" />
            <button onClick={goNext} className="absolute inset-y-0 right-0 w-1/3" aria-label="Next story" />
            <ChevronLeft className="absolute left-2 top-1/2 -translate-y-1/2 text-white/40" size={28} />
            <ChevronRight className="absolute right-2 top-1/2 -translate-y-1/2 text-white/40" size={28} />
          </>
        )}

        {/* Delete confirmation */}
        {confirmingDelete && (
          <div className="absolute inset-0 z-20 flex items-center justify-center bg-black/70 px-8">
            <div className="w-full max-w-xs rounded-aurora-lg border border-aurora-border bg-aurora-card p-5 text-center">
              <p className="mb-4 text-sm font-medium text-aurora-text">Delete this story?</p>
              <div className="flex gap-2">
                <button
                  onClick={() => setConfirmingDelete(false)}
                  className="flex-1 rounded-aurora-sm border border-aurora-border py-2 text-sm font-medium text-aurora-text"
                >
                  Cancel
                </button>
                <button
                  onClick={handleDelete}
                  disabled={deleting}
                  className="flex-1 rounded-aurora-sm bg-aurora-like py-2 text-sm font-semibold text-white disabled:opacity-60"
                >
                  {deleting ? 'Deleting…' : 'Delete'}
                </button>
              </div>
            </div>
          </div>
        )}

        <audio ref={audioRef} />
      </div>
    </div>,
    document.body
  );
}
