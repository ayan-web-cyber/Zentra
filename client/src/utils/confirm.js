// App-wide confirm/prompt utility — replaces window.confirm/window.prompt everywhere.
//
// Why this exists: window.confirm/alert/prompt are native browser dialogs. A stock Android
// WebView (the exact wrapper this app is heading toward) does NOT show them unless the host
// app wires up WebChromeClient.onJsConfirm/onJsAlert/onJsPrompt — and without that, calling
// window.confirm() either does nothing or silently returns false, so every "Delete this
// post?" button would just stop working with no error. Since we can't guarantee the native
// wrapper implements those callbacks, replacing every call site with our own in-app dialog
// makes the app correct regardless of how it's wrapped.
//
// Mirrors utils/toast.js: a tiny event bus, one host component mounted once in App.jsx
// (see ConfirmDialogHost.jsx), no context wiring needed at call sites.
const EVENT_NAME = 'zentra:confirm';

let counter = 0;
const resolvers = new Map();

function open(detail) {
  return new Promise((resolve) => {
    const id = ++counter;
    resolvers.set(id, resolve);
    window.dispatchEvent(new CustomEvent(EVENT_NAME, { detail: { ...detail, id } }));
  });
}

export function resolveConfirm(id, value) {
  const resolve = resolvers.get(id);
  if (resolve) {
    resolvers.delete(id);
    resolve(value);
  }
}

export const CONFIRM_EVENT_NAME = EVENT_NAME;

/**
 * Replacement for `window.confirm`. Resolves `true`/`false`.
 * confirmDialog('Delete this post? This can’t be undone.', { danger: true })
 */
export function confirmDialog(message, { title = 'Are you sure?', confirmLabel = 'Confirm', cancelLabel = 'Cancel', danger = false } = {}) {
  return open({ kind: 'confirm', message, title, confirmLabel, cancelLabel, danger });
}

/**
 * Replacement for `window.prompt`. Resolves the entered string, or `null` if cancelled.
 * promptDialog('Reason for suspension (shown to the user):')
 */
export function promptDialog(message, { title = 'One more thing', confirmLabel = 'Submit', cancelLabel = 'Cancel', placeholder = '', defaultValue = '' } = {}) {
  return open({ kind: 'prompt', message, title, confirmLabel, cancelLabel, placeholder, defaultValue });
}
