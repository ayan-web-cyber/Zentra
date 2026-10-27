import { NavLink, useLocation } from 'react-router-dom';
import { motion } from 'framer-motion';
import {
  Home,
  Compass,
  Film,
  MessageCircle,
  Bell,
  User,
  Settings,
  Users2,
  ShieldCheck,
  Radio,
  Sparkles,
  CalendarDays,
  Bookmark,
} from 'lucide-react';
import { useAuth } from '../context/AuthContext';

const items = [
  { to: '/home', icon: Home, label: 'Home' },
  { to: '/explore', icon: Compass, label: 'Explore' },
  { to: '/reels', icon: Film, label: 'Reels' },
  { to: '/live', icon: Radio, label: 'Live Rooms' },
  { to: '/ai-chat', icon: Sparkles, label: 'AI Chat' },
  { to: '/messages', icon: MessageCircle, label: 'Messages' },
  { to: '/communities', icon: Users2, label: 'Communities' },
  // /events was a live route with no link to it anywhere in the app's navigation.
  { to: '/events', icon: CalendarDays, label: 'Events' },
  { to: '/notifications', icon: Bell, label: 'Activity' },
  { to: '/saved', icon: Bookmark, label: 'Saved' },
  { to: '/settings', icon: Settings, label: 'Settings' },
];

function NavItem({ to, icon: Icon, label, isActive }) {
  return (
    <NavLink to={to} className="relative block" aria-label={label} title={label}>
      {isActive && (
        <motion.div
          layoutId="sidebar-active-pill"
          className="absolute inset-0 rounded-aurora-sm bg-aurora-gradient"
          transition={{ type: 'spring', stiffness: 380, damping: 32 }}
        />
      )}
      <motion.div
        whileHover={{ x: isActive ? 0 : 4 }}
        whileTap={{ scale: 0.97 }}
        transition={{ type: 'spring', stiffness: 400, damping: 25 }}
        // Icon-only + centered at the md tablet tier (72px rail, no room for labels),
        // icon + label left-aligned from lg up (220px rail).
        className={`relative z-10 flex items-center justify-center gap-3 rounded-aurora-sm px-3 py-2.5 text-sm font-medium lg:justify-start ${
          isActive ? 'text-white' : 'text-aurora-text hover:bg-aurora-card'
        }`}
      >
        <motion.span
          animate={isActive ? { scale: 1.1, rotate: [0, -8, 0] } : { scale: 1, rotate: 0 }}
          transition={{ type: 'spring', stiffness: 300, damping: 12 }}
          className="flex flex-shrink-0"
        >
          <Icon size={18} />
        </motion.span>
        <span className="hidden lg:inline">{label}</span>
      </motion.div>
    </NavLink>
  );
}

export default function Sidebar() {
  const { user } = useAuth();
  const { pathname } = useLocation();

  const isModerator = user?.role === 'moderator' || user?.role === 'admin';

  const allItems = user
    ? [
        ...items,
        { to: `/profile/${user.username}`, icon: User, label: 'Profile' },
        // Only surfaced to accounts that can actually act on reports — the route itself
        // also gates access, so this is just avoiding a dead link for everyone else.
        ...(isModerator ? [{ to: '/moderation', icon: ShieldCheck, label: 'Moderation' }] : []),
      ]
    : items;

  // No visibility classes here — the parent <aside> in MainLayout already controls
  // when this renders (md and up). This used to also say `hidden lg:block`, which
  // meant the md-lg tablet tier hid the sidebar twice over and showed nothing at all
  // in that gap.
  return (
    <nav className="space-y-1">
      {allItems.map((item) => (
        <NavItem key={item.to} {...item} isActive={pathname === item.to} />
      ))}
    </nav>
  );
}
