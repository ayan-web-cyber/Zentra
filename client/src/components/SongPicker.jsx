import { useEffect, useRef, useState } from 'react';
import { createPortal } from 'react-dom';
import { X, Search, Play, Pause, Music, Flame } from 'lucide-react';
import useSongSearch from '../hooks/useSongSearch';

// Modal for browsing/searching the story sound library. Lets the person preview
// a track before attaching it — previewing plays only inside this picker, never
// inside the story composer itself, so there's only ever one thing making sound.
export default function SongPicker({ onClose, onSelect }) {
  const [query, setQuery] = useState('');
  const { songs, loading } = useSongSearch(query);
  const [previewingId, setPreviewingId] = useState(null);
  const audioRef = useRef(null);

  useEffect(() => {
    return () => {
      audioRef.current?.pause();
    };
  }, []);

  const togglePreview = (song) => {
    const audio = audioRef.current;
    if (!audio) return;
    if (previewingId === song.id) {
      audio.pause();
      setPreviewingId(null);
      return;
    }
    audio.src = song.audioUrl;
    audio.currentTime = 0;
    audio.play().catch(() => {});
    setPreviewingId(song.id);
  };

  return createPortal(
    <div className="fixed inset-0 z-[110] flex items-end justify-center bg-black/70 sm:items-center sm:px-4">
      <div className="flex h-[80vh] w-full max-w-sm flex-col rounded-t-aurora-lg border border-aurora-border bg-aurora-card sm:h-[70vh] sm:rounded-aurora-lg">
        <div className="flex items-center justify-between border-b border-aurora-border px-4 py-3">
          <h2 className="text-base font-bold text-aurora-text">Add a sound</h2>
          <button
            onClick={() => {
              audioRef.current?.pause();
              onClose();
            }}
            aria-label="Close"
            className="text-aurora-text-muted hover:text-aurora-text"
          >
            <X size={20} />
          </button>
        </div>

        <div className="border-b border-aurora-border px-4 py-3">
          <div className="flex items-center gap-2 rounded-full border border-aurora-border bg-aurora-bg px-3 py-2">
            <Search size={16} className="text-aurora-text-muted" />
            <input
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder="Search songs or artists"
              className="w-full bg-transparent text-sm text-aurora-text outline-none placeholder:text-aurora-text-muted"
            />
          </div>
          {!query && (
            <div className="mt-2 flex items-center gap-1.5 text-xs font-medium text-aurora-text-muted">
              <Flame size={13} className="text-aurora-like" /> Trending on Zentra
            </div>
          )}
        </div>

        <div className="flex-1 overflow-y-auto px-2 py-2">
          {loading ? (
            <div className="flex h-32 items-center justify-center">
              <div className="h-6 w-6 animate-spin rounded-full border-2 border-aurora-border border-t-aurora-violet" />
            </div>
          ) : songs.length === 0 ? (
            <div className="flex h-32 items-center justify-center text-sm text-aurora-text-muted">No songs found</div>
          ) : (
            songs.map((song) => (
              <button
                key={song.id}
                onClick={() => togglePreview(song)}
                className="flex w-full items-center gap-3 rounded-aurora-sm px-2 py-2 text-left transition-aurora hover:bg-aurora-bg"
              >
                <div
                  className="flex h-11 w-11 flex-shrink-0 items-center justify-center rounded-aurora-sm"
                  style={{ background: song.coverColor }}
                >
                  {previewingId === song.id ? (
                    <Pause size={18} className="text-white" />
                  ) : (
                    <Music size={18} className="text-white" />
                  )}
                </div>
                <div className="min-w-0 flex-1">
                  <p className="truncate text-sm font-semibold text-aurora-text">{song.title}</p>
                  <p className="truncate text-xs text-aurora-text-muted">{song.artist}</p>
                </div>
                {previewingId === song.id ? (
                  <Play size={16} className="flex-shrink-0 text-aurora-text-muted opacity-0" />
                ) : null}
                <span
                  role="button"
                  tabIndex={0}
                  onClick={(e) => {
                    e.stopPropagation();
                    audioRef.current?.pause();
                    onSelect(song);
                  }}
                  className="flex-shrink-0 rounded-full bg-aurora-gradient px-3 py-1.5 text-xs font-semibold text-white transition-aurora hover:opacity-90"
                >
                  Use
                </span>
              </button>
            ))
          )}
        </div>

        <audio ref={audioRef} onEnded={() => setPreviewingId(null)} />
      </div>
    </div>,
    document.body
  );
}
