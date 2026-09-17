import { Tag } from "@/components/ui/Tag";
import { Check, X } from "lucide-react";
import { cn, typeLabel, typeColorClass } from "@/lib/utils";
import type { Question, AnswerRecord } from "@/types";

interface QuestionCardProps {
  question: Question;
  index: number;
  total: number;
  selectedKeys: string[];
  submitted: boolean;
  record?: AnswerRecord;
  onSelect: (key: string) => void;
  /** 简答题用户作答文本 */
  shortAnswer?: string;
  /** 简答题作答文本变更 */
  onShortAnswerChange?: (text: string) => void;
}

export function QuestionCard({
  question,
  index,
  total,
  selectedKeys,
  submitted,
  record,
  onSelect,
  shortAnswer = "",
  onShortAnswerChange,
}: QuestionCardProps) {
  const isMultiple = question.questionType === "multiple";
  const isShort = question.questionType === "short";
  const correctKeys = new Set(question.answer.split(""));
  const userKeys = new Set(submitted ? (record?.userAnswer ?? "") : "" );

  return (
    <article className="bp-card bp-corner rounded-blueprint overflow-hidden animate-slide-x" key={question.id}>
      {/* 头部 */}
      <header className="flex items-center justify-between gap-3 p-4 border-b border-blueprint-500/15 bg-ink-950/40">
        <div className="flex items-center gap-2">
          <span className="font-mono text-xs text-blueprint-300">
            Q{String(index + 1).padStart(3, "0")}
          </span>
          <span className="text-blueprint-300/40 font-mono">/</span>
          <span className="font-mono text-xs text-blueprint-300">{String(total).padStart(3, "0")}</span>
          <Tag className={cn("border", typeColorClass(question.questionType))}>
            {typeLabel(question.questionType)}
          </Tag>
        </div>
        {isMultiple && (
          <span className="text-[11px] text-amber font-mono">多选 · 可选多项</span>
        )}
        {isShort && (
          <span className="text-[11px] text-purple-400 font-mono">简答 · 文本作答</span>
        )}
      </header>

      {/* 题干 */}
      <div className="p-5 md:p-6">
        <p className="font-serif text-lg md:text-xl text-blueprint-50 leading-relaxed whitespace-pre-wrap">
          {question.stem}
        </p>
      </div>

      {/* 选项 / 简答输入 */}
      {isShort ? (
        <div className="px-5 md:px-6 pb-5 md:pb-6">
          {submitted ? (
            <div className="space-y-3">
              <div>
                <div className="bp-eyebrow text-blueprint-300 mb-1">你的回答</div>
                <p className="font-serif text-sm text-blueprint-100 leading-relaxed whitespace-pre-wrap border border-blueprint-500/15 rounded-blueprint p-3 bg-ink-950/40">
                  {record?.userAnswer || "（未作答）"}
                </p>
              </div>
            </div>
          ) : (
            <textarea
              value={shortAnswer}
              onChange={(e) => onShortAnswerChange?.(e.target.value)}
              disabled={submitted}
              placeholder="请在此输入你的答案…"
              rows={6}
              className="w-full p-3 border border-blueprint-500/20 rounded-blueprint bg-ink-950/60 text-blueprint-50 font-serif text-sm leading-relaxed focus:outline-none focus:border-blueprint-500/60 resize-y"
            />
          )}
        </div>
      ) : (
        <div className="px-5 md:px-6 pb-5 md:pb-6 space-y-2">
          {question.options.map((opt) => {
            const selected = selectedKeys.includes(opt.key);
            const isCorrect = correctKeys.has(opt.key);
            const isUserChoice = submitted && userKeys.has(opt.key);

            let stateClass = "border-blueprint-500/15 bg-ink-950/40 hover:border-blueprint-500/40";
            if (!submitted && selected) {
              stateClass = "border-blueprint-500 bg-blueprint-500/10 shadow-glow";
            } else if (submitted) {
              if (isCorrect) {
                stateClass = "border-emerald/60 bg-emerald/10";
              } else if (isUserChoice && !isCorrect) {
                stateClass = "border-amber/60 bg-amber/10 animate-shake";
              } else {
                stateClass = "border-blueprint-500/10 bg-ink-950/30 opacity-60";
              }
            }

            return (
              <button
                key={opt.key}
                disabled={submitted}
                onClick={() => onSelect(opt.key)}
                className={cn(
                  "flex w-full items-center gap-3 p-3 border rounded-blueprint text-left transition-all",
                  stateClass,
                  submitted && "cursor-default"
                )}
              >
                <span
                  className={cn(
                    "flex h-7 w-7 items-center justify-center font-mono text-sm font-bold rounded-blueprint border shrink-0",
                    !submitted && selected
                      ? "border-blueprint-500 bg-blueprint-500 text-ink-950"
                      : "border-blueprint-500/30 text-blueprint-200"
                  )}
                >
                  {opt.key}
                </span>
                <span className="flex-1 text-sm text-blueprint-50">{opt.text}</span>
                {submitted && isCorrect && (
                  <Check size={16} className="text-emerald shrink-0" />
                )}
                {submitted && isUserChoice && !isCorrect && (
                  <X size={16} className="text-amber shrink-0" />
                )}
              </button>
            );
          })}
        </div>
      )}

      {/* 反馈 + 解析 */}
      {submitted && (
        <div className="border-t border-blueprint-500/15 bg-ink-950/60 p-5 md:p-6 animate-fade-in">
          <div className="flex items-center gap-2 mb-3">
            {record?.isCorrect ? (
              <>
                <Check size={16} className="text-emerald" />
                <span className="font-mono text-sm text-emerald">回答正确</span>
              </>
            ) : (
              <>
                <X size={16} className="text-amber" />
                <span className="font-mono text-sm text-amber">回答错误</span>
                {!isShort && (
                  <span className="text-xs text-blueprint-300 ml-2">
                    正确答案：<span className="font-mono text-emerald">{question.answer}</span>
                  </span>
                )}
              </>
            )}
          </div>
          {isShort && question.answer && (
            <div className="border-l-2 border-purple-400/50 pl-3 mb-3">
              <div className="bp-eyebrow text-purple-400 mb-1">参考答案</div>
              <p className="font-serif text-sm text-blueprint-100 leading-relaxed whitespace-pre-wrap">
                {question.answer}
              </p>
            </div>
          )}
          {question.analysis && (
            <div className="border-l-2 border-amber/50 pl-3">
              <div className="bp-eyebrow text-amber mb-1">解析</div>
              <p className="font-serif text-sm text-blueprint-100 leading-relaxed whitespace-pre-wrap">
                {question.analysis}
              </p>
            </div>
          )}
        </div>
      )}
    </article>
  );
}
