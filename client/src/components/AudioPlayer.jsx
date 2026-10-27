import { useEffect, useRef, useState } from 'react';
import { Play, Pause, Music2, Mic } from 'lucide-react';

function formatTime(seconds) {
  if (!Number.isFinite(seconds) || seconds < 0) return '0:00';
  const m = Math.floor(seconds / 60);
  const s = Math.floor(seconds % 60)
    .toString()
    .padStart(2, '0');
  return `${m}:${s}`;
}

// Shared, themed audio player for Voice Posts and Music Posts (sections 12 & 13) — a single
// implementation so both post types get the same play/pause + progress/duration behavior and
// look, and neither needs to reinvent it. Falls back to the browser's own controls only if
// something goes wrong loading metadata, so playback never silently breaks.
export default function AudioPlayer({
  src,
  title,
  subtitle,
  coverColor = '#7C3AED',
  variant = 'voice', // 'voice' | 'music'
}) {
  const audioRef = useRef(null);
  const [playing, setPlaying] = useState(false);
  const [duration, setDuration] = useState(0);
  const [currentTime, setCurrentTime] = useState(0);
  const [errored, setErrored] = useState(false);

  useEffect(() => {
    const audio = audioRef.current;
    if (!audio) return undefined;
    const onLoaded = () => setDuration(audio.duration || 0);
    const onTime = () => setCurrentTime(audio.currentTime || 0);
    const onEnd = () => {
      setPlaying(false);
      setCurrentTime(0);
    };
    const onError = () => setErrored(true);
    audio.addEventListener('loadedmetadata', onLoaded);
    audio.addEventListener('timeupdate', onTime);
    audio.addEventListener('ended', onEnd);
    audio.addEventListener('error', onError);
    return () => {
      audio.removeEventListener('loadedmetadata', onLoaded);
      audio.removeEventListener('timeupdate', onTime);
      audio.removeEventListener('ended', onEnd);
      audio.removeEventListener('error', onError);
    };
  }, [src]);

  const toggle = () => {
    const audio = audioRef.current;
    if (!audio) return;
    if (playing) {
      audio.pause();
      setPlaying(false);
    } else {
      audio.play().catch(() => setErrored(true));
      setPlaying(true);
    }
  };

  const seek = (e) => {
    const audio = audioRef.current;
    if (!audio || !duration) return;
    const rect = e.currentTarget.getBoundingClientRect();
    const ratio = Math.min(1, Math.max(0, (e.clientX - rect.left) / rect.width));
    audio.currentTime = ratio * duration;
    setCurrentTime(audio.currentTime);
  };

  const pct = duration ? (currentTime / duration) * 100 : 0;

  if (errored) {
    // Native fallback — still playable, just without the custom chrome.
    return <audio src={src} controls className="h-9 w-full max-w-sm" />;
  }

  return (
    <div className="flex w-full max-w-sm items-center gap-3 rounded-aurora-sm border border-aurora-border bg-aurora-bg p-3">
      <audio ref={audioRef} src={src} preload="metadata" />
      <button
        type="button"
        onClick={toggle}
        aria-label={playing ? 'Pause' : 'Play'}
        className="flex h-10 w-10 flex-shrink-0 items-center justify-center rounded-full text-white transition-aurora hover:opacity-90"
        style={{ background: variant === 'music' ? coverColor : undefined, backgroundImage: variant === 'voice' ? 'linear-gradient(135deg, #7C3AED 0%, #06B6D4 100%)' : undefined }}
      >
        {playing ? <Pause size={17} fill="currentColor" /> : <Play size={17} fill="currentColor" className="ml-0.5" />}
      </button>

      <div className="min-w-0 flex-1">
        {(title || subtitle) && (
          <div className="mb-1 flex items-center gap-1.5 truncate">
            {variant === 'music' ? (
              <Music2 size={12} className="flex-shrink-0 text-aurora-text-muted" />
            ) : (
              <Mic size={12} className="flex-shrink-0 text-aurora-text-muted" />
            )}
            <p className="truncate text-xs font-semibold text-aurora-text">{title}</p>
            {subtitle && <p className="flex-shrink-0 truncate text-xs text-aurora-text-muted">· {subtitle}</p>}
          </div>
        )}
        <div
          role="slider"
          aria-label="Seek"
          aria-valuemin={0}
          aria-valuemax={Math.round(duration)}
          aria-valuenow={Math.round(currentTime)}
          tabIndex={0}
          onClick={seek}
          onKeyDown={(e) => {
            const audio = audioRef.current;
            if (!audio) return;
            if (e.key === 'ArrowRight') audio.currentTime = Math.min(duration, audio.currentTime + 5);
            if (e.key === 'ArrowLeft') audio.currentTime = Math.max(0, audio.currentTime - 5);
          }}
          className="relative h-1.5 w-full cursor-pointer rounded-full bg-aurora-border"
        >
          <div className="absolute inset-y-0 left-0 rounded-full bg-aurora-gradient" style={{ width: `${pct}%` }} />
        </div>
        <div className="mt-1 flex justify-between text-[10px] text-aurora-text-muted">
          <span>{formatTime(currentTime)}</span>
          <span>{formatTime(duration)}</span>
        </div>
      </div>
    </div>
  );
}
