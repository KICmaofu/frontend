import { useLiveQuery } from "dexie-react-hooks";
import { db } from "@/lib/db";
import { Card } from "@/components/ui/Card";
import { formatDateTime, formatDuration, pct } from "@/lib/utils";
import { History as HistoryIcon, CheckCircle2, Clock } from "lucide-react";

export function History() {
  const sessions = useLiveQuery(() => db.sessions.orderBy("startedAt").reverse().toArray(), []);

  return (
    <Card className="p-5">
      <div className="flex items-center gap-2 mb-4">
        <HistoryIcon size={14} className="text-blueprint-500" />
        <div className="bp-eyebrow text-blueprint-500">练习历史</div>
      </div>

      {(!sessions || sessions.length === 0) ? (
        <p className="text-center text-sm text-blueprint-300 py-8">暂无练习记录</p>
      ) : (
        <div className="relative pl-5">
          {/* 时间轴线 */}
          <div className="absolute left-1.5 top-2 bottom-2 w-px bg-blueprint-500/20" />
          <div className="space-y-4">
            {sessions.slice(0, 30).map((s) => {
              const rate = s.answeredCount ? s.correctCount / s.answeredCount : 0;
              const finished = s.endedAt !== null && s.answeredCount >= s.total;
              return (
                <div key={s.id} className="relative">
                  <span
                    className={`absolute -left-[14px] top-1.5 h-2.5 w-2.5 rounded-full border-2 ${
                      finished ? "bg-emerald border-emerald" : "bg-amber border-amber"
                    }`}
                  />
                  <div className="border border-blueprint-500/15 rounded-blueprint p-3 bg-ink-950/40 hover:border-blueprint-500/30 transition-colors">
                    <div className="flex items-center justify-between gap-2 mb-1">
                      <span className="text-sm text-blueprint-50 truncate font-medium">{s.sourceLabel}</span>
                      <span className="font-mono text-[10px] text-blueprint-300 shrink-0">
                        {formatDateTime(s.startedAt)}
                      </span>
                    </div>
                    <div className="flex items-center gap-3 text-[11px] text-blueprint-300 font-mono">
                      <span className="flex items-center gap-1">
                        <CheckCircle2 size={11} className="text-blueprint-400" />
                        {s.correctCount}/{s.answeredCount} 正确
                      </span>
                      <span className="flex items-center gap-1">
                        <Clock size={11} />
                        {formatDuration((s.endedAt ?? Date.now()) - s.startedAt)}
                      </span>
                      <span className={rate >= 0.8 ? "text-emerald" : rate >= 0.5 ? "text-amber" : "text-blueprint-300"}>
                        {pct(rate)}
                      </span>
                      {finished ? (
                        <span className="text-emerald ml-auto">已完成</span>
                      ) : (
                        <span className="text-amber ml-auto">{s.cursor + 1}/{s.total} 进行中</span>
                      )}
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}
    </Card>
  );
}
