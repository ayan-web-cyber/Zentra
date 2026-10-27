// Zentra brand mark — derived from the "Zentra Logo Identity System" sheet:
// a faceted "Z" built from two arrow-tipped bars and a diagonal connector,
// finished in the brand's violet-to-cyan gradient (#7C3AED -> #06B6D4) with a
// light diagonal shine. Rendered as inline SVG (not a raster export) so it
// stays crisp from the 16px nav icon up to the app-icon/splash sizes, and so
// it can inherit either theme's surface color for its background square.
//
// Usage:
//   <ZentraLogo size={32} />                         symbol only, transparent
//   <ZentraLogo size={40} withBackground />           rounded "app icon" tile
//   <ZentraLogo size={20} title="Zentra" />           standalone <img>-like use (adds <title>)
//
// A single gradient id is shared by every instance via a stable-but-unique
// suffix (useId) so multiple logos on one page (e.g. Navbar + a modal) don't
// clash or fall back to a browser's default black fill.
import { useId } from 'react';

export default function ZentraLogo({ size = 32, withBackground = false, className = '', title }) {
  const gradId = `zentra-z-grad-${useId()}`;

  const symbol = (
    <svg
      viewBox="0 0 100 100"
      width={withBackground ? Math.round(size * 0.62) : size}
      height={withBackground ? Math.round(size * 0.62) : size}
      role={title ? 'img' : 'presentation'}
      aria-hidden={title ? undefined : true}
      className={withBackground ? '' : className}
    >
      {title && <title>{title}</title>}
      <defs>
        <linearGradient id={gradId} x1="0" y1="0" x2="100" y2="100" gradientUnits="userSpaceOnUse">
          <stop offset="0%" stopColor="#7C3AED" />
          <stop offset="100%" stopColor="#06B6D4" />
        </linearGradient>
      </defs>

      {/* top bar with left-pointing arrow tip */}
      <polygon points="12,14 88,14 88,30 12,30" fill={`url(#${gradId})`} />
      <polygon points="12,12 12,32 0,22" fill={`url(#${gradId})`} />

      {/* diagonal connector */}
      <polygon points="88,30 72,30 12,70 28,70" fill={`url(#${gradId})`} />
      {/* diagonal shine */}
      <polygon points="80,30 76,30 16,70 20,70" fill="#FFFFFF" opacity="0.35" />

      {/* bottom bar with right-pointing arrow tip */}
      <polygon points="12,70 88,70 88,86 12,86" fill={`url(#${gradId})`} />
      <polygon points="88,68 88,88 100,78" fill={`url(#${gradId})`} />
    </svg>
  );

  if (!withBackground) return symbol;

  return (
    <div
      className={`flex items-center justify-center rounded-aurora-sm ${className}`}
      style={{ width: size, height: size, backgroundColor: '#0B1020' }}
    >
      {symbol}
    </div>
  );
}
