import { useEffect, useLayoutEffect, useRef, useState } from 'react';
import { createPortal } from 'react-dom';

export const REACTION_EMOJIS = ['❤️', '👍', '😂', '😮', '😢', '😡', '🎉'];

// Small popover of the fixed reaction set. Tapping the emoji you already reacted with
// removes it (server-side toggle) — this component just reports which emoji was tapped
// and lets the caller decide; it highlights `currentEmoji` so that's visible before tapping.
//
// This renders through a portal onto document.body with `position: fixed`, anchored to
// `anchorEl` (the react button), instead of being absolutely positioned inside the message
// bubble. The message list scrolls with `overflow-y-auto` and nothing set for overflow-x —
// per the CSS spec, setting overflow on one axis forces the other axis to compute as `auto`
// (i.e. clipped) too, so a popover absolutely positioned inside that list gets cut off by
// the list's own box for messages near either edge, no matter what transform is applied to
// it afterward — the clip happens at the ancestor, before the transform. A portal sidesteps
// that entirely: position is computed from the anchor's live viewport rect on every
// render/scroll/resize, then clamped to the viewport.
export default function ReactionPicker({ currentEmoji, onSelect, onClose, anchorEl, align = 'left' }) {
  const ref = useRef(null);
  const [style, setStyle] = useState({ position: 'fixed', top: 0, left: 0, visibility: 'hidden' });

  useEffect(() => {
    const onDocClick = (e) => {
      if (ref.current && !ref.current.contains(e.target) && !anchorEl?.contains?.(e.target)) {
        onClose?.();
      }
    };
    const onKeyDown = (e) => {
      if (e.key === 'Escape') onClose?.();
    };
    document.addEventListener('mousedown', onDocClick);
    document.addEventListener('keydown', onKeyDown);
    return () => {
      document.removeEventListener('mousedown', onDocClick);
      document.removeEventListener('keydown', onKeyDown);
    };
  }, [onClose, anchorEl]);

  useLayoutEffect(() => {
    const el = ref.current;
    const anchor = anchorEl;
    if (!el || !anchor) return;

    const margin = 8;

    const place = () => {
      const anchorRect = anchor.getBoundingClientRect();
      const pickerRect = el.getBoundingClientRect();
      const width = pickerRect.width || 260;
      const height = pickerRect.height || 44;

      // Preferred horizontal position follows `align`, then gets clamped into the
      // viewport — this is the part translateX couldn't reach before, since it's now
      // computed against window bounds, not an ancestor's clipped box.
      let left = align === 'right' ? anchorRect.right - width : anchorRect.left;
      left = Math.min(Math.max(left, margin), window.innerWidth - width - margin);

      // Prefer sitting above the anchor; flip below if there isn't room (e.g. first
      // message in a short chat).
      let top = anchorRect.top - height - 6;
      if (top < margin) top = anchorRect.bottom + 6;
      top = Math.min(top, window.innerHeight - height - margin);

      setStyle({ position: 'fixed', top, left, visibility: 'visible' });
    };

    place();
    // Capture-phase listener so scrolling the message list (which doesn't bubble a
    // 'scroll' event to window) still repositions the popover, and it doesn't drift out
    // of place relative to the anchor while it's open.
    window.addEventListener('resize', place);
    window.addEventListener('scroll', place, true);
    return () => {
      window.removeEventListener('resize', place);
      window.removeEventListener('scroll', place, true);
    };
  }, [anchorEl, align]);

  return createPortal(
    <div
      ref={ref}
      role="menu"
      aria-label="React with an emoji"
      style={style}
      className="z-50 flex max-w-[calc(100vw-2rem)] gap-1 overflow-x-auto rounded-full border border-aurora-border bg-aurora-card px-2 py-1.5 shadow-aurora"
    >
      {REACTION_EMOJIS.map((emoji) => (
        <button
          key={emoji}
          type="button"
          role="menuitemradio"
          aria-checked={currentEmoji === emoji}
          aria-label={`React ${emoji}`}
          onClick={() => {
            onSelect(emoji);
            onClose?.();
          }}
          className={`flex h-8 w-8 flex-shrink-0 items-center justify-center rounded-full text-lg transition-aurora hover:scale-125 hover:bg-aurora-bg ${
            currentEmoji === emoji ? 'bg-aurora-bg ring-1 ring-aurora-violet' : ''
          }`}
        >
          {emoji}
        </button>
      ))}
    </div>,
    document.body
  );
}
