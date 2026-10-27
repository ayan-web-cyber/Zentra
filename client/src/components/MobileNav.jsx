import { NavLink, useNavigate } from 'react-router-dom';
import { motion } from 'framer-motion';
import { Home, Compass, MessageCircle, User, Plus } from 'lucide-react';
import { useAuth } from '../context/AuthContext';

export default function MobileNav() {
  const { user } = useAuth();
  const navigate = useNavigate();

  const items = [
    { to: '/home', icon: Home },
    { to: '/explore', icon: Compass },
  ];
  const rightItems = [
    { to: '/messages', icon: MessageCircle },
    { to: user ? `/profile/${user.username}` : '/login', icon: User },
  ];

  const renderIcon = ({ to, icon: Icon }) => (
    <NavLink key={to} to={to} className="relative flex h-11 w-11 items-center justify-center">
      {({ isActive }) => (
        <motion.div
          whileTap={{ scale: 0.85 }}
          animate={isActive ? { y: -3, scale: 1.1 } : { y: 0, scale: 1 }}
          transition={{ type: 'spring', stiffness: 400, damping: 15 }}
          className={isActive ? 'text-aurora-violet' : 'text-aurora-text-muted'}
        >
          <Icon size={22} />
        </motion.div>
      )}
    </NavLink>
  );

  return (
    // md:hidden (not lg:hidden) — the sidebar takes over as an icon rail starting at the
    // md tablet tier now, so this bottom bar should hand off there too, not a breakpoint
    // later. pb-safe adds the iPhone home-indicator clearance so the row isn't sitting
    // under/behind the gesture bar on notched devices (viewport-fit=cover in index.html
    // is what makes env(safe-area-inset-bottom) resolve to a real value at all).
    <div
      className="pb-safe fixed inset-x-0 bottom-0 z-40 flex items-center justify-around border-t border-aurora-border bg-aurora-card/75 px-2 py-2 backdrop-blur-aurora md:hidden"
    >
      {items.map(renderIcon)}

      <motion.button
        onClick={() => {
          // There's no standalone /create page — the composer lives inline at the top of
          // the Home feed. Navigate there (if not already) and scroll it into view so the
          // button actually does something useful no matter which tab it's tapped from.
          if (window.location.pathname !== '/home') {
            navigate('/home');
            requestAnimationFrame(() =>
              setTimeout(() => document.getElementById('post-composer')?.scrollIntoView({ behavior: 'smooth' }), 50)
            );
          } else {
            document.getElementById('post-composer')?.scrollIntoView({ behavior: 'smooth' });
          }
        }}
        aria-label="Create"
        whileHover={{ scale: 1.08, rotate: 90 }}
        whileTap={{ scale: 0.9, rotate: 90 }}
        transition={{ type: 'spring', stiffness: 300, damping: 15 }}
        className="flex h-12 w-12 items-center justify-center rounded-full bg-aurora-gradient text-white shadow-aurora"
      >
        <Plus size={22} />
      </motion.button>

      {rightItems.map(renderIcon)}
    </div>
  );
}
