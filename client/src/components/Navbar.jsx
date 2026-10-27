import { useEffect, useRef, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import ZentraLogo from './ZentraLogo';
import {
  Search,
  X,
  Sparkles,
  Menu,
  Users2,
  Radio,
  Settings,
  ShieldCheck,
  LogOut,
  ChevronRight,
  Film,
  CalendarDays,
  Bookmark,
} from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import api from '../services/api';
import Avatar from './Avatar';
import NotificationBell from './NotificationBell';

// Everything the desktop Sidebar can reach that the fixed 5-item mobile bottom bar
// (section 54 of the spec) has no room for. Without this, Communities, Live Rooms,
// Settings and — since the logout button below `sm` was hidden too — even signing out
// were completely unreachable once the sidebar disappeared below the `md` breakpoint.
// Reels and Events were missing from BOTH lists that a phone can reach: the bottom bar is
// a fixed 5 items, and neither was in here either — so /reels and /events existed as routes
// and sat in the desktop sidebar, but on a phone there was no link to them anywhere at all.
// Reels goes first because it's a primary destination in the spec's own navigation, not a
// settings-drawer afterthought.
const MORE_LINKS = [
  { to: '/reels', icon: Film, label: 'Reels' },
  { to: '/communities', icon: Users2, label: 'Communities' },
  { to: '/events', icon: CalendarDays, label: 'Events' },
  { to: '/live', icon: Radio, label: 'Live Rooms' },
  { to: '/saved', icon: Bookmark, label: 'Saved' },
  { to: '/settings', icon: Settings, label: 'Settings' },
];

export default function Navbar() {
  const { user, logout } = useAuth();
  const navigate = useNavigate();
  const [query, setQuery] = useState('');
  const [results, setResults] = useState(null);
  const [open, setOpen] = useState(false);
  const [menuOpen, setMenuOpen] = useState(false);
  const boxRef = useRef(null);
  const debounceRef = useRef(null);

  const isModerator = user?.role === 'moderator' || user?.role === 'admin';

  useEffect(() => {
    function onClickOutside(e) {
      if (boxRef.current && !boxRef.current.contains(e.target)) setOpen(false);
    }
    document.addEventListener('mousedown', onClickOutside);
    return () => document.removeEventListener('mousedown', onClickOutside);
  }, []);

  const handleChange = (e) => {
    const value = e.target.value;
    setQuery(value);
    clearTimeout(debounceRef.current);

    if (!value.trim()) {
      setResults(null);
      setOpen(false);
      return;
    }

    debounceRef.current = setTimeout(async () => {
      try {
        const { data } = await api.get('/search', { params: { q: value, limit: 4 } });
        setResults(data);
        setOpen(true);
      } catch {
        /* ignore */
      }
    }, 300);
  };

  const goToFullSearch = () => {
    if (!query.trim()) return;
    setOpen(false);
    navigate(`/search?q=${encodeURIComponent(query.trim())}`);
  };

  return (
    <header className="flex items-center justify-between border-b border-aurora-border px-4 py-3 lg:px-8">
      <Link to="/home" className="flex items-center gap-2">
        <motion.div
          whileHover={{ rotate: 12, scale: 1.08 }}
          transition={{ type: 'spring', stiffness: 300, damping: 12 }}
          className="flex h-8 w-8 items-center justify-center"
        >
          <ZentraLogo size={32} title="Zentra" />
        </motion.div>
        {/* Text mark hidden below `sm`: the mobile header now carries 5 icon buttons
            (search, AI chat, notifications, avatar, menu) on the right — at 360-375px
            wide, the full wordmark plus all five pushed the row past the viewport and
            caused horizontal overflow. The gradient dot alone still reads as the brand. */}
        <span className="hidden text-lg font-bold aurora-gradient-text sm:inline">Zentra</span>
      </Link>

      <div ref={boxRef} className="relative hidden flex-1 md:mx-6 md:block md:max-w-sm">
        <div className="flex items-center gap-2 rounded-full border border-aurora-border bg-aurora-card px-4 py-2">
          <Search size={16} className="flex-shrink-0 text-aurora-text-muted" />
          <input
            value={query}
            onChange={handleChange}
            onFocus={() => results && setOpen(true)}
            onKeyDown={(e) => e.key === 'Enter' && goToFullSearch()}
            placeholder="Search Zentra"
            className="w-full bg-transparent text-sm text-aurora-text outline-none placeholder:text-aurora-text-muted"
          />
          {query && (
            <button
              onClick={() => {
                setQuery('');
                setResults(null);
                setOpen(false);
              }}
            >
              <X size={14} className="text-aurora-text-muted" />
            </button>
          )}
        </div>

        <AnimatePresence>
          {open && results && (
            <motion.div
              initial={{ opacity: 0, y: -6 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -6 }}
              transition={{ duration: 0.15 }}
              className="absolute left-0 right-0 top-11 z-50 max-h-96 overflow-y-auto rounded-aurora-lg border border-aurora-border bg-aurora-card shadow-xl"
            >
              {results.users.length === 0 &&
              results.posts.length === 0 &&
              results.communities.length === 0 &&
              results.hashtags.length === 0 &&
              results.events.length === 0 ? (
                <div className="p-4 text-center text-sm text-aurora-text-muted">No results for "{query}"</div>
              ) : (
                <>
                  {results.users.slice(0, 3).map((u) => (
                    <Link
                      key={u._id}
                      to={`/profile/${u.username}`}
                      onClick={() => setOpen(false)}
                      className="flex items-center gap-3 px-4 py-2.5 transition-aurora hover:bg-aurora-bg"
                    >
                      <Avatar src={u.avatarUrl} name={u.name} size={32} />
                      <div className="min-w-0">
                        <p className="truncate text-sm font-medium text-aurora-text">{u.name}</p>
                        <p className="truncate text-xs text-aurora-text-muted">@{u.username}</p>
                      </div>
                    </Link>
                  ))}
                  {results.hashtags.slice(0, 3).map((h) => (
                    <Link
                      key={h.tag}
                      to={`/search?q=${encodeURIComponent(h.tag)}`}
                      onClick={() => setOpen(false)}
                      className="flex items-center gap-3 px-4 py-2.5 text-sm text-aurora-cyan transition-aurora hover:bg-aurora-bg"
                    >
                      {h.tag} <span className="text-xs text-aurora-text-muted">{h.count} posts</span>
                    </Link>
                  ))}
                  {results.communities.slice(0, 2).map((c) => (
                    <Link
                      key={c._id}
                      to={`/community/${c.slug}`}
                      onClick={() => setOpen(false)}
                      className="flex items-center gap-3 px-4 py-2.5 transition-aurora hover:bg-aurora-bg"
                    >
                      <span className="text-lg">{c.icon}</span>
                      <p className="truncate text-sm font-medium text-aurora-text">{c.name}</p>
                    </Link>
                  ))}
                  <button
                    onClick={goToFullSearch}
                    className="block w-full border-t border-aurora-border px-4 py-2.5 text-center text-sm font-medium text-aurora-violet transition-aurora hover:bg-aurora-bg"
                  >
                    See all results for "{query}"
                  </button>
                </>
              )}
            </motion.div>
          )}
        </AnimatePresence>
      </div>

      {user && (
        <div className="flex items-center gap-1 sm:gap-2">
          {/* The inline search box above is `hidden md:block` (no room for it next to the
              logo + icons on a phone width), so without this a mobile user had no way at
              all to start a search — Search.jsx itself only ever reads `q` from the URL,
              it doesn't render its own input. This jumps straight to the full search page,
              which now carries its own input box (see Search.jsx) for typing the query. */}
          <Link
            to="/search"
            aria-label="Search"
            className="flex h-9 w-9 items-center justify-center rounded-full text-aurora-text-muted transition-aurora hover:bg-aurora-card hover:text-aurora-violet md:hidden"
          >
            <Search size={19} />
          </Link>
          {/* Lives here rather than the mobile bottom nav — that row is a fixed 5 items
              (section 54) and isn't meant to grow, but the top bar renders on every
              screen size, so this is the one spot that reaches both desktop and mobile
              without touching that fixed set. */}
          <Link
            to="/ai-chat"
            aria-label="AI Chat"
            className="flex h-9 w-9 items-center justify-center rounded-full text-aurora-text-muted transition-aurora hover:bg-aurora-card hover:text-aurora-violet"
          >
            <Sparkles size={19} />
          </Link>
          <NotificationBell />
          <Link to={`/profile/${user.username}`}>
            <motion.div whileHover={{ scale: 1.08 }} whileTap={{ scale: 0.95 }}>
              <Avatar src={user.avatarUrl} name={user.name} size={36} />
            </motion.div>
          </Link>
          {/* Sidebar (which carries Communities, Live Rooms, Settings, Moderation, and its
              own Log out isn't in it either — see below) only renders from `md` up. Below
              that this is the single entry point to all of it, so it has to exist on every
              screen size that hides the sidebar, not just the very narrowest phones. */}
          <button
            onClick={() => setMenuOpen(true)}
            aria-label="More"
            className="flex h-9 w-9 items-center justify-center rounded-full text-aurora-text-muted transition-aurora hover:bg-aurora-card hover:text-aurora-violet md:hidden"
          >
            <Menu size={20} />
          </button>
          <button
            onClick={logout}
            className="hidden rounded-aurora-sm border border-aurora-border px-3 py-1.5 text-sm text-aurora-text transition-aurora hover:border-aurora-violet md:block"
          >
            Log out
          </button>
        </div>
      )}

      <AnimatePresence>
        {menuOpen && (
          <div className="fixed inset-0 z-50 md:hidden">
            <motion.button
              aria-label="Close menu"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => setMenuOpen(false)}
              className="absolute inset-0 bg-black/60 backdrop-blur-sm"
            />
            <motion.div
              initial={{ x: '100%' }}
              animate={{ x: 0 }}
              exit={{ x: '100%' }}
              transition={{ type: 'spring', stiffness: 320, damping: 32 }}
              className="pb-safe absolute inset-y-0 right-0 flex w-72 max-w-[85%] flex-col border-l border-aurora-border bg-aurora-card"
            >
              <div className="flex items-center justify-between border-b border-aurora-border px-4 py-3.5">
                <span className="text-sm font-bold text-aurora-text">Menu</span>
                <button
                  onClick={() => setMenuOpen(false)}
                  aria-label="Close menu"
                  className="flex h-8 w-8 items-center justify-center rounded-full text-aurora-text-muted hover:bg-aurora-bg"
                >
                  <X size={17} />
                </button>
              </div>

              <nav className="flex-1 space-y-1 overflow-y-auto p-2">
                {MORE_LINKS.map(({ to, icon: Icon, label }) => (
                  <Link
                    key={to}
                    to={to}
                    onClick={() => setMenuOpen(false)}
                    className="flex items-center gap-3 rounded-aurora-sm px-3 py-2.5 text-sm font-medium text-aurora-text transition-aurora hover:bg-aurora-bg"
                  >
                    <Icon size={18} className="text-aurora-text-muted" />
                    {label}
                    <ChevronRight size={16} className="ml-auto text-aurora-text-muted" />
                  </Link>
                ))}
                {isModerator && (
                  <Link
                    to="/moderation"
                    onClick={() => setMenuOpen(false)}
                    className="flex items-center gap-3 rounded-aurora-sm px-3 py-2.5 text-sm font-medium text-aurora-text transition-aurora hover:bg-aurora-bg"
                  >
                    <ShieldCheck size={18} className="text-aurora-text-muted" />
                    Moderation
                    <ChevronRight size={16} className="ml-auto text-aurora-text-muted" />
                  </Link>
                )}
              </nav>

              <div className="border-t border-aurora-border p-2">
                <button
                  onClick={() => {
                    setMenuOpen(false);
                    logout();
                  }}
                  className="flex w-full items-center gap-3 rounded-aurora-sm px-3 py-2.5 text-sm font-medium text-aurora-like transition-aurora hover:bg-aurora-bg"
                >
                  <LogOut size={18} />
                  Log out
                </button>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </header>
  );
}
