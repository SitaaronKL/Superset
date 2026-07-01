"use client";

// Minimal accent sparkline shared by the Weight card and the History
// PR-trend drawer. Values are ordered oldest to newest.
export function Sparkline({ values, height = 48 }: { values: number[]; height?: number }) {
  if (values.length < 2) return null;

  const W = 100;
  const H = height;
  const pad = 4;
  const min = Math.min(...values);
  const max = Math.max(...values);
  const span = max - min || 1;

  const coords = values.map((v, i) => {
    const x = pad + (i / (values.length - 1)) * (W - pad * 2);
    const y = pad + (1 - (v - min) / span) * (H - pad * 2);
    return `${x.toFixed(2)},${y.toFixed(2)}`;
  });
  const last = coords[coords.length - 1].split(",");

  return (
    <svg viewBox={`0 0 ${W} ${H}`} preserveAspectRatio="none" className="w-full" style={{ height }} aria-hidden>
      <polyline
        points={coords.join(" ")}
        fill="none"
        stroke="var(--accent-user)"
        strokeWidth={2}
        strokeLinecap="round"
        strokeLinejoin="round"
        vectorEffect="non-scaling-stroke"
      />
      <circle cx={last[0]} cy={last[1]} r={2.5} fill="var(--accent-user)" />
    </svg>
  );
}
