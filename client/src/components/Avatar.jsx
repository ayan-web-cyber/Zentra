export default function Avatar({ src, name = '', size = 40, className = '' }) {
  const initial = name?.[0]?.toUpperCase() || '?';

  if (src) {
    return (
      <img
        src={src}
        alt={name}
        width={size}
        height={size}
        className={`rounded-full object-cover ${className}`}
        style={{ width: size, height: size }}
      />
    );
  }

  return (
    <div
      className={`flex items-center justify-center rounded-full bg-aurora-gradient font-semibold text-white ${className}`}
      style={{ width: size, height: size, fontSize: size * 0.4 }}
    >
      {initial}
    </div>
  );
}
