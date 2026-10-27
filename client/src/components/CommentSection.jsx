import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import api from '../services/api';
import Avatar from './Avatar';

export default function CommentSection({ postId, onCommentPosted }) {
  const [comments, setComments] = useState([]);
  const [text, setText] = useState('');
  const [loading, setLoading] = useState(true);

  const load = async () => {
    const { data } = await api.get(`/posts/${postId}/comments`);
    setComments(data.comments);
    setLoading(false);
  };

  useEffect(() => {
    load();
  }, [postId]);

  const submit = async () => {
    if (!text.trim()) return;
    const { data } = await api.post(`/posts/${postId}/comments`, { text });
    setComments((prev) => [...prev, { ...data.comment, replies: [] }]);
    setText('');
    // Optional — PostCard already shows its own commentCount from the post object and
    // doesn't need this, but Reels' overlay counter has no other way to hear about a
    // comment just added from inside this component.
    onCommentPosted?.(data.comment);
  };

  return (
    <div className="mt-3 border-t border-aurora-border pt-3">
      {loading ? (
        <p className="text-xs text-aurora-text-muted">Loading comments…</p>
      ) : (
        <div className="space-y-3">
          {comments.map((c) => (
            <div key={c._id}>
              <div className="flex items-start gap-2">
                <Link to={`/profile/${c.author?.username}`} className="flex-shrink-0">
                  <Avatar src={c.author?.avatarUrl} name={c.author?.name} size={28} />
                </Link>
                <div className="rounded-aurora-sm bg-aurora-bg px-3 py-1.5 text-sm">
                  <Link
                    to={`/profile/${c.author?.username}`}
                    className="mr-1.5 font-semibold text-aurora-text hover:text-aurora-cyan hover:underline"
                  >
                    {c.author?.name}
                  </Link>
                  <span className="text-aurora-text">{c.text}</span>
                </div>
              </div>
              {c.replies?.length > 0 && (
                <div className="ml-9 mt-2 space-y-2">
                  {c.replies.map((r) => (
                    <div key={r._id} className="flex items-start gap-2">
                      <Link to={`/profile/${r.author?.username}`} className="flex-shrink-0">
                        <Avatar src={r.author?.avatarUrl} name={r.author?.name} size={24} />
                      </Link>
                      <div className="rounded-aurora-sm bg-aurora-bg px-3 py-1.5 text-sm">
                        <Link
                          to={`/profile/${r.author?.username}`}
                          className="mr-1.5 font-semibold text-aurora-text hover:text-aurora-cyan hover:underline"
                        >
                          {r.author?.name}
                        </Link>
                        <span className="text-aurora-text">{r.text}</span>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          ))}
        </div>
      )}

      <div className="mt-3 flex items-center gap-2">
        <input
          value={text}
          onChange={(e) => setText(e.target.value)}
          onKeyDown={(e) => e.key === 'Enter' && submit()}
          placeholder="Write a comment…"
          className="flex-1 rounded-full border border-aurora-border bg-aurora-bg px-4 py-1.5 text-sm text-aurora-text outline-none focus:border-aurora-violet"
        />
        <button onClick={submit} className="text-sm font-semibold text-aurora-cyan">
          Post
        </button>
      </div>
    </div>
  );
}
