// Shared "chat theme" presets — a per-conversation, per-both-participants choice
// (stored on Conversation.theme) that recolors the outgoing-message gradient and
// the chat's accent color. Kept as plain CSS gradient strings rather than Tailwind
// classes because Tailwind can't generate dynamic class names from a DB value.
export const CHAT_THEMES = {
  aurora: {
    label: 'Aurora',
    gradient: 'linear-gradient(135deg, #7C3AED 0%, #06B6D4 100%)',
    accent: '#7C3AED',
  },
  sunset: {
    label: 'Sunset',
    gradient: 'linear-gradient(135deg, #F97316 0%, #EC4899 100%)',
    accent: '#F97316',
  },
  ocean: {
    label: 'Ocean',
    gradient: 'linear-gradient(135deg, #0EA5E9 0%, #22D3EE 100%)',
    accent: '#0EA5E9',
  },
  forest: {
    label: 'Forest',
    gradient: 'linear-gradient(135deg, #16A34A 0%, #84CC16 100%)',
    accent: '#16A34A',
  },
  candy: {
    label: 'Candy',
    gradient: 'linear-gradient(135deg, #F43F5E 0%, #A855F7 100%)',
    accent: '#F43F5E',
  },
};

export const DEFAULT_CHAT_THEME = 'aurora';

export function themeGradient(theme) {
  return (CHAT_THEMES[theme] || CHAT_THEMES[DEFAULT_CHAT_THEME]).gradient;
}
