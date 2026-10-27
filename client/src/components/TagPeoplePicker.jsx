import { useRef, useState } from 'react';
import { Tag, X } from 'lucide-react';
import useUserSearch from '../hooks/useUserSearch';
import Avatar from './Avatar';
import AnchoredPopover from './AnchoredPopover';

export default function TagPeoplePicker({ tagged, onChange, label = 'Tag people', icon: Icon = Tag, placeholder = 'Search people to tag…' }) {
  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState('');
  const buttonRef = useRef(null);
  const results = useUserSearch(query).filter((u) => !tagged.some((t) => t.username === u.username));

  const addTag = (user) => {
    onChange([...tagged, { username: user.username, name: user.name }]);
    setQuery('');
  };

  const removeTag = (username) => {
    onChange(tagged.filter((t) => t.username !== username));
  };

  return (
    <div className="relative">
      <button
        ref={buttonRef}
        onClick={() => setOpen((o) => !o)}
        className="flex items-center gap-1.5 transition-aurora hover:text-aurora-violet"
      >
        <Icon size={16} /> {label}
      </button>

      {tagged.length > 0 && (
        <div className="mt-2 flex flex-wrap gap-1.5">
          {tagged.map((t) => (
            <span
              key={t.username}
              className="flex items-center gap-1 rounded-full bg-aurora-bg px-2.5 py-1 text-xs text-aurora-text"
            >
              {t.name}
              <button onClick={() => removeTag(t.username)} aria-label={`Remove tag ${t.name}`}>
                <X size={12} className="text-aurora-text-muted" />
              </button>
            </span>
          ))}
        </div>
      )}

      <AnchoredPopover
        open={open}
        anchorEl={buttonRef.current}
        onClose={() => setOpen(false)}
        align="left"
        placement="below"
        className="w-64 max-w-[calc(100vw-2rem)] rounded-aurora-sm border border-aurora-border bg-aurora-card p-2 shadow-aurora"
      >
        <input
          autoFocus
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          placeholder={placeholder}
          className="mb-1 w-full rounded-aurora-sm border border-aurora-border bg-aurora-bg px-3 py-1.5 text-sm text-aurora-text outline-none focus:border-aurora-violet"
        />
        <div className="max-h-48 overflow-y-auto">
          {results.map((u) => (
            <button
              key={u._id}
              onClick={() => addTag(u)}
              className="flex w-full items-center gap-2 rounded-aurora-sm px-2 py-1.5 text-left text-sm transition-aurora hover:bg-aurora-bg"
            >
              <Avatar src={u.avatarUrl} name={u.name} size={24} />
              <span className="text-aurora-text">{u.name}</span>
              <span className="text-aurora-text-muted">@{u.username}</span>
            </button>
          ))}
          {query && results.length === 0 && (
            <p className="px-2 py-1.5 text-xs text-aurora-text-muted">No matches</p>
          )}
        </div>
      </AnchoredPopover>
    </div>
  );
}
