import { useRef, useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Image, Video, BarChart2, X, Sparkles, Users as UsersIcon, Mic, Music2, Trash2 } from 'lucide-react';
import api from '../services/api';
import Avatar from './Avatar';
import MentionTextarea from './MentionTextarea';
import TagPeoplePicker from './TagPeoplePicker';
import VoiceRecorder from './VoiceRecorder';
import SongPicker from './SongPicker';
import AudioPlayer from './AudioPlayer';
import AnchoredPopover from './AnchoredPopover';
import { showToast } from '../utils/toast';

const MOODS = ['😊 Happy', '😎 Cool', '❤️ Loved', '😔 Sad', '🔥 Excited', '🎉 Celebrating'];
const AI_LANGUAGES = ['Spanish', 'Hindi', 'Bengali', 'French', 'Japanese', 'Arabic'];

export default function PostComposer({ user, onPosted, communityId, placeholder }) {
  const [text, setText] = useState('');
  const [mode, setMode] = useState(null); // null | 'photo' | 'video' | 'poll' | 'voice' | 'music'
  const [file, setFile] = useState(null);
  const [preview, setPreview] = useState(null);
  const [mood, setMood] = useState('');
  const [showSongPicker, setShowSongPicker] = useState(false);
  const [selectedSong, setSelectedSong] = useState(null);
  const [tagged, setTagged] = useState([]);
  const [coAuthors, setCoAuthors] = useState([]);
  const [pollOptions, setPollOptions] = useState(['', '']);
  const [isReel, setIsReel] = useState(false);
  const [posting, setPosting] = useState(false);
  const fileInputRef = useRef(null);
  const aiButtonRef = useRef(null);

  // --- AI Assist (section 38, optional module — see server/services/aiService.js) ---
  const [aiOpen, setAiOpen] = useState(false);
  const [aiConfigured, setAiConfigured] = useState(null); // null = not checked yet
  const [aiDescription, setAiDescription] = useState('');
  const [aiCaptions, setAiCaptions] = useState([]);
  const [aiLanguage, setAiLanguage] = useState(AI_LANGUAGES[0]);
  const [aiLoading, setAiLoading] = useState(false);
  const [aiError, setAiError] = useState('');

  const openAiMenu = async () => {
    setAiOpen((o) => !o);
    setAiError('');
    if (aiConfigured === null) {
      try {
        const { data } = await api.get('/ai/status');
        setAiConfigured(data.configured);
      } catch {
        setAiConfigured(false);
      }
    }
  };

  const runAi = async (action) => {
    setAiLoading(true);
    setAiError('');
    try {
      if (action === 'suggest') {
        const { data } = await api.post('/ai/caption', { description: aiDescription || text, mood });
        setAiCaptions(data.captions);
      } else if (action === 'rewrite') {
        const { data } = await api.post('/ai/rewrite', { text });
        setText(data.text);
      } else if (action === 'translate') {
        const { data } = await api.post('/ai/translate', { text, targetLanguage: aiLanguage });
        setText(data.text);
      }
    } catch (err) {
      setAiError(err.response?.data?.message || 'AI request failed');
    } finally {
      setAiLoading(false);
    }
  };


  const resetComposer = () => {
    setText('');
    setMode(null);
    setFile(null);
    setPreview(null);
    setMood('');
    setTagged([]);
    setCoAuthors([]);
    setPollOptions(['', '']);
    setIsReel(false);
    setSelectedSong(null);
    setAiOpen(false);
    setAiCaptions([]);
    setAiDescription('');
    setAiError('');
  };

  const onPickFile = (e) => {
    const f = e.target.files?.[0];
    if (!f) return;
    setFile(f);
    setPreview(URL.createObjectURL(f));
  };

  const onSubmit = async () => {
    if (mode === 'music' && !selectedSong) return;
    if (mode === 'voice' && !file) return;
    if (mode !== 'music' && mode !== 'voice' && !text.trim() && !file && mode !== 'poll') return;
    setPosting(true);
    try {
      let mediaIds = [];
      let type = 'text';

      if (file) {
        const form = new FormData();
        form.append('file', file);
        form.append('kind', 'post');
        const { data } = await api.post('/media/upload', form);
        mediaIds = [data.media.id];
        type = mode === 'video' ? 'video' : mode === 'voice' ? 'voice' : 'photo';
      }

      let poll;
      if (mode === 'poll') {
        const options = pollOptions.filter((o) => o.trim());
        if (options.length < 2) {
          showToast('A poll needs at least two options', { type: 'error' });
          setPosting(false);
          return;
        }
        poll = { question: text, options: options.map((o) => ({ text: o, votes: [] })) };
        type = 'poll';
      }

      if (mode === 'music') type = 'music';

      const { data } = await api.post('/posts', {
        type,
        caption: mode === 'poll' ? '' : text,
        mediaIds,
        songId: mode === 'music' ? selectedSong.id : undefined,
        mood,
        poll,
        taggedUsernames: tagged.map((t) => t.username),
        coAuthorUsernames: coAuthors.map((c) => c.username),
        isReel: mode === 'video' ? isReel : false,
        communityId,
      });

      onPosted(data.post);
      resetComposer();
    } catch (err) {
      console.error('[PostComposer]', err.response?.data?.message);
    } finally {
      setPosting(false);
    }
  };

  return (
    <div className="rounded-aurora-lg border border-aurora-border bg-aurora-card p-4">
      <div className="flex items-start gap-3">
        <Avatar src={user?.avatarUrl} name={user?.name} size={40} />
        <div className="flex-1">
          <MentionTextarea
            value={text}
            onChange={setText}
            placeholder={
              mode === 'poll'
                ? "What's the poll question?"
                : mode === 'music'
                ? 'Say something about this track… (optional)'
                : mode === 'voice'
                ? 'Add a caption… (optional)'
                : placeholder || "What's on your mind? Try @someone"
            }
            rows={mode ? 2 : 1}
          />

          <AnimatePresence>
            {mode === 'voice' && (
              <motion.div
                initial={{ opacity: 0, height: 0 }}
                animate={{ opacity: 1, height: 'auto' }}
                exit={{ opacity: 0, height: 0 }}
                className="mt-2"
              >
                {file ? (
                  <div className="flex items-center gap-2">
                    <AudioPlayer src={preview} title="Your recording" variant="voice" />
                    <button
                      type="button"
                      onClick={() => {
                        setFile(null);
                        setPreview(null);
                      }}
                      aria-label="Discard recording"
                      className="flex-shrink-0 text-aurora-text-muted hover:text-aurora-like"
                    >
                      <Trash2 size={16} />
                    </button>
                  </div>
                ) : (
                  <div className="flex items-center gap-3 rounded-aurora-sm border border-aurora-border bg-aurora-bg px-4 py-3">
                    <span className="text-sm text-aurora-text-muted">Record a short voice thought…</span>
                    <VoiceRecorder
                      onSend={(voiceFile) => {
                        setFile(voiceFile);
                        setPreview(URL.createObjectURL(voiceFile));
                      }}
                      onCancel={() => {}}
                    />
                  </div>
                )}
              </motion.div>
            )}

            {mode === 'music' && (
              <motion.div
                initial={{ opacity: 0, height: 0 }}
                animate={{ opacity: 1, height: 'auto' }}
                exit={{ opacity: 0, height: 0 }}
                className="mt-2"
              >
                {selectedSong ? (
                  <div className="flex items-center gap-2">
                    <AudioPlayer
                      src={selectedSong.audioUrl}
                      title={selectedSong.title}
                      subtitle={selectedSong.artist}
                      coverColor={selectedSong.coverColor}
                      variant="music"
                    />
                    <button
                      type="button"
                      onClick={() => setShowSongPicker(true)}
                      className="flex-shrink-0 text-xs font-medium text-aurora-cyan hover:underline"
                    >
                      Change
                    </button>
                    <button
                      type="button"
                      onClick={() => setSelectedSong(null)}
                      aria-label="Remove song"
                      className="flex-shrink-0 text-aurora-text-muted hover:text-aurora-like"
                    >
                      <Trash2 size={16} />
                    </button>
                  </div>
                ) : (
                  <button
                    type="button"
                    onClick={() => setShowSongPicker(true)}
                    className="flex items-center gap-2 rounded-aurora-sm border border-dashed border-aurora-border px-4 py-3 text-sm text-aurora-text-muted transition-aurora hover:border-aurora-violet hover:text-aurora-violet"
                  >
                    <Music2 size={16} /> Choose a song
                  </button>
                )}
              </motion.div>
            )}

            {preview && mode !== 'voice' && (
              <motion.div
                initial={{ opacity: 0, height: 0 }}
                animate={{ opacity: 1, height: 'auto' }}
                exit={{ opacity: 0, height: 0 }}
                className="relative mt-2 overflow-hidden rounded-aurora-sm"
              >
                {mode === 'video' ? (
                  <video src={preview} className="max-h-64 w-full rounded-aurora-sm object-cover" controls />
                ) : (
                  <img src={preview} alt="" className="max-h-64 w-full rounded-aurora-sm object-cover" />
                )}
                <button
                  onClick={() => {
                    setFile(null);
                    setPreview(null);
                  }}
                  className="absolute right-2 top-2 flex h-7 w-7 items-center justify-center rounded-full bg-black/60 text-white"
                >
                  <X size={14} />
                </button>
                {mode === 'video' && (
                  <label className="absolute bottom-2 left-2 flex items-center gap-1.5 rounded-full bg-black/60 px-3 py-1.5 text-xs font-medium text-white">
                    <input
                      type="checkbox"
                      checked={isReel}
                      onChange={(e) => setIsReel(e.target.checked)}
                      className="accent-aurora-violet"
                    />
                    Make this a Reel
                  </label>
                )}
              </motion.div>
            )}

            {mode === 'poll' && (
              <motion.div
                initial={{ opacity: 0, height: 0 }}
                animate={{ opacity: 1, height: 'auto' }}
                exit={{ opacity: 0, height: 0 }}
                className="mt-2 space-y-2"
              >
                {pollOptions.map((opt, i) => (
                  <input
                    key={i}
                    value={opt}
                    onChange={(e) => {
                      const next = [...pollOptions];
                      next[i] = e.target.value;
                      setPollOptions(next);
                    }}
                    placeholder={`Option ${i + 1}`}
                    className="w-full rounded-aurora-sm border border-aurora-border bg-aurora-bg px-3 py-2 text-sm text-aurora-text outline-none focus:border-aurora-violet"
                  />
                ))}
                {pollOptions.length < 4 && (
                  <button
                    onClick={() => setPollOptions([...pollOptions, ''])}
                    className="text-xs font-medium text-aurora-cyan"
                  >
                    + Add option
                  </button>
                )}
              </motion.div>
            )}
          </AnimatePresence>

          <div className="mt-3 flex flex-wrap items-center gap-4 border-t border-aurora-border pt-3 text-xs font-medium text-aurora-text-muted">
            <button
              onClick={() => {
                setMode('photo');
                fileInputRef.current?.click();
              }}
              className="flex items-center gap-1.5 transition-aurora hover:text-aurora-violet"
            >
              <Image size={16} /> Photo
            </button>
            <button
              onClick={() => {
                setMode('video');
                fileInputRef.current?.click();
              }}
              className="flex items-center gap-1.5 transition-aurora hover:text-aurora-violet"
            >
              <Video size={16} /> Video
            </button>
            <button
              onClick={() => setMode(mode === 'poll' ? null : 'poll')}
              className="flex items-center gap-1.5 transition-aurora hover:text-aurora-violet"
            >
              <BarChart2 size={16} /> Poll
            </button>
            <button
              onClick={() => setMode(mode === 'voice' ? null : 'voice')}
              className={`flex items-center gap-1.5 transition-aurora hover:text-aurora-violet ${mode === 'voice' ? 'text-aurora-violet' : ''}`}
            >
              <Mic size={16} /> Voice
            </button>
            <button
              onClick={() => {
                if (mode === 'music') {
                  setMode(null);
                } else {
                  setMode('music');
                  if (!selectedSong) setShowSongPicker(true);
                }
              }}
              className={`flex items-center gap-1.5 transition-aurora hover:text-aurora-violet ${mode === 'music' ? 'text-aurora-violet' : ''}`}
            >
              <Music2 size={16} /> Music
            </button>

            <TagPeoplePicker tagged={tagged} onChange={setTagged} />

            <TagPeoplePicker
              tagged={coAuthors}
              onChange={setCoAuthors}
              label="Collaborate"
              icon={UsersIcon}
              placeholder="Search a co-author…"
            />

            <div className="relative">
              <button
                ref={aiButtonRef}
                onClick={openAiMenu}
                className="flex items-center gap-1.5 transition-aurora hover:text-aurora-violet"
              >
                <Sparkles size={16} /> AI Assist
              </button>

              <AnchoredPopover
                open={aiOpen}
                anchorEl={aiButtonRef.current}
                onClose={() => setAiOpen(false)}
                align="right"
                placement="above"
                className="w-72 max-w-[calc(100vw-2rem)] rounded-aurora-sm border border-aurora-border bg-aurora-card p-3 shadow-aurora"
              >
                {aiConfigured === null ? (
                    <p className="text-xs text-aurora-text-muted">Checking…</p>
                  ) : aiConfigured === false ? (
                    <p className="text-xs text-aurora-text-muted">
                      AI features aren't configured on this server yet. Ask an admin to set{' '}
                      <code className="rounded bg-aurora-bg px-1">AI_PROVIDER</code> in the server environment.
                    </p>
                  ) : (
                    <div className="space-y-3">
                      <div>
                        <p className="mb-1 text-xs font-semibold text-aurora-text">Suggest a caption</p>
                        <div className="flex gap-1.5">
                          <input
                            value={aiDescription}
                            onChange={(e) => setAiDescription(e.target.value)}
                            placeholder="Describe the post…"
                            className="min-w-0 flex-1 rounded-aurora-sm border border-aurora-border bg-aurora-bg px-2 py-1.5 text-xs text-aurora-text outline-none focus:border-aurora-violet"
                          />
                          <button
                            onClick={() => runAi('suggest')}
                            disabled={aiLoading || (!aiDescription.trim() && !text.trim())}
                            className="rounded-aurora-sm bg-aurora-gradient px-2.5 text-xs font-semibold text-white disabled:opacity-50"
                          >
                            Go
                          </button>
                        </div>
                        {aiCaptions.length > 0 && (
                          <div className="mt-2 space-y-1.5">
                            {aiCaptions.map((c, i) => (
                              <button
                                key={i}
                                onClick={() => {
                                  setText(c);
                                  setAiCaptions([]);
                                  setAiOpen(false);
                                }}
                                className="block w-full rounded-aurora-sm bg-aurora-bg p-2 text-left text-xs text-aurora-text transition-aurora hover:bg-aurora-border/40"
                              >
                                {c}
                              </button>
                            ))}
                          </div>
                        )}
                      </div>

                      <div className="border-t border-aurora-border pt-2">
                        <p className="mb-1 text-xs font-semibold text-aurora-text">Improve current text</p>
                        <button
                          onClick={() => runAi('rewrite')}
                          disabled={aiLoading || !text.trim()}
                          className="w-full rounded-aurora-sm border border-aurora-border py-1.5 text-xs font-medium text-aurora-text transition-aurora hover:border-aurora-violet disabled:opacity-50"
                        >
                          Rewrite for clarity
                        </button>
                      </div>

                      <div className="border-t border-aurora-border pt-2">
                        <p className="mb-1 text-xs font-semibold text-aurora-text">Translate</p>
                        <div className="flex gap-1.5">
                          <select
                            value={aiLanguage}
                            onChange={(e) => setAiLanguage(e.target.value)}
                            className="min-w-0 flex-1 rounded-aurora-sm border border-aurora-border bg-aurora-bg px-2 py-1.5 text-xs text-aurora-text outline-none"
                          >
                            {AI_LANGUAGES.map((l) => (
                              <option key={l} value={l}>
                                {l}
                              </option>
                            ))}
                          </select>
                          <button
                            onClick={() => runAi('translate')}
                            disabled={aiLoading || !text.trim()}
                            className="rounded-aurora-sm bg-aurora-gradient px-2.5 text-xs font-semibold text-white disabled:opacity-50"
                          >
                            Go
                          </button>
                        </div>
                      </div>

                      {aiLoading && <p className="text-xs text-aurora-text-muted">Working…</p>}
                      {aiError && <p className="text-xs text-aurora-like">{aiError}</p>}
                    </div>
                  )}
              </AnchoredPopover>
            </div>

            <select
              value={mood}
              onChange={(e) => setMood(e.target.value)}
              className="rounded-aurora-sm border border-aurora-border bg-aurora-bg px-2 py-1 text-xs text-aurora-text-muted outline-none"
            >
              <option value="">😊 Feeling</option>
              {MOODS.map((m) => (
                <option key={m} value={m}>
                  {m}
                </option>
              ))}
            </select>

            <motion.button
              whileHover={{ scale: 1.03 }}
              whileTap={{ scale: 0.96 }}
              onClick={onSubmit}
              disabled={posting || (mode === 'music' && !selectedSong) || (mode === 'voice' && !file)}
              className="ml-auto rounded-full bg-aurora-gradient px-5 py-1.5 text-sm font-semibold text-white disabled:opacity-60"
            >
              {posting ? 'Posting…' : 'Post'}
            </motion.button>
          </div>

          <input ref={fileInputRef} type="file" accept="image/*,video/*" hidden onChange={onPickFile} />
        </div>
      </div>

      {showSongPicker && (
        <SongPicker
          onClose={() => {
            setShowSongPicker(false);
            // Backing out of the picker with nothing chosen yet means there's no music
            // post to make — drop back to the default composer instead of leaving it
            // stuck in an empty "music" mode with no way to attach a song.
            if (!selectedSong) setMode(null);
          }}
          onSelect={(song) => {
            setSelectedSong(song);
            setShowSongPicker(false);
          }}
        />
      )}
    </div>
  );
}
