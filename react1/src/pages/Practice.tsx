import { useEffect, useMemo, useState } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { useLiveQuery } from "dexie-react-hooks";
import { db } from "@/lib/db";
import {
  submitAnswer,
  advanceCursor,
  endSession,
  toggleFavorite,
  toggleWrongMark,
  createSession,
} from "@/lib/practice";
import { QuestionCard } from "@/components/practice/QuestionCard";
import { Summary } from "@/components/practice/Summary";
import { Button } from "@/components/ui/Button";
import { Modal } from "@/components/ui/Modal";
import {
  ChevronLeft,
  ChevronRight,
  Star,
  AlertTriangle,
  Grid3x3,
  X,
  Check,
  Flag,
  Shuffle,
  ArrowLeft,
} from "lucide-react";
import { cn, typeLabel } from "@/lib/utils";

export default function Practice() {
  const { sessionId } = useParams<{ sessionId: string }>();
  const navigate = useNavigate();

  const session = useLiveQuery(() => (sessionId ? db.sessions.get(sessionId) : undefined), [sessionId]);

  const questions = useLiveQuery(async () => {
    if (!session) return [];
    const ids = session.sequence;
    const all = await db.questions.bulkGet(ids);
    return ids.map((id) => all.find((q) => q?.id === id)).filter(Boolean) as NonNullable<typeof all[number]>[];
  }, [session?.id, session?.sequence.length]);

  const bookmarks = useLiveQuery(async () => {
    if (!session) return [];
    const ids = session.sequence;
    const all = await db.bookmarks.where("questionId").anyOf(ids).toArray();
    return all;
  }, [session?.id, session?.sequence.length]);

  const [selectedKeys, setSelectedKeys] = useState<string[]>([]);
  const [shortAnswer, setShortAnswer] = useState<string>("");
  const [showGrid, setShowGrid] = useState(false);
  const [showEndConfirm, setShowEndConfirm] = useState(false);
  const [finished, setFinished] = useState(false);

  const current = session ? session.sequence[session.cursor] : undefined;
  const currentQuestion = useMemo(
    () => questions?.find((q) => q.id === current),
    [questions, current]
  );
  const currentRecord = useMemo(
    () => session?.records.find((r) => r.questionId === current),
    [session, current]
  );
  const submitted = !!currentRecord;

  // 切题时重置本地选择；若已提交则展示用户当时的选择
  useEffect(() => {
    if (currentRecord) {
      setSelectedKeys(currentRecord.userAnswer.split(""));
      setShortAnswer(currentRecord.userAnswer);
    } else {
      setSelectedKeys([]);
      setShortAnswer("");
    }
  }, [current, currentRecord?.questionId]);

  const favSet = new Set((bookmarks ?? []).filter((b) => b.type === "favorite").map((b) => b.questionId));
  const wrongSet = new Set((bookmarks ?? []).filter((b) => b.type === "wrong").map((b) => b.questionId));

  // 键盘快捷键
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      // 忽略输入框/文本域内的方向键（光标移动需要）
      const isInput =
        e.target instanceof HTMLInputElement || e.target instanceof HTMLTextAreaElement;
      if (isInput) {
        if (e.key === "Enter" && !e.shiftKey && currentQuestion && !submitted) {
          if (currentQuestion.questionType === "short" && shortAnswer.trim().length > 0) {
            e.preventDefault();
            handleSubmit();
          }
        }
        return;
      }

      if (!currentQuestion || submitted) {
        if (e.key === "ArrowRight") goNext();
        else if (e.key === "ArrowLeft") goPrev();
        return;
      }
      if (currentQuestion.questionType === "short") {
        // 简答题：简答题作答走 textarea，快捷键仅保留提交
        if (e.key === "Enter" && !e.shiftKey && shortAnswer.trim().length > 0) {
          e.preventDefault();
          handleSubmit();
        } else if (e.key === "ArrowRight") goNext();
        else if (e.key === "ArrowLeft") goPrev();
        return;
      }
      const k = e.key.toUpperCase();
      const validKeys = currentQuestion.options.map((o) => o.key);
      if (validKeys.includes(k)) {
        onSelect(k);
      } else if (e.key === "Enter" && selectedKeys.length > 0) {
        handleSubmit();
      } else if (e.key === "ArrowRight") goNext();
      else if (e.key === "ArrowLeft") goPrev();
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [currentQuestion, selectedKeys, shortAnswer, submitted]);

  if (!session) {
    return (
      <div className="min-h-screen flex items-center justify-center text-blueprint-300">
        <span className="font-mono">加载会话…</span>
      </div>
    );
  }

  if (finished) {
    return (
      <Summary
        session={session}
        onRestart={async () => {
          const newId = await createSession({
            sourceType: session.sourceType,
            sourceId: session.sourceId,
            sourceLabel: session.sourceLabel,
            mode: session.mode,
            questions: questions ?? [],
          });
          navigate(`/practice/${newId}`, { replace: true });
          setFinished(false);
        }}
      />
    );
  }

  const isMultiple = currentQuestion?.questionType === "multiple";
  const isShort = currentQuestion?.questionType === "short";

  function onSelect(key: string) {
    if (!currentQuestion || submitted) return;
    if (isMultiple) {
      setSelectedKeys((prev) =>
        prev.includes(key) ? prev.filter((k) => k !== key) : [...prev, key].sort()
      );
    } else {
      setSelectedKeys([key]);
    }
  }

  async function handleSubmit() {
    if (!currentQuestion || !sessionId) return;
    if (isShort) {
      if (shortAnswer.trim().length === 0) return;
      await submitAnswer(sessionId, currentQuestion, shortAnswer.trim());
    } else {
      if (selectedKeys.length === 0) return;
      await submitAnswer(sessionId, currentQuestion, selectedKeys.join(""));
    }
  }

  async function goNext() {
    if (!session || !sessionId) return;
    const next = Math.min(session.cursor + 1, session.total - 1);
    if (next !== session.cursor) await advanceCursor(sessionId, next);
  }
  async function goPrev() {
    if (!session || !sessionId) return;
    const prev = Math.max(session.cursor - 1, 0);
    if (prev !== session.cursor) await advanceCursor(sessionId, prev);
  }
  async function jumpTo(i: number) {
    if (!sessionId) return;
    await advanceCursor(sessionId, i);
    setShowGrid(false);
  }

  async function handleEnd() {
    if (!sessionId) return;
    await endSession(sessionId);
    setFinished(true);
  }

  const progress = session.total ? session.cursor / session.total : 0;

  return (
    <div className="min-h-screen flex flex-col bg-ink-950 bp-grid-fine bp-noise relative">
      {/* 顶部条 */}
      <header className="border-b border-blueprint-500/15 bg-ink-950/90 backdrop-blur sticky top-0 z-30">
        <div className="container flex h-12 items-center gap-3">
          <button
            onClick={() => navigate(-1)}
            className="flex items-center gap-1 text-xs text-blueprint-300 hover:text-blueprint-50 font-mono"
          >
            <ArrowLeft size={14} /> 退出
          </button>
          <div className="h-4 w-px bg-blueprint-500/20" />
          <span className="text-sm text-blueprint-50 truncate font-medium">{session.sourceLabel}</span>
          <span className={cn("font-mono text-[10px] px-1.5 py-0.5 border rounded-blueprint", session.mode === "random" ? "text-amber border-amber/40" : "text-blueprint-400 border-blueprint-400/40")}>
            {session.mode === "random" ? (
              <span className="flex items-center gap-1"><Shuffle size={9} /> 随机</span>
            ) : (
              "顺序"
            )}
          </span>
          <button
            onClick={() => setShowEndConfirm(true)}
            className="ml-auto flex items-center gap-1 text-xs text-amber hover:text-amber-400 font-mono border border-amber/30 px-2 py-1 rounded-blueprint hover:bg-amber/10"
          >
            <Flag size={12} /> 结束
          </button>
        </div>
        {/* 进度条 */}
        <div className="h-1 bg-ink-900">
          <div
            className="h-full bg-gradient-to-r from-blueprint-400 to-blueprint-500 transition-all duration-300"
            style={{ width: `${Math.max(2, progress * 100)}%` }}
          />
        </div>
      </header>

      {/* 主内容 */}
      <main className="flex-1 container py-6 max-w-3xl">
        {currentQuestion ? (
          <QuestionCard
            question={currentQuestion}
            index={session.cursor}
            total={session.total}
            selectedKeys={selectedKeys}
            submitted={submitted}
            record={currentRecord}
            onSelect={onSelect}
            shortAnswer={shortAnswer}
            onShortAnswerChange={setShortAnswer}
          />
        ) : (
          <div className="text-center py-20 text-blueprint-300">
            <p className="font-mono">无题目可显示</p>
          </div>
        )}

        {/* 提交按钮 */}
        {!submitted && currentQuestion && (
          <div className="mt-4 flex justify-center">
            <Button
              onClick={handleSubmit}
              disabled={isShort ? shortAnswer.trim().length === 0 : selectedKeys.length === 0}
              className="px-10 py-3 text-base"
            >
              <Check size={16} /> 提交答案
              <span className="ml-2 text-[10px] opacity-70 font-mono">ENTER</span>
            </Button>
          </div>
        )}
      </main>

      {/* 底部控制条 */}
      <footer className="sticky bottom-0 border-t border-blueprint-500/15 bg-ink-950/95 backdrop-blur z-30">
        <div className="container max-w-3xl flex items-center gap-2 py-3">
          <button
            onClick={goPrev}
            disabled={session.cursor === 0}
            className="flex items-center gap-1 px-3 py-2 text-sm text-blueprint-200 hover:text-blueprint-50 hover:bg-blueprint-500/10 rounded-blueprint disabled:opacity-30 disabled:cursor-not-allowed"
          >
            <ChevronLeft size={16} /> 上一题
          </button>

          <button
            onClick={() => currentQuestion && toggleFavorite(currentQuestion.id)}
            className={cn(
              "flex h-9 w-9 items-center justify-center rounded-blueprint border transition-colors",
              favSet.has(currentQuestion?.id ?? "")
                ? "border-amber text-amber bg-amber/10"
                : "border-blueprint-500/20 text-blueprint-300 hover:text-amber hover:border-amber/40"
            )}
            title="收藏"
          >
            <Star size={15} className={favSet.has(currentQuestion?.id ?? "") ? "fill-amber" : ""} />
          </button>
          <button
            onClick={() => currentQuestion && toggleWrongMark(currentQuestion.id)}
            className={cn(
              "flex h-9 w-9 items-center justify-center rounded-blueprint border transition-colors",
              wrongSet.has(currentQuestion?.id ?? "")
                ? "border-amber text-amber bg-amber/10"
                : "border-blueprint-500/20 text-blueprint-300 hover:text-amber hover:border-amber/40"
            )}
            title="标记错题"
          >
            <AlertTriangle size={15} />
          </button>
          <button
            onClick={() => setShowGrid(true)}
            className="flex h-9 w-9 items-center justify-center rounded-blueprint border border-blueprint-500/20 text-blueprint-300 hover:text-blueprint-500 hover:border-blueprint-500/40"
            title="题号跳转"
          >
            <Grid3x3 size={15} />
          </button>

          <div className="flex-1 text-center font-mono text-xs text-blueprint-300">
            {session.cursor + 1} / {session.total} · 已答 {session.answeredCount}
          </div>

          {session.cursor === session.total - 1 ? (
            <Button onClick={() => setShowEndConfirm(true)} className="px-4">
              <Flag size={14} /> 完成
            </Button>
          ) : (
            <Button onClick={goNext} className="px-4">
              下一题 <ChevronRight size={16} />
            </Button>
          )}
        </div>
      </footer>

      {/* 题号网格跳转 */}
      <Modal open={showGrid} onClose={() => setShowGrid(false)} title="题号跳转" className="max-w-xl">
        <div className="grid grid-cols-8 sm:grid-cols-10 gap-1.5 max-h-80 overflow-y-auto">
          {session.sequence.map((qid, i) => {
            const rec = session.records.find((r) => r.questionId === qid);
            const isCurrent = i === session.cursor;
            return (
              <button
                key={qid}
                onClick={() => jumpTo(i)}
                className={cn(
                  "aspect-square flex items-center justify-center font-mono text-xs border rounded-blueprint transition-colors",
                  isCurrent
                    ? "border-blueprint-500 bg-blueprint-500/20 text-blueprint-50 shadow-glow"
                    : rec
                      ? rec.isCorrect
                        ? "border-emerald/40 text-emerald bg-emerald/5 hover:bg-emerald/10"
                        : "border-amber/40 text-amber bg-amber/5 hover:bg-amber/10"
                      : "border-blueprint-500/15 text-blueprint-300 hover:border-blueprint-500/40 hover:text-blueprint-50"
                )}
              >
                {i + 1}
              </button>
            );
          })}
        </div>
      </Modal>

      {/* 结束确认 */}
      <Modal open={showEndConfirm} onClose={() => setShowEndConfirm(false)} title="结束本次练习">
        <p className="text-sm text-blueprint-100 mb-1">
          已答 <span className="font-mono text-blueprint-50">{session.answeredCount}</span> /{" "}
          <span className="font-mono text-blueprint-50">{session.total}</span> 题，正确{" "}
          <span className="font-mono text-emerald">{session.correctCount}</span> 题。
        </p>
        <p className="text-xs text-blueprint-300 mb-5">结束后将记录到练习历史，可在进度页查看。</p>
        <div className="flex justify-end gap-2">
          <Button variant="ghost" onClick={() => setShowEndConfirm(false)}>
            继续答题
          </Button>
          <Button variant="danger" onClick={handleEnd}>
            <Flag size={14} /> 确认结束
          </Button>
        </div>
      </Modal>
    </div>
  );
}
