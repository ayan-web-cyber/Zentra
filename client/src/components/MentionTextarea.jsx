import { useRef, useState } from 'react';
import useUserSearch from '../hooks/useUserSearch';
import Avatar from './Avatar';

// A plain textarea that watches for an "@token" being typed right before the cursor
// and shows a matching-user dropdown; picking one replaces the token with "@username ".
export default function MentionTextarea({ value, onChange, placeholder, rows = 1 }) {
  const textareaRef = useRef(null);
  const [mentionQuery, setMentionQuery] = useState('');
  const [mentionStart, setMentionStart] = useState(null);
  const results = useUserSearch(mentionQuery);

  const handleChange = (e) => {
    const text = e.target.value;
    const cursor = e.target.selectionStart;
    onChange(text);

    const upToCursor = text.slice(0, cursor);
    const match = upToCursor.match(/(?:^|\s)@([a-z0-9_.]{0,30})$/i);
    if (match) {
      setMentionStart(cursor - match[1].length - 1);
      setMentionQuery(match[1]);
    } else {
      setMentionStart(null);
      setMentionQuery('');
    }
  };

  const pickMention = (username) => {
    const cursor = textareaRef.current.selectionStart;
    const before = value.slice(0, mentionStart);
    const after = value.slice(cursor);
    const next = `${before}@${username} ${after}`;
    onChange(next);
    setMentionStart(null);
    setMentionQuery('');
    requestAnimationFrame(() => textareaRef.current?.focus());
  };

  return (
    <div className="relative">
      <textarea
        ref={textareaRef}
        value={value}
        onChange={handleChange}
        placeholder={placeholder}
        rows={rows}
        className="w-full resize-none bg-transparent text-sm text-aurora-text outline-none placeholder:text-aurora-text-muted"
      />

      {mentionStart !== null && results.length > 0 && (
        <div className="absolute left-0 top-full z-20 mt-1 w-56 max-w-[calc(100vw-2rem)] overflow-hidden rounded-aurora-sm border border-aurora-border bg-aurora-card shadow-aurora">
          {results.map((u) => (
            <button
              key={u._id}
              onClick={() => pickMention(u.username)}
              className="flex w-full items-center gap-2 px-3 py-2 text-left text-sm transition-aurora hover:bg-aurora-bg"
            >
              <Avatar src={u.avatarUrl} name={u.name} size={24} />
              <span className="text-aurora-text">{u.name}</span>
              <span className="text-aurora-text-muted">@{u.username}</span>
            </button>
          ))}
        </div>
      )}
    </div>
  );
}
