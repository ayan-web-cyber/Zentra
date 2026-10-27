// Tiny app-wide toast utility — no external dependency, no context provider wiring needed
// at every call site. ToastHost (mounted once in App.jsx) listens for this event and
// renders the stack; anything else (MessageBubble copy/forward, PostCard copy-link/hide,
// Settings delete-account, etc.) just calls showToast(...).
const EVENT_NAME = 'zentra:toast';

// `action` is optional: { label, onClick } — used by "Undo" flows (e.g. hide post) so the
// toast itself can offer the reversal instead of the caller building its own transient UI.
export function showToast(message, { type = 'default', duration = 2500, action = null } = {}) {
  window.dispatchEvent(new CustomEvent(EVENT_NAME, { detail: { message, type, duration, action } }));
}

export const TOAST_EVENT_NAME = EVENT_NAME;
