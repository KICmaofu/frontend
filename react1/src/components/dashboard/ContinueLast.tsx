import { useLiveQuery } from "dexie-react-hooks";
import { db } from "@/lib/db";
import { Card } from "@/components/ui/Card";
import { Button } from "@/components/ui/Button";
import { useAppStore } from "@/store/useAppStore";
import { timeAgo, pct } from "@/lib/utils";
import { History, ArrowRight } from "lucide-react";
import { useNavigate } from "react-router-dom";

export function ContinueLast() {
  const navigate = useNavigate();
  const setActiveSession = useAppStore((s) => s.setActiveSession);
  const last = useLiveQuery(async () => {
    const sessions = await db.sessions.toArray();
    const unfinished = sessions
      .filter((s) => s.answeredCount < s.total)
      .sort((a, b) => b.startedAt - a.startedAt);
    return unfinished[0] ?? null;
  }, []);

  if (!last) return null;

  const progress = last.total ? last.answeredCount / last.total : 0;

  const resume = () => {
    setActiveSession(last.id);
    navigate(`/practice/${last.id}`);
  };

  return (
    <Card className="p-4 animate-fade-up">
      <div className="flex items-center gap-2 mb-3">
        <History size={14} className="text-amber" />
        <h3 className="bp-eyebrow text-amber">继续上次</h3>
      </div>
      <div className="flex items-center justify-between gap-4">
        <div className="min-w-0 flex-1">
          <div className="text-sm text-blueprint-50 truncate font-medium">{last.sourceLabel}</div>
          <div className="text-[11px] text-blueprint-300 mt-0.5 font-mono">
            {timeAgo(last.startedAt)} · 已答 {last.answeredCount}/{last.total} · 正确 {pct(last.answeredCount ? last.correctCount / last.answeredCount : 0)}
          </div>
          <div className="mt-2 h-1 bg-ink-950 rounded-blueprint overflow-hidden">
            <div className="h-full bg-amber" style={{ width: `${progress * 100}%`, transition: "width 0.5s" }} />
          </div>
        </div>
        <Button variant="ghost" onClick={resume} className="shrink-0">
          恢复 <ArrowRight size={14} />
        </Button>
      </div>
    </Card>
  );
}
