import { useEffect, useLayoutEffect, useRef } from 'react';
import { createPortal } from 'react-dom';

// Generic version of the anchor+portal positioning already proven in ReactionPicker.jsx —
// any dropdown/popover anchored to a toolbar button can overflow the viewport once that
// button isn't near the left edge (a plain `absolute left-0` only sizes the box, it never
// repositions it), so this computes position from the anchor's live viewport rect instead
// and clamps it inside the window on every render/scroll/resize. Renders through a portal
// onto document.body so no scrolling/overflow-clipped ancestor can cut it off either.
export default function AnchoredPopover({
  open,
  anchorEl,
  onClose,
  align = 'left', // 'left' | 'right' — preferred edge to line up with the anchor, before clamping
  placement = 'below', // 'below' | 'above' — preferred side, flips automatically if there's no room
  className = '',
  children,
}) {
  const ref = useRef(null);

  useEffect(() => {
    if (!open) return undefined;
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
  }, [open, onClose, anchorEl]);

  useLayoutEffect(() => {
    if (!open) return undefined;
    const el = ref.current;
    const anchor = anchorEl;
    if (!el || !anchor) return undefined;

    const margin = 8;
    const gap = 6;

    const place = () => {
      const anchorRect = anchor.getBoundingClientRect();
      const width = el.offsetWidth;
      const height = el.offsetHeight;

      let left = align === 'right' ? anchorRect.right - width : anchorRect.left;
      left = Math.min(Math.max(left, margin), Math.max(margin, window.innerWidth - width - margin));

      let top = placement === 'above' ? anchorRect.top - height - gap : anchorRect.bottom + gap;
      // Flip to whichever side actually has room, rather than letting it run off top/bottom.
      if (placement === 'above' && top < margin) top = anchorRect.bottom + gap;
      if (placement === 'below' && top + height > window.innerHeight - margin) {
        const above = anchorRect.top - height - gap;
        if (above >= margin) top = above;
      }
      top = Math.min(Math.max(top, margin), Math.max(margin, window.innerHeight - height - margin));

      el.style.left = `${left}px`;
      el.style.top = `${top}px`;
      el.style.visibility = 'visible';
    };

    // Positioned once off-screen-safe (visibility hidden) so offsetWidth/Height are real
    // before the first paint, then measured and placed — this avoids a visible jump.
    el.style.visibility = 'hidden';
    el.style.left = '0px';
    el.style.top = '0px';
    requestAnimationFrame(place);

    window.addEventListener('resize', place);
    window.addEventListener('scroll', place, true);
    return () => {
      window.removeEventListener('resize', place);
      window.removeEventListener('scroll', place, true);
    };
  }, [open, anchorEl, align, placement]);

  if (!open) return null;

  return createPortal(
    <div ref={ref} style={{ position: 'fixed', visibility: 'hidden' }} className={`z-50 ${className}`}>
      {children}
    </div>,
    document.body
  );
}
