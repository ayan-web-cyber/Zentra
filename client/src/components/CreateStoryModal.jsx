import { useRef, useState } from 'react';
import { X, Image, Video, Type, Music, Type as TypeIcon } from 'lucide-react';
import api from '../services/api';
import SongPicker from './SongPicker';

const COLORS = ['#7C3AED', '#06B6D4', '#F43F5E', '#0B1020', '#14532D'];
const OVERLAY_COLORS = ['#FFFFFF', '#0B1020', '#F43F5E', '#06B6D4', '#F59E0B'];
const OVERLAY_POSITIONS = ['top', 'center', 'bottom'];

export default function CreateStoryModal({ onClose, onCreated }) {
  const [mode, setMode] = useState(null); // 'photo' | 'video' | 'text'
  const [file, setFile] = useState(null);
  const [preview, setPreview] = useState(null);
  const [text, setText] = useState('');
  const [color, setColor] = useState(COLORS[0]);
  const [caption, setCaption] = useState('');

  const [addingOverlay, setAddingOverlay] = useState(false);
  const [overlayText, setOverlayText] = useState('');
  const [overlayColor, setOverlayColor] = useState(OVERLAY_COLORS[0]);
  const [overlayPosition, setOverlayPosition] = useState('center');

  const [showSongPicker, setShowSongPicker] = useState(false);
  const [song, setSong] = useState(null); // { id, title, artist, audioUrl, coverColor }
  const [keepOriginalAudio, setKeepOriginalAudio] = useState(false);

  const [posting, setPosting] = useState(false);
  const fileInputRef = useRef(null);

  const pickFile = (m) => {
    setMode(m);
    fileInputRef.current?.click();
  };

  const onFileChange = (e) => {
    const f = e.target.files?.[0];
    if (!f) return;
    setFile(f);
    setPreview(URL.createObjectURL(f));
  };

  const overlayStyle = {
    top: 'items-start pt-10',
    center: 'items-center',
    bottom: 'items-end pb-10',
  }[overlayPosition];

  const submit = async () => {
    setPosting(true);
    try {
      const songFields = song
        ? { songId: song.id, songStartTime: 0, keepOriginalAudio: mode === 'video' && keepOriginalAudio }
        : {};

      if (mode === 'text') {
        await api.post('/stories', { type: 'text', textContent: text, backgroundColor: color, ...songFields });
      } else {
        const form = new FormData();
        form.append('file', file);
        form.append('kind', 'story');
        const { data } = await api.post('/media/upload', form);
        await api.post('/stories', {
          type: mode,
          mediaId: data.media.id,
          caption: caption.trim() || undefined,
          textOverlay: overlayText.trim()
            ? { text: overlayText.trim(), color: overlayColor, position: overlayPosition }
            : undefined,
          ...songFields,
        });
      }
      onCreated();
    } catch (err) {
      console.error('[CreateStoryModal]', err.response?.data?.message);
    } finally {
      setPosting(false);
    }
  };

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center bg-black/70 px-4">
      <div className="max-h-[92vh] w-full max-w-sm overflow-y-auto rounded-aurora-lg border border-aurora-border bg-aurora-card p-6">
        <div className="mb-4 flex items-center justify-between">
          <h2 className="text-lg font-bold text-aurora-text">Create story</h2>
          <button onClick={onClose} aria-label="Close" className="text-aurora-text-muted hover:text-aurora-text">
            <X size={20} />
          </button>
        </div>

        {!mode && (
          <div className="grid grid-cols-3 gap-3">
            <button
              onClick={() => pickFile('photo')}
              className="flex flex-col items-center gap-2 rounded-aurora-sm border border-aurora-border py-4 text-xs text-aurora-text transition-aurora hover:border-aurora-violet"
            >
              <Image size={22} /> Photo
            </button>
            <button
              onClick={() => pickFile('video')}
              className="flex flex-col items-center gap-2 rounded-aurora-sm border border-aurora-border py-4 text-xs text-aurora-text transition-aurora hover:border-aurora-violet"
            >
              <Video size={22} /> Video
            </button>
            <button
              onClick={() => setMode('text')}
              className="flex flex-col items-center gap-2 rounded-aurora-sm border border-aurora-border py-4 text-xs text-aurora-text transition-aurora hover:border-aurora-violet"
            >
              <Type size={22} /> Text
            </button>
          </div>
        )}

        {mode === 'text' && (
          <div>
            <div
              className="mb-3 flex h-48 items-center justify-center rounded-aurora-sm p-4 text-center text-lg font-semibold text-white"
              style={{ background: color }}
            >
              <textarea
                value={text}
                onChange={(e) => setText(e.target.value)}
                maxLength={200}
                placeholder="Type your story…"
                className="h-full w-full resize-none bg-transparent text-center outline-none placeholder:text-white/70"
              />
            </div>
            <div className="mb-4 flex justify-center gap-2">
              {COLORS.map((c) => (
                <button
                  key={c}
                  onClick={() => setColor(c)}
                  className="h-7 w-7 rounded-full border-2"
                  style={{ background: c, borderColor: color === c ? '#F8FAFC' : 'transparent' }}
                  aria-label={`Background ${c}`}
                />
              ))}
            </div>
          </div>
        )}

        {(mode === 'photo' || mode === 'video') && preview && (
          <>
            <div className="relative mb-3 overflow-hidden rounded-aurora-sm">
              {mode === 'video' ? (
                <video src={preview} className="max-h-64 w-full object-cover" muted loop autoPlay playsInline />
              ) : (
                <img src={preview} alt="" className="max-h-64 w-full object-cover" />
              )}

              {overlayText.trim() && (
                <div className={`pointer-events-none absolute inset-0 flex justify-center px-4 text-center ${overlayStyle}`}>
                  <span
                    className="max-w-full break-words text-lg font-bold drop-shadow-[0_1px_6px_rgba(0,0,0,0.6)]"
                    style={{ color: overlayColor }}
                  >
                    {overlayText}
                  </span>
                </div>
              )}
            </div>

            {/* Add-text-on-media toggle */}
            {!addingOverlay ? (
              <button
                onClick={() => setAddingOverlay(true)}
                className="mb-3 flex items-center gap-1.5 rounded-full border border-aurora-border px-3 py-1.5 text-xs font-medium text-aurora-text transition-aurora hover:border-aurora-violet"
              >
                <TypeIcon size={14} /> {overlayText ? 'Edit text' : 'Add text'}
              </button>
            ) : (
              <div className="mb-3 rounded-aurora-sm border border-aurora-border p-3">
                <input
                  value={overlayText}
                  onChange={(e) => setOverlayText(e.target.value)}
                  maxLength={120}
                  placeholder="Add text on your photo/video…"
                  className="mb-2 w-full rounded-aurora-sm border border-aurora-border bg-aurora-bg px-3 py-2 text-sm text-aurora-text outline-none focus:border-aurora-violet"
                />
                <div className="mb-2 flex items-center justify-between">
                  <div className="flex gap-1.5">
                    {OVERLAY_COLORS.map((c) => (
                      <button
                        key={c}
                        onClick={() => setOverlayColor(c)}
                        className="h-6 w-6 rounded-full border-2"
                        style={{ background: c, borderColor: overlayColor === c ? '#7C3AED' : 'transparent' }}
                        aria-label={`Text color ${c}`}
                      />
                    ))}
                  </div>
                  <div className="flex gap-1">
                    {OVERLAY_POSITIONS.map((p) => (
                      <button
                        key={p}
                        onClick={() => setOverlayPosition(p)}
                        className={`rounded-full px-2 py-1 text-[10px] font-semibold capitalize transition-aurora ${
                          overlayPosition === p
                            ? 'bg-aurora-gradient text-white'
                            : 'border border-aurora-border text-aurora-text-muted'
                        }`}
                      >
                        {p}
                      </button>
                    ))}
                  </div>
                </div>
                <button onClick={() => setAddingOverlay(false)} className="text-xs font-medium text-aurora-cyan">
                  Done
                </button>
              </div>
            )}

            {/* Caption */}
            <input
              value={caption}
              onChange={(e) => setCaption(e.target.value)}
              maxLength={300}
              placeholder="Write a caption…"
              className="mb-3 w-full rounded-aurora-sm border border-aurora-border bg-aurora-bg px-3 py-2 text-sm text-aurora-text outline-none focus:border-aurora-violet"
            />

            {/* Music */}
            {!song ? (
              <button
                onClick={() => setShowSongPicker(true)}
                className="mb-4 flex items-center gap-1.5 rounded-full border border-aurora-border px-3 py-1.5 text-xs font-medium text-aurora-text transition-aurora hover:border-aurora-violet"
              >
                <Music size={14} /> Add a song
              </button>
            ) : (
              <div className="mb-4 rounded-aurora-sm border border-aurora-border p-3">
                <div className="flex items-center gap-3">
                  <div
                    className="flex h-9 w-9 flex-shrink-0 items-center justify-center rounded-aurora-sm"
                    style={{ background: song.coverColor }}
                  >
                    <Music size={16} className="text-white" />
                  </div>
                  <div className="min-w-0 flex-1">
                    <p className="truncate text-sm font-semibold text-aurora-text">{song.title}</p>
                    <p className="truncate text-xs text-aurora-text-muted">{song.artist}</p>
                  </div>
                  <button
                    onClick={() => setSong(null)}
                    aria-label="Remove song"
                    className="flex-shrink-0 text-aurora-text-muted hover:text-aurora-text"
                  >
                    <X size={16} />
                  </button>
                </div>

                {mode === 'video' && (
                  <label className="mt-3 flex items-center gap-2 text-xs font-medium text-aurora-text-muted">
                    <input
                      type="checkbox"
                      checked={keepOriginalAudio}
                      onChange={(e) => setKeepOriginalAudio(e.target.checked)}
                      className="accent-aurora-violet"
                    />
                    Keep the video's original sound too
                  </label>
                )}
              </div>
            )}
          </>
        )}

        <input ref={fileInputRef} type="file" accept="image/*,video/*" hidden onChange={onFileChange} />

        {mode && (
          <button
            onClick={submit}
            disabled={posting || ((mode === 'photo' || mode === 'video') && !file) || (mode === 'text' && !text.trim())}
            className="w-full rounded-aurora-sm bg-aurora-gradient py-2.5 font-semibold text-white transition-aurora hover:opacity-90 disabled:opacity-60"
          >
            {posting ? 'Posting…' : 'Share to story'}
          </button>
        )}
      </div>

      {showSongPicker && (
        <SongPicker
          onClose={() => setShowSongPicker(false)}
          onSelect={(s) => {
            setSong(s);
            setShowSongPicker(false);
          }}
        />
      )}
    </div>
  );
}
