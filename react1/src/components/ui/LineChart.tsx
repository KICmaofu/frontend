interface LineChartProps {
  data: { label: string; rate: number }[];
  width?: number;
  height?: number;
}

/** 折线图（自绘 SVG）- 正确率趋势 */
export function LineChart({ data, width = 480, height = 120 }: LineChartProps) {
  if (data.length === 0) {
    return (
      <div className="flex h-[120px] items-center justify-center text-xs text-blueprint-300 font-mono">
        暂无练习数据
      </div>
    );
  }
  const pad = 8;
  const w = width - pad * 2;
  const h = height - pad * 2 - 16;
  const stepX = data.length > 1 ? w / (data.length - 1) : 0;
  const points = data.map((d, i) => ({
    x: pad + i * stepX,
    y: pad + h - d.rate * h,
    ...d,
  }));
  const path = points.map((p, i) => `${i === 0 ? "M" : "L"}${p.x},${p.y}`).join(" ");
  const areaPath = `${path} L${points[points.length - 1].x},${pad + h} L${points[0].x},${pad + h} Z`;

  return (
    <svg width="100%" viewBox={`0 0 ${width} ${height}`} className="overflow-visible">
      <defs>
        <linearGradient id="lineGrad" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor="#22D3EE" stopOpacity="0.35" />
          <stop offset="100%" stopColor="#22D3EE" stopOpacity="0" />
        </linearGradient>
      </defs>
      {/* 网格 */}
      {[0.25, 0.5, 0.75].map((g) => (
        <line
          key={g}
          x1={pad}
          x2={width - pad}
          y1={pad + h - g * h}
          y2={pad + h - g * h}
          stroke="rgba(34,211,238,0.08)"
          strokeWidth="1"
        />
      ))}
      <path d={areaPath} fill="url(#lineGrad)" />
      <path d={path} fill="none" stroke="#22D3EE" strokeWidth="1.5" strokeLinejoin="round" strokeLinecap="round" />
      {points.map((p, i) => (
        <g key={i}>
          <circle cx={p.x} cy={p.y} r="2.5" fill="#0E1116" stroke="#22D3EE" strokeWidth="1.5" />
        </g>
      ))}
    </svg>
  );
}
