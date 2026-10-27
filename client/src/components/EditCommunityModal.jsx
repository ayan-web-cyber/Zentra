import { useRef, useState } from 'react';
import { X, Camera, ImagePlus } from 'lucide-react';
import api from '../services/api';

const ICONS = ['💬', '💻', '🎮', '📷', '🎵', '📚', '⚽', '✈️', '🎨', '🍳', '💪', '💼'];
const CATEGORIES = [
  'Technology',
  'Gaming',
  'Photography',
  'Music',
  'Sports',
  'Travel',
  'Education',
  'Art',
  'Food',
  'Fitness',
  'Business',
  'Other',
];

export default function EditCommunityModal({ community, onClose, onSaved }) {
  const [name, setName] = useState(community.name);
  const [description, setDescription] = useState(community.description || '');
  const [icon, setIcon] = useState(community.icon || ICONS[0]);
  const [category, setCategory] = useState(community.category || 'Other');
  const [privacy, setPrivacy] = useState(community.privacy || 'public');
  const [avatarPreview, setAvatarPreview] = useState(community.avatar?.url || null);
  const [coverPreview, setCoverPreview] = useState(community.cover?.url || null);
  const [avatarId, setAvatarId] = useState(community.avatar?.id || undefined);
  const [coverId, setCoverId] = useState(community.cover?.id || undefined);
  const [uploading, setUploading] = useState(false);
  const [error, setError] = useState(null);
  const [saving, setSaving] = useState(false);

  const avatarInputRef = useRef(null);
  const coverInputRef = useRef(null);

  const uploadImage = async (file, setPreview, setId) => {
    setUploading(true);
    setError(null);
    try {
      const form = new FormData();
      form.append('file', file);
      form.append('kind', 'community');
      const { data } = await api.post('/media/upload', form);
      setPreview(URL.createObjectURL(file));
      setId(data.media.id);
    } catch (err) {
      setError(err.response?.data?.message || 'Could not upload image.');
    } finally {
      setUploading(false);
    }
  };

  const submit = async () => {
    if (!name.trim()) {
      setError('Give your community a name.');
      return;
    }
    setSaving(true);
    setError(null);
    try {
      const { data } = await api.put(`/communities/${community._id}`, {
        name,
        description,
        icon,
        category,
        privacy,
        avatarId,
        coverId,
      });
      onSaved(data.community);
      onClose();
    } catch (err) {
      setError(err.response?.data?.message || 'Could not save changes.');
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 px-4">
      <div className="max-h-[90vh] w-full max-w-md overflow-y-auto rounded-aurora-lg border border-aurora-border bg-aurora-card p-5">
        <div className="mb-4 flex items-center justify-between">
          <h2 className="text-lg font-bold text-aurora-text">Edit community</h2>
          <button onClick={onClose} aria-label="Close" className="text-aurora-text-muted hover:text-aurora-text">
            <X size={20} />
          </button>
        </div>

        <div className="space-y-4">
          <div className="relative">
            <div
              className="h-28 w-full cursor-pointer rounded-aurora-sm bg-aurora-gradient bg-cover bg-center"
              style={coverPreview ? { backgroundImage: `url(${coverPreview})` } : undefined}
              onClick={() => coverInputRef.current?.click()}
            >
              <div className="flex h-full w-full items-center justify-center rounded-aurora-sm bg-black/30 text-white opacity-0 transition-aurora hover:opacity-100">
                <ImagePlus size={20} />
                <span className="ml-1.5 text-xs font-medium">Change cover</span>
              </div>
            </div>
            <input
              ref={coverInputRef}
              type="file"
              accept="image/*"
              className="hidden"
              onChange={(e) => e.target.files?.[0] && uploadImage(e.target.files[0], setCoverPreview, setCoverId)}
            />

            <button
              type="button"
              onClick={() => avatarInputRef.current?.click()}
              className="absolute -bottom-6 left-3 flex h-14 w-14 items-center justify-center overflow-hidden rounded-2xl border-4 border-aurora-card bg-aurora-bg text-2xl"
            >
              {avatarPreview ? (
                <img src={avatarPreview} alt="" className="h-full w-full object-cover" />
              ) : (
                icon
              )}
              <div className="absolute inset-0 flex items-center justify-center bg-black/30 text-white opacity-0 transition-aurora hover:opacity-100">
                <Camera size={16} />
              </div>
            </button>
            <input
              ref={avatarInputRef}
              type="file"
              accept="image/*"
              className="hidden"
              onChange={(e) => e.target.files?.[0] && uploadImage(e.target.files[0], setAvatarPreview, setAvatarId)}
            />
          </div>

          <div className="pt-6">
            <label className="mb-1 block text-xs font-medium text-aurora-text-muted">Name</label>
            <input
              value={name}
              onChange={(e) => setName(e.target.value)}
              maxLength={60}
              className="w-full rounded-aurora-sm border border-aurora-border bg-aurora-bg px-3 py-2 text-sm text-aurora-text outline-none focus:border-aurora-violet"
            />
          </div>

          <div>
            <label className="mb-1 block text-xs font-medium text-aurora-text-muted">Bio</label>
            <textarea
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              rows={3}
              maxLength={500}
              className="w-full resize-none rounded-aurora-sm border border-aurora-border bg-aurora-bg px-3 py-2 text-sm text-aurora-text outline-none focus:border-aurora-violet"
            />
          </div>

          {!avatarPreview && (
            <div>
              <label className="mb-1 block text-xs font-medium text-aurora-text-muted">Icon (used until you set a photo)</label>
              <div className="flex flex-wrap gap-2">
                {ICONS.map((i) => (
                  <button
                    key={i}
                    onClick={() => setIcon(i)}
                    className={`flex h-9 w-9 items-center justify-center rounded-aurora-sm border text-lg transition-aurora ${
                      icon === i ? 'border-aurora-violet bg-aurora-violet/10' : 'border-aurora-border hover:border-aurora-violet'
                    }`}
                  >
                    {i}
                  </button>
                ))}
              </div>
            </div>
          )}

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="mb-1 block text-xs font-medium text-aurora-text-muted">Category</label>
              <select
                value={category}
                onChange={(e) => setCategory(e.target.value)}
                className="w-full rounded-aurora-sm border border-aurora-border bg-aurora-bg px-3 py-2 text-sm text-aurora-text outline-none focus:border-aurora-violet"
              >
                {CATEGORIES.map((c) => (
                  <option key={c} value={c}>
                    {c}
                  </option>
                ))}
              </select>
            </div>
            <div>
              <label className="mb-1 block text-xs font-medium text-aurora-text-muted">Privacy</label>
              <select
                value={privacy}
                onChange={(e) => setPrivacy(e.target.value)}
                className="w-full rounded-aurora-sm border border-aurora-border bg-aurora-bg px-3 py-2 text-sm text-aurora-text outline-none focus:border-aurora-violet"
              >
                <option value="public">Public</option>
                <option value="private">Private</option>
              </select>
            </div>
          </div>

          {error && <p className="text-xs text-aurora-like">{error}</p>}

          <button
            onClick={submit}
            disabled={saving || uploading}
            className="w-full rounded-full bg-aurora-gradient py-2.5 text-sm font-semibold text-white transition-aurora hover:opacity-90 disabled:opacity-60"
          >
            {uploading ? 'Uploading…' : saving ? 'Saving…' : 'Save changes'}
          </button>
        </div>
      </div>
    </div>
  );
}
