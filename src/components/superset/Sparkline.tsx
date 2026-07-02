"use client";

// Minimal accent sparkline shared by the Weight card and the History
// PR-trend drawer. Values are ordered oldest to newest.
export function Sparkline({ values, height = 48, refValue }: {
  values: number[]; height?: number;
  // Optional reference (e.g. all-time PR): drawn as a dashed muted line.
  refValue?: number;
}) {
  if (values.length < 2) return null;

  const W = 100;
  const H = height;
  const pad = 4;
  const all = refValue !== undefined ? [...values, refValue] : values;
  const min = Math.min(...all);
  const max = Math.max(...all);
  const span = max - min || 1;
  const refY = refValue !== undefined ? pad + (1 - (refValue - min) / span) * (H - pad * 2) : null;

  const coords = values.map((v, i) => {
    const x = pad + (i / (values.length - 1)) * (W - pad * 2);
    const y = pad + (1 - (v - min) / span) * (H - pad * 2);
    return `${x.toFixed(2)},${y.toFixed(2)}`;
  });
  const last = coords[coords.length - 1].split(",");

  return (
    <svg viewBox={`0 0 ${W} ${H}`} preserveAspectRatio="none" className="w-full" style={{ height }} aria-hidden>
      {refY !== null && (
        <line x1={pad} y1={refY} x2={W - pad} y2={refY}
          stroke="var(--muted-foreground)" strokeWidth={1} strokeDasharray="3 3" opacity={0.6}
          vectorEffect="non-scaling-stroke" />
      )}
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
