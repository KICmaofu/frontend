interface BarPairProps {
  completion: number; // 0-1 完成率
  accuracy: number; // 0-1 正确率
  label?: string;
}

/** 双条形：完成率 + 正确率并排对比 */
export function BarPair({ completion, accuracy, label }: BarPairProps) {
  return (
    <div className="space-y-1.5">
      <div className="flex items-center gap-2 text-[11px]">
        <span className="w-16 shrink-0 text-blueprint-300 font-mono uppercase">完成</span>
        <div className="relative h-2 flex-1 bg-ink-950 rounded-blueprint overflow-hidden">
          <div
            className="absolute inset-y-0 left-0 bg-blueprint-400/70"
            style={{ width: `${Math.max(2, completion * 100)}%`, transition: "width 0.5s ease" }}
          />
        </div>
        <span className="w-10 shrink-0 text-right font-mono text-blueprint-50">
          {(completion * 100).toFixed(0)}%
        </span>
      </div>
      <div className="flex items-center gap-2 text-[11px]">
        <span className="w-16 shrink-0 text-blueprint-300 font-mono uppercase">{label ?? "正确"}</span>
        <div className="relative h-2 flex-1 bg-ink-950 rounded-blueprint overflow-hidden">
          <div
            className="absolute inset-y-0 left-0 bg-blueprint-500"
            style={{ width: `${Math.max(2, accuracy * 100)}%`, transition: "width 0.5s ease" }}
          />
        </div>
        <span className="w-10 shrink-0 text-right font-mono text-blueprint-50">
          {(accuracy * 100).toFixed(0)}%
        </span>
      </div>
    </div>
  );
}
