import { Link } from 'react-router-dom';

// Splits on @username tokens and renders each as a link to that profile, everything
// else as plain text. Doesn't validate the username exists — it's a display helper.
export default function CaptionText({ text, className = '' }) {
  if (!text) return null;
  const parts = text.split(/(@[a-z0-9_.]{3,30})/gi);

  return (
    <p className={className}>
      {parts.map((part, i) =>
        part.startsWith('@') ? (
          <Link key={i} to={`/profile/${part.slice(1)}`} className="font-medium text-aurora-cyan hover:underline">
            {part}
          </Link>
        ) : (
          <span key={i}>{part}</span>
        )
      )}
    </p>
  );
}
