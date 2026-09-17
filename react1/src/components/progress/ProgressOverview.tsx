import { useLiveQuery } from "dexie-react-hooks";
import { db } from "@/lib/db";
import { Card } from "@/components/ui/Card";
import { RingChart } from "@/components/ui/RingChart";
import { LineChart } from "@/components/ui/LineChart";
import { getAccuracyTrend, getStreakDays } from "@/lib/stats";
import { useEffect, useState } from "react";
import { Flame, Target, ListChecks, TrendingUp } from "lucide-react";

export function ProgressOverview() {
  const data = useLiveQuery(async () => {
    const sessions = await db.sessions.toArray();
    const latestByQ = new Map<string, boolean>();
    let totalAnswered = 0;
    for (const s of sessions.sort((a, b) => a.startedAt - b.startedAt)) {
      for (const r of s.records) {
        if (!latestByQ.has(r.questionId)) totalAnswered++;
        latestByQ.set(r.questionId, r.isCorrect);
      }
    }
    const correct = Array.from(latestByQ.values()).filter(Boolean).length;
    const rate = latestByQ.size ? correct / latestByQ.size : 0;
    return { rate, totalAnswered: latestByQ.size, sessions: sessions.length };
  }, []);

  const [trend, setTrend] = useState<{ label: string; rate: number }[]>([]);
  const [streak, setStreak] = useState(0);

  useEffect(() => {
    getAccuracyTrend(14).then(setTrend);
    getStreakDays().then(setStreak);
  }, [data]);

  return (
    <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
      {/* 正确率环 */}
      <Card className="p-5 flex flex-col items-center justify-center">
        <div className="bp-eyebrow text-blueprint-500 mb-3 self-start">总体正确率</div>
        <RingChart value={data?.rate ?? 0} size={140} stroke={10} sublabel="ACCURACY" />
        <div className="mt-3 flex items-center gap-1 text-xs text-blueprint-300 font-mono">
          <Target size={12} className="text-blueprint-400" />
          基于最近一次作答
        </div>
      </Card>

      {/* 统计数字 */}
      <div className="grid grid-cols-1 gap-4">
        <Card className="p-5 flex items-center gap-4">
          <span className="flex h-12 w-12 items-center justify-center border border-blueprint-500/30 rounded-blueprint bg-ink-950">
            <ListChecks size={20} className="text-blueprint-500" />
          </span>
          <div>
            <div className="font-mono text-3xl font-bold text-blueprint-50 tabular-nums">
              {data?.totalAnswered ?? 0}
            </div>
            <div className="bp-eyebrow mt-0.5">累计已答题数</div>
          </div>
        </Card>
        <Card className="p-5 flex items-center gap-4">
          <span className="flex h-12 w-12 items-center justify-center border border-amber/30 rounded-blueprint bg-ink-950">
            <Flame size={20} className="text-amber" />
          </span>
          <div>
            <div className="font-mono text-3xl font-bold text-blueprint-50 tabular-nums">{streak}</div>
            <div className="bp-eyebrow mt-0.5">连续练习天数</div>
          </div>
        </Card>
      </div>

      {/* 趋势折线 */}
      <Card className="p-5 lg:col-span-1">
        <div className="flex items-center gap-2 mb-2">
          <TrendingUp size={14} className="text-blueprint-500" />
          <div className="bp-eyebrow text-blueprint-500">正确率趋势</div>
        </div>
        <LineChart data={trend} />
        <p className="text-[11px] text-blueprint-300 font-mono mt-2 text-center">
          最近 {trend.length} 次练习会话
        </p>
      </Card>
    </div>
  );
}
