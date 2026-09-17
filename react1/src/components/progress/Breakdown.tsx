import { useState } from "react";
import { useLiveQuery } from "dexie-react-hooks";
import { Card } from "@/components/ui/Card";
import { BarPair } from "@/components/ui/BarPair";
import { getBreakdown } from "@/lib/stats";
import type { BreakdownRow } from "@/types";
import { cn } from "@/lib/utils";

export function Breakdown() {
  const [by, setBy] = useState<"file" | "category">("file");
  const [rows, setRows] = useState<BreakdownRow[]>([]);

  useLiveQuery(async () => {
    const r = await getBreakdown(by);
    setRows(r);
    return r;
  }, [by]);

  return (
    <Card className="p-5">
      <div className="flex items-center justify-between mb-4">
        <div className="bp-eyebrow text-blueprint-300">细分统计</div>
        <div className="inline-flex border border-blueprint-500/20 rounded-blueprint overflow-hidden text-xs">
          {(["file", "category"] as const).map((b) => (
            <button
              key={b}
              onClick={() => setBy(b)}
              className={cn(
                "px-3 py-1 font-mono transition-colors",
                by === b ? "bg-blueprint-500 text-ink-950 font-semibold" : "text-blueprint-200 hover:bg-blueprint-500/10"
              )}
            >
              {b === "file" ? "按文件" : "按分类"}
            </button>
          ))}
        </div>
      </div>

      {rows.length === 0 ? (
        <p className="text-center text-sm text-blueprint-300 py-8">暂无统计数据</p>
      ) : (
        <div className="space-y-3">
          {rows.map((r) => (
            <div key={r.id} className="border-b border-blueprint-500/10 last:border-0 pb-3 last:pb-0">
              <div className="flex items-center justify-between mb-1.5">
                <span className="text-sm text-blueprint-50 truncate font-medium">{r.label}</span>
                <span className="font-mono text-[11px] text-blueprint-300 shrink-0 ml-2">
                  {r.answered}/{r.total} 题
                </span>
              </div>
              <BarPair completion={r.completionRate} accuracy={r.correctRate} />
            </div>
          ))}
        </div>
      )}
    </Card>
  );
}
