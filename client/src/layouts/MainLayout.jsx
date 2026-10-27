import Navbar from '../components/Navbar';
import Sidebar from '../components/Sidebar';
import MobileNav from '../components/MobileNav';

// The whole app lives inside one fixed-height shell (100dvh) instead of letting
// the <body> scroll. That used to cause the page-scrolling bugs: e.g. on the
// Reels page, an inner snap-scroll container AND the outer page were both
// scrollable at once, fighting each other and producing a double scrollbar /
// janky scroll-position jumps. Now there is exactly one scroll container per
// column, and pages that need to fully own their scroll behavior (like Reels)
// can opt into `fullBleed`, which hands them the raw, unpadded, non-scrolling
// <main> to manage themselves.
//
// Breakpoint tiers (this used to be a single jump at 1024px, which meant
// every tablet — iPad portrait/landscape, Android tablets, a laptop window
// snapped to half-screen — got the exact same cramped phone layout as a
// 375px screen, bottom nav and all):
//   < 768px  (base)  — phone: top bar + full-width content + bottom nav
//   >= 768px (md)    — tablet / narrow window: icon-only rail replaces the
//                       bottom nav so nothing is one tap away from a 5-item
//                       bar competing with on-screen keyboards and thumbs
//   >= 1024px (lg)   — laptop: full labeled sidebar (this was already fine)
//   >= 1280px (xl)   — desktop / large monitor: the right rail (trending,
//                       people you may know, suggestions — section 8 of the
//                       spec) gets its own column instead of just sitting
//                       unused, so the page actually uses the extra width
//                       instead of leaving it as dead margin either side of
//                       a fixed 1152px block
//
// `hideMobileNav` is for screens that take over the whole phone and carry their own
// way back (an open chat, for example) — there, giving the composer the full height
// beats keeping a tab bar the user can't use while typing anyway.
export default function MainLayout({ children, right, fullBleed = false, hideMobileNav = false }) {
  const gridCols = right
    ? 'md:grid-cols-[72px_1fr] lg:grid-cols-[220px_1fr] xl:grid-cols-[220px_1fr_300px]'
    : 'md:grid-cols-[72px_1fr] lg:grid-cols-[220px_1fr]';
  // Only widen the shared max-width when there's a right rail to fill that space with —
  // otherwise a single fixed-width content column is the right call even on a huge monitor
  // (an 1800px-wide line of chat/settings/profile content is harder to read, not better).
  const maxWidth = right ? 'max-w-6xl xl:max-w-[1400px]' : 'max-w-6xl';

  return (
    <div className="flex h-[100dvh] flex-col overflow-hidden bg-aurora-bg text-aurora-text">
      <Navbar />

      <div className={`mx-auto grid w-full min-h-0 ${maxWidth} flex-1 grid-cols-1 gap-4 md:gap-6 ${gridCols} md:px-4 md:py-4 lg:px-8 lg:py-6`}>
        <aside className="hidden overflow-y-auto md:block">
          <Sidebar />
        </aside>

        {/*
          fullBleed pages (Messages, AI Chat, Reels) lay out their own full-height
          column, with something pinned to the very bottom — a message composer, a
          reel's action overlay. MobileNav is `position: fixed`, so it floats over
          that bottom edge and hid those elements completely on a phone. Reserving
          --mobile-nav-h here is what puts the typing bar back on screen.

          When the page hides the bottom nav outright there's nothing to clear, but
          the phone's own home indicator still needs its inset so the composer isn't
          sitting under the gesture bar.
        */}
        <main
          className={
            fullBleed
              ? `min-h-0 min-w-0 overflow-hidden ${hideMobileNav ? 'pb-inset-bottom' : 'pb-mobile-nav'}`
              : 'min-h-0 min-w-0 overflow-y-auto px-4 pb-24 pt-4 md:px-0 md:pb-6 md:pt-0'
          }
        >
          {children}
        </main>

        {right && <aside className="hidden overflow-y-auto xl:block">{right}</aside>}
      </div>

      {!hideMobileNav && <MobileNav />}
    </div>
  );
}
