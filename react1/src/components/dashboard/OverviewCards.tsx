import { useLiveQuery } from "dexie-react-hooks";
import { db } from "@/lib/db";
import { Card } from "@/components/ui/Card";
import { FileText, CheckCircle2, Target, AlertTriangle, BookMarked } from "lucide-react";
import { pct } from "@/lib/utils";

export function OverviewCards() {
  const data = useLiveQuery(async () => {
    const [questions, files, sessions, bookmarks] = await Promise.all([
      db.questions.count(),
      db.files.count(),
      db.sessions.toArray(),
      db.bookmarks.toArray(),
    ]);
    const latestByQ = new Map<string, boolean>();
    for (const s of sessions.sort((a, b) => a.startedAt - b.startedAt)) {
      for (const r of s.records) latestByQ.set(r.questionId, r.isCorrect);
    }
    const answered = latestByQ.size;
    const correct = Array.from(latestByQ.values()).filter(Boolean).length;
    const rate = answered ? correct / answered : 0;
    const wrongCount = bookmarks.filter((b) => b.type === "wrong").length;
    const favCount = bookmarks.filter((b) => b.type === "favorite").length;
    return { questions, files, answered, rate, wrongCount, favCount };
  });

  if (!data) {
    return (
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        {[0, 1, 2, 3].map((i) => (
          <div key={i} className="h-28 bp-card bp-corner rounded-blueprint animate-pulse" />
        ))}
      </div>
    );
  }

  const cards = [
    { label: "题目总数", value: data.questions, sub: `${data.files} 个文件`, icon: FileText, color: "text-blueprint-500" },
    { label: "已练习", value: data.answered, sub: `占总数 ${pct(data.questions ? data.answered / data.questions : 0)}`, icon: CheckCircle2, color: "text-blueprint-400" },
    { label: "正确率", value: pct(data.rate), sub: `收藏 ${data.favCount}`, icon: Target, color: "text-emerald" },
    { label: "错题本", value: data.wrongCount, sub: "待重做", icon: AlertTriangle, color: "text-amber" },
  ];

  return (
    <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 stagger">
      {cards.map((c) => {
        const Icon = c.icon;
        return (
          <Card key={c.label} className="p-4 relative overflow-hidden">
            <div className="flex items-start justify-between">
              <div>
                <div className="bp-eyebrow">{c.label}</div>
                <div className="mt-2 font-mono text-3xl font-bold text-blueprint-50 tabular-nums">
                  {c.value}
                </div>
                <div className="mt-1 text-[11px] text-blueprint-300">{c.sub}</div>
              </div>
              <Icon size={20} className={c.color} />
            </div>
            {/* 底部刻度装饰 */}
            <div className="absolute bottom-0 left-0 right-0 h-1 flex">
              {Array.from({ length: 20 }).map((_, i) => (
                <div
                  key={i}
                  className="flex-1 border-r border-ink-950 last:border-r-0"
                  style={{ background: i < 14 ? "rgba(34,211,238,0.15)" : "transparent" }}
                />
              ))}
            </div>
          </Card>
        );
      })}
    </div>
  );
}
