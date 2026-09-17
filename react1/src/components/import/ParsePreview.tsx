import { Tag } from "@/components/ui/Tag";
import { Check, X, AlertTriangle } from "lucide-react";
import { truncate, typeLabel } from "@/lib/utils";
import type { ParseResult, ImportItem } from "@/types";

interface ParsePreviewProps {
  item: ImportItem;
  result: ParseResult;
  onCategoryChange: (category: string) => void;
}

/** 单个文件的解析预览 */
export function ParsePreview({ item, result, onCategoryChange }: ParsePreviewProps) {
  const preview = result.questions.slice(0, 5);
  const warnCount = result.warnings.length;
  const errorCount = result.warnings.filter((w) => w.field === "stem" || w.field === "answer").length;

  return (
    <div className="bp-card bp-corner rounded-blueprint overflow-hidden">
      <div className="flex items-center justify-between gap-3 p-3 border-b border-blueprint-500/15 bg-ink-950/40">
        <div className="flex items-center gap-2 min-w-0">
          <span className="font-mono text-xs text-blueprint-300 truncate">{item.rawFile.name}</span>
          <Tag className="border-blueprint-500/30 text-blueprint-300">
            {result.file.format.toUpperCase()}
          </Tag>
          <Tag className="border-blueprint-500/40 text-blueprint-500">
            {result.questions.length} 题
          </Tag>
          {warnCount > 0 ? (
            <Tag className="border-amber/40 text-amber">
              <AlertTriangle size={10} /> {warnCount} 警告
            </Tag>
          ) : (
            <Tag className="border-emerald/40 text-emerald">
              <Check size={10} /> 完整
            </Tag>
          )}
        </div>
        {errorCount > 0 && (
          <span className="text-[11px] text-amber font-mono shrink-0">{errorCount} 项缺失关键字段</span>
        )}
      </div>

      <div className="p-3 space-y-2">
        {/* 分类编辑 */}
        <div className="flex items-center gap-2 text-xs">
          <span className="bp-eyebrow shrink-0">分类</span>
          <input
            type="text"
            value={result.file.category}
            onChange={(e) => onCategoryChange(e.target.value)}
            className="bp-input flex-1 py-1 text-xs"
            placeholder="输入分类名"
          />
        </div>

        {/* 预览题表 */}
        <div className="overflow-x-auto">
          <table className="w-full text-xs">
            <thead>
              <tr className="text-left text-blueprint-300 font-mono uppercase tracking-wider text-[10px]">
                <th className="py-1.5 pr-2 font-normal w-8">#</th>
                <th className="py-1.5 pr-2 font-normal">题干</th>
                <th className="py-1.5 pr-2 font-normal w-14">题型</th>
                <th className="py-1.5 pr-2 font-normal w-10">选项</th>
                <th className="py-1.5 pr-2 font-normal w-10">答案</th>
                <th className="py-1.5 pr-2 font-normal w-10">解析</th>
              </tr>
            </thead>
            <tbody>
              {preview.map((q) => {
                const w = result.warnings.find((x) => x.questionIndex === q.order);
                const stemOk = !!q.stem;
                const ansOk = !!q.answer;
                const anaOk = !!q.analysis;
                return (
                  <tr key={q.order} className="border-t border-blueprint-500/10">
                    <td className="py-1.5 pr-2 font-mono text-blueprint-300">{q.order}</td>
                    <td className="py-1.5 pr-2 text-blueprint-50">{truncate(q.stem, 32)}</td>
                    <td className="py-1.5 pr-2 text-blueprint-200">{typeLabel(q.questionType)}</td>
                    <td className="py-1.5 pr-2">
                      <FieldIcon ok={q.options.length > 0} />
                    </td>
                    <td className="py-1.5 pr-2">
                      <FieldIcon ok={ansOk} warn={w?.field === "answer"} />
                    </td>
                    <td className="py-1.5 pr-2">
                      <FieldIcon ok={anaOk} warn={w?.field === "analysis"} muted={!anaOk} />
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
        {result.questions.length > 5 && (
          <p className="text-[11px] text-blueprint-300 font-mono">
            … 还有 {result.questions.length - 5} 题已解析
          </p>
        )}
        {warnCount > 0 && (
          <details className="text-[11px] text-blueprint-300">
            <summary className="cursor-pointer hover:text-blueprint-50 font-mono">
              查看 {warnCount} 条警告详情
            </summary>
            <ul className="mt-1 space-y-0.5 pl-4">
              {result.warnings.slice(0, 20).map((w, i) => (
                <li key={i} className="text-amber/80">
                  · {w.message}
                </li>
              ))}
            </ul>
          </details>
        )}
      </div>
    </div>
  );
}

function FieldIcon({ ok, warn, muted }: { ok: boolean; warn?: boolean; muted?: boolean }) {
  if (ok) return <Check size={13} className="text-emerald" />;
  if (warn) return <X size={13} className="text-amber" />;
  if (muted) return <span className="text-blueprint-300/40 text-[10px] font-mono">—</span>;
  return <X size={13} className="text-amber" />;
}
