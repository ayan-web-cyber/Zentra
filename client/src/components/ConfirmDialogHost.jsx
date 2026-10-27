import { useEffect, useRef, useState } from 'react';
import { AlertTriangle, HelpCircle } from 'lucide-react';
import { CONFIRM_EVENT_NAME, resolveConfirm } from '../utils/confirm';

// Mounted once near the root (see App.jsx), same pattern as ToastHost. Renders whatever
// confirmDialog()/promptDialog() last asked for — see utils/confirm.js for why this exists
// instead of window.confirm/window.prompt.
export default function ConfirmDialogHost() {
  const [dialog, setDialog] = useState(null);
  const [value, setValue] = useState('');
  const inputRef = useRef(null);

  useEffect(() => {
    const onOpen = (e) => {
      setDialog(e.detail);
      setValue(e.detail.defaultValue || '');
    };
    window.addEventListener(CONFIRM_EVENT_NAME, onOpen);
    return () => window.removeEventListener(CONFIRM_EVENT_NAME, onOpen);
  }, []);

  useEffect(() => {
    if (dialog?.kind === 'prompt') {
      // Focus after the dialog has actually painted, not before.
      const t = setTimeout(() => inputRef.current?.focus(), 0);
      return () => clearTimeout(t);
    }
  }, [dialog]);

  if (!dialog) return null;

  const close = (result) => {
    resolveConfirm(dialog.id, result);
    setDialog(null);
  };

  const isPrompt = dialog.kind === 'prompt';
  const Icon = dialog.danger ? AlertTriangle : HelpCircle;

  return (
    <div
      className="fixed inset-0 z-[100] flex items-center justify-center bg-black/60 px-4"
      onClick={() => close(isPrompt ? null : false)}
      onKeyDown={(e) => e.key === 'Escape' && close(isPrompt ? null : false)}
    >
      <div
        role="alertdialog"
        aria-modal="true"
        aria-labelledby="confirm-dialog-title"
        aria-describedby="confirm-dialog-message"
        className="w-full max-w-sm rounded-aurora-lg border border-aurora-border bg-aurora-card p-5 shadow-2xl"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="mb-3 flex items-center gap-2">
          <div
            className={`flex h-9 w-9 flex-shrink-0 items-center justify-center rounded-full ${
              dialog.danger ? 'bg-aurora-like/15 text-aurora-like' : 'bg-aurora-violet/15 text-aurora-violet'
            }`}
          >
            <Icon size={18} />
          </div>
          <h2 id="confirm-dialog-title" className="text-base font-bold text-aurora-text">
            {dialog.title}
          </h2>
        </div>

        <p id="confirm-dialog-message" className="mb-4 text-sm text-aurora-text-muted">
          {dialog.message}
        </p>

        {isPrompt && (
          <input
            ref={inputRef}
            type="text"
            value={value}
            onChange={(e) => setValue(e.target.value)}
            placeholder={dialog.placeholder}
            onKeyDown={(e) => e.key === 'Enter' && close(value)}
            className="mb-4 w-full rounded-aurora-sm border border-aurora-border bg-aurora-bg px-3 py-2 text-sm text-aurora-text outline-none focus:border-aurora-violet"
          />
        )}

        <div className="flex justify-end gap-2">
          <button
            onClick={() => close(isPrompt ? null : false)}
            className="rounded-aurora-sm px-4 py-2 text-sm font-medium text-aurora-text-muted transition-aurora hover:bg-aurora-bg"
          >
            {dialog.cancelLabel}
          </button>
          <button
            onClick={() => close(isPrompt ? value : true)}
            className={`rounded-aurora-sm px-4 py-2 text-sm font-semibold text-white transition-aurora ${
              dialog.danger ? 'bg-aurora-like hover:opacity-90' : 'bg-aurora-gradient hover:opacity-90'
            }`}
          >
            {dialog.confirmLabel}
          </button>
        </div>
      </div>
    </div>
  );
}
