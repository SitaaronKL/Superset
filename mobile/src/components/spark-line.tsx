import Svg, { Circle, Line, Polyline } from "react-native-svg";
import { useTheme } from "@/lib/theme";

// Accent trend line with an optional dashed reference (all-time PR).
export function SparkLine({ values, width, height = 56, refValue }: {
  values: number[]; width: number; height?: number; refValue?: number;
}) {
  const t = useTheme();
  if (values.length < 2 || width <= 0) return null;

  const pad = 4;
  const all = refValue !== undefined ? [...values, refValue] : values;
  const min = Math.min(...all);
  const max = Math.max(...all);
  const span = max - min || 1;

  const pts = values.map((v, i) => {
    const x = pad + (i / (values.length - 1)) * (width - pad * 2);
    const y = pad + (1 - (v - min) / span) * (height - pad * 2);
    return { x, y };
  });
  const refY = refValue !== undefined ? pad + (1 - (refValue - min) / span) * (height - pad * 2) : null;
  const last = pts[pts.length - 1];

  return (
    <Svg width={width} height={height}>
      {refY !== null && (
        <Line x1={pad} y1={refY} x2={width - pad} y2={refY}
          stroke={t.mutedFg} strokeWidth={1} strokeDasharray="3 3" opacity={0.6} />
      )}
      <Polyline
        points={pts.map((p) => `${p.x},${p.y}`).join(" ")}
        fill="none" stroke={t.accent} strokeWidth={2} strokeLinecap="round" strokeLinejoin="round"
      />
      <Circle cx={last.x} cy={last.y} r={3} fill={t.accent} />
    </Svg>
  );
}
