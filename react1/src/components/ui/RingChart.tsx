interface RingChartProps {
  value: number; // 0-1
  size?: number;
  stroke?: number;
  color?: string;
  trackColor?: string;
  label?: string;
  sublabel?: string;
}

/** 环形进度图（自绘 SVG） */
export function RingChart({
  value,
  size = 120,
  stroke = 8,
  color = "#22D3EE",
  trackColor = "rgba(34,211,238,0.12)",
  label,
  sublabel,
}: RingChartProps) {
  const r = (size - stroke) / 2;
  const c = 2 * Math.PI * r;
  const v = Math.max(0, Math.min(1, value));
  const offset = c * (1 - v);
  const pctText = `${(v * 100).toFixed(0)}%`;

  return (
    <div className="relative inline-flex items-center justify-center" style={{ width: size, height: size }}>
      <svg width={size} height={size} className="-rotate-90">
        <circle cx={size / 2} cy={size / 2} r={r} fill="none" stroke={trackColor} strokeWidth={stroke} />
        <circle
          cx={size / 2}
          cy={size / 2}
          r={r}
          fill="none"
          stroke={color}
          strokeWidth={stroke}
          strokeDasharray={c}
          strokeDashoffset={offset}
          strokeLinecap="round"
          style={{ transition: "stroke-dashoffset 0.6s cubic-bezier(0.16,1,0.3,1)" }}
        />
      </svg>
      <div className="absolute inset-0 flex flex-col items-center justify-center">
        <span className="font-mono text-2xl font-bold text-blueprint-50">{label ?? pctText}</span>
        {sublabel && <span className="text-[10px] uppercase tracking-wider text-blueprint-300 mt-0.5">{sublabel}</span>}
      </div>
    </div>
  );
}
