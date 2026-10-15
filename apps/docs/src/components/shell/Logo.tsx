const OUTER_TILES = [
  [6, 6], [13.5, 6], [21, 6],
  [6, 13.5], [21, 13.5],
  [6, 21], [13.5, 21], [21, 21],
] as const;

export function Logo({ className }: { className?: string }) {
  return (
    <svg viewBox="0 0 32 32" aria-hidden="true" className={className}>
      <rect width="32" height="32" rx="7" className="fill-stage" />
      {OUTER_TILES.map(([x, y]) => (
        <rect key={`${x}-${y}`} x={x} y={y} width="5" height="5" rx="1" fill="#1e2d3d" />
      ))}
      <rect x="13.5" y="13.5" width="5" height="5" rx="1" className="fill-primary" />
    </svg>
  );
}
