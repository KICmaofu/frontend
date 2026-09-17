import { Button } from "@/components/ui/Button";
import { RingChart } from "@/components/ui/RingChart";
import { CheckCircle2, RotateCcw, Home, BookOpen } from "lucide-react";
import { useNavigate } from "react-router-dom";
import { formatDuration } from "@/lib/utils";
import type { PracticeSession } from "@/types";

interface SummaryProps {
  session: PracticeSession;
  onRestart: () => void;
}

export function Summary({ session, onRestart }: SummaryProps) {
  const navigate = useNavigate();
  const rate = session.answeredCount ? session.correctCount / session.answeredCount : 0;
  const duration = (session.endedAt ?? Date.now()) - session.startedAt;

  return (
    <div className="min-h-screen flex items-center justify-center p-4 bp-grid-fine bp-noise relative">
      <div className="relative z-10 bp-card bp-corner rounded-blueprint p-8 md:p-10 max-w-lg w-full animate-fade-up">
        <div className="flex items-center gap-2 mb-1">
          <CheckCircle2 size={16} className="text-emerald" />
          <span className="bp-eyebrow text-emerald">SESSION COMPLETE</span>
        </div>
        <h2 className="font-mono text-2xl text-blueprint-50 mb-1">练习结束</h2>
        <p className="text-sm text-blueprint-200 mb-6">{session.sourceLabel}</p>

        <div className="flex items-center justify-center my-8">
          <RingChart value={rate} size={160} stroke={10} sublabel="正确率" />
        </div>

        <div className="grid grid-cols-3 gap-3 mb-8">
          <Stat label="总题数" value={session.total} />
          <Stat label="已答" value={session.answeredCount} color="text-blueprint-400" />
          <Stat label="正确" value={session.correctCount} color="text-emerald" />
        </div>

        <div className="flex items-center justify-center gap-2 text-[11px] text-blueprint-300 font-mono mb-6">
          <span>用时 {formatDuration(duration)}</span>
          <span className="text-blueprint-300/40">·</span>
          <span>模式 {session.mode === "random" ? "随机" : "顺序"}</span>
        </div>

        <div className="flex flex-wrap gap-2 justify-center">
          <Button onClick={onRestart}>
            <RotateCcw size={15} /> 再来一轮
          </Button>
          <Button variant="ghost" onClick={() => navigate("/progress")}>
            <BookOpen size={15} /> 查看进度
          </Button>
          <Button variant="ghost" onClick={() => navigate("/")}>
            <Home size={15} /> 返回首页
          </Button>
        </div>
      </div>
    </div>
  );
}

function Stat({ label, value, color = "text-blueprint-50" }: { label: string; value: number; color?: string }) {
  return (
    <div className="text-center border border-blueprint-500/15 rounded-blueprint py-3 bg-ink-950/40">
      <div className={`font-mono text-2xl font-bold tabular-nums ${color}`}>{value}</div>
      <div className="bp-eyebrow mt-1">{label}</div>
    </div>
  );
}
