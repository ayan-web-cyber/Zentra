import { createContext, useContext, useEffect, useState } from 'react';

const ThemeContext = createContext(null);

export const THEME_STORAGE_KEY = 'zentra_theme';
const STORAGE_KEY = THEME_STORAGE_KEY;

function resolveSystemTheme() {
  return window.matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light';
}

export function ThemeProvider({ children }) {
  const [theme, setTheme] = useState(() => localStorage.getItem(STORAGE_KEY) || 'system');
  const [resolved, setResolved] = useState(theme === 'system' ? resolveSystemTheme() : theme);

  useEffect(() => {
    localStorage.setItem(STORAGE_KEY, theme);
    const applied = theme === 'system' ? resolveSystemTheme() : theme;
    setResolved(applied);

    // index.css keys its CSS-variable overrides off `.light`/`.dark` on <html> — both classes
    // are kept in sync (rather than just toggling one) so any future `dark:` Tailwind variant
    // usage also works without a second theming mechanism.
    document.documentElement.classList.toggle('light', applied === 'light');
    document.documentElement.classList.toggle('dark', applied === 'dark');
  }, [theme]);

  useEffect(() => {
    if (theme !== 'system') return undefined;
    const mq = window.matchMedia('(prefers-color-scheme: dark)');
    const handler = () => setResolved(resolveSystemTheme());
    mq.addEventListener('change', handler);
    return () => mq.removeEventListener('change', handler);
  }, [theme]);

  return (
    <ThemeContext.Provider value={{ theme, setTheme, resolved }}>
      {children}
    </ThemeContext.Provider>
  );
}

export function useTheme() {
  const ctx = useContext(ThemeContext);
  if (!ctx) throw new Error('useTheme must be used within a ThemeProvider');
  return ctx;
}
