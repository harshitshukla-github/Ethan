const RINGED = new Set(['saturn', 'uranus']);

/**
 * A world drawn entirely in CSS (see styles/worlds.css). Decorative: the name is always
 * shown as text next to it. `size` is the sphere's diameter in pixels; leave it out to
 * let a CSS class set `--size` instead, for example to make it responsive.
 */
export default function PlanetOrb({ id, size, className = '' }) {
  const ringed = RINGED.has(id);

  return (
    <span
      className={`orb orb--${id} ${className}`}
      style={size ? { '--size': `${size}px` } : undefined}
      aria-hidden="true"
    >
      {ringed && <span className="orb__ring orb__ring--back" />}
      <span className="orb__sphere" />
      {ringed && <span className="orb__ring orb__ring--front" />}
    </span>
  );
}
