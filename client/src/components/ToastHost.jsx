import { useEffect, useRef, useState } from 'react';
import { CheckCircle2, AlertCircle, Info } from 'lucide-react';
import { TOAST_EVENT_NAME } from '../utils/toast';

let idCounter = 0;

const ICONS = {
  success: CheckCircle2,
  error: AlertCircle,
  default: Info,
};

// Mounted once near the root (see App.jsx). Renders as a fixed stack so it survives
// route changes and works the same on mobile (bottom, above the tab bar) and desktop
// (bottom-right) without any per-page wiring.
export default function ToastHost() {
  const [toasts, setToasts] = useState([]);
  // Tracks each toast's auto-dismiss timer so an action click (e.g. "Undo") can cancel it
  // instead of racing the timeout to remove the same toast twice.
  const timers = useRef({});

  useEffect(() => {
    const onToast = (e) => {
      const id = ++idCounter;
      const { message, type, duration, action } = e.detail;
      setToasts((prev) => [...prev, { id, message, type, action }]);
      timers.current[id] = setTimeout(() => {
        setToasts((prev) => prev.filter((t) => t.id !== id));
        delete timers.current[id];
      }, duration);
    };
    window.addEventListener(TOAST_EVENT_NAME, onToast);
    return () => window.removeEventListener(TOAST_EVENT_NAME, onToast);
  }, []);

  const dismiss = (id) => {
    clearTimeout(timers.current[id]);
    delete timers.current[id];
    setToasts((prev) => prev.filter((t) => t.id !== id));
  };

  if (!toasts.length) return null;

  return (
    <div
      role="status"
      aria-live="polite"
      className="pointer-events-none fixed inset-x-0 bottom-20 z-[100] flex flex-col items-center gap-2 px-4 lg:bottom-6"
    >
      {toasts.map((t) => {
        const Icon = ICONS[t.type] || ICONS.default;
        return (
          <div
            key={t.id}
            className="pointer-events-auto flex max-w-xs items-center gap-2 rounded-aurora-sm border border-aurora-border bg-aurora-card px-4 py-2.5 text-sm text-aurora-text shadow-aurora"
          >
            <Icon size={15} className={t.type === 'error' ? 'text-aurora-like' : 'text-aurora-cyan'} />
            <span>{t.message}</span>
            {t.action && (
              <button
                type="button"
                onClick={() => {
                  t.action.onClick?.();
                  dismiss(t.id);
                }}
                className="ml-1 flex-shrink-0 font-semibold text-aurora-violet transition-aurora hover:text-aurora-cyan"
              >
                {t.action.label}
              </button>
            )}
          </div>
        );
      })}
    </div>
  );
}
