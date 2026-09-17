import { useState } from "react";
import { UploadZone } from "@/components/import/UploadZone";
import { ParsePreview } from "@/components/import/ParsePreview";
import { Button } from "@/components/ui/Button";
import { Card } from "@/components/ui/Card";
import { parseRawFile, commitParseResult } from "@/lib/import";
import { downloadTemplate } from "@/lib/templates";
import { useAppStore } from "@/store/useAppStore";
import { useNavigate } from "react-router-dom";
import {
  CheckCircle2,
  XCircle,
  Trash2,
  Download,
  FileJson,
  FileSpreadsheet,
  FileText,
  FileType,
  Check,
  ArrowRight,
  X,
} from "lucide-react";
import type { ImportItem, ParseResult } from "@/types";

type Phase = "upload" | "preview" | "done";

interface CommitResult {
  name: string;
  success: boolean;
  count: number;
  error?: string;
}

export default function ImportWizard() {
  const [items, setItems] = useState<ImportItem[]>([]);
  const [phase, setPhase] = useState<Phase>("upload");
  const [results, setResults] = useState<CommitResult[]>([]);
  const [committing, setCommitting] = useState(false);
  const bumpRefresh = useAppStore((s) => s.bumpRefresh);
  const navigate = useNavigate();

  const addFiles = async (files: File[]) => {
    const newItems: ImportItem[] = files.map((f) => ({
      rawFile: f,
      status: "parsing",
    }));
    setItems((prev) => [...prev, ...newItems]);

    // 依次解析
    for (let i = 0; i < files.length; i++) {
      const idx = items.length + i;
      try {
        const result = await parseRawFile(files[i]);
        setItems((prev) => {
          const next = [...prev];
          next[idx] = { ...next[idx], status: "parsed", result };
          return next;
        });
      } catch (e) {
        setItems((prev) => {
          const next = [...prev];
          next[idx] = { ...next[idx], status: "error", errorMessage: (e as Error).message };
          return next;
        });
      }
    }
    setPhase("preview");
  };

  const updateCategory = (idx: number, category: string) => {
    setItems((prev) => {
      const next = [...prev];
      const it = next[idx];
      if (it.result) {
        next[idx] = { ...it, result: { ...it.result, file: { ...it.result.file, category } } };
      }
      return next;
    });
  };

  const removeItem = (idx: number) => {
    setItems((prev) => prev.filter((_, i) => i !== idx));
  };

  const parsedItems = items.filter((i) => i.status === "parsed" && i.result);
  const totalQuestions = parsedItems.reduce((s, i) => s + (i.result?.questions.length ?? 0), 0);

  const commit = async () => {
    setCommitting(true);
    const out: CommitResult[] = [];
    for (const it of parsedItems) {
      if (!it.result) continue;
      try {
        const f = await commitParseResult(it.result);
        out.push({ name: f.name, success: true, count: f.questionCount });
      } catch (e) {
        out.push({ name: it.rawFile.name, success: false, count: 0, error: (e as Error).message });
      }
    }
    setResults(out);
    setPhase("done");
    setCommitting(false);
    bumpRefresh();
  };

  const reset = () => {
    setItems([]);
    setResults([]);
    setPhase("upload");
  };

  return (
    <div className="space-y-6">
      {/* 步骤指示器 */}
      <div className="flex items-center gap-2 text-xs font-mono">
        {[
          { k: "upload", label: "1. 选择文件" },
          { k: "preview", label: "2. 预览确认" },
          { k: "done", label: "3. 完成导入" },
        ].map((s, i) => (
          <div key={s.k} className="flex items-center gap-2">
            <span
              className={
                phase === s.k
                  ? "text-blueprint-500"
                  : items.length > 0 || phase === "done"
                    ? "text-blueprint-200"
                    : "text-blueprint-300/50"
              }
            >
              {s.label}
            </span>
            {i < 2 && <span className="text-blueprint-500/30">→</span>}
          </div>
        ))}
      </div>

      {/* 模板下载区 */}
      <Card className="p-4">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div>
            <div className="bp-eyebrow text-blueprint-500 mb-1">示例模板</div>
            <p className="text-sm text-blueprint-200">不确定格式？下载模板查看题干 / 选项 / 答案 / 解析的写法</p>
          </div>
          <div className="flex gap-2 flex-wrap">
            <Button variant="ghost" onClick={() => downloadTemplate("json")}>
              <FileJson size={14} /> JSON
            </Button>
            <Button variant="ghost" onClick={() => downloadTemplate("csv")}>
              <FileSpreadsheet size={14} /> CSV
            </Button>
            <Button variant="ghost" onClick={() => downloadTemplate("txt")}>
              <FileText size={14} /> TXT
            </Button>
            <Button variant="ghost" onClick={() => downloadTemplate("pdf")}>
              <FileType size={14} /> PDF 说明
            </Button>
          </div>
        </div>
      </Card>

      {phase !== "done" && <UploadZone onFiles={addFiles} />}

      {/* 文件队列与预览 */}
      {items.length > 0 && phase !== "done" && (
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <h3 className="bp-eyebrow text-blueprint-300">
              文件队列 · {parsedItems.length}/{items.length} 已解析 · 共 {totalQuestions} 题
            </h3>
            <Button variant="ghost" onClick={reset} className="text-xs py-1">
              <Trash2 size={13} /> 清空
            </Button>
          </div>

          {items.map((it, idx) => (
            <div key={idx}>
              {it.status === "parsing" && (
                <Card className="p-4 animate-pulse">
                  <span className="text-sm text-blueprint-200 font-mono">解析中：{it.rawFile.name}…</span>
                </Card>
              )}
              {it.status === "error" && (
                <Card className="p-4 border-amber/40">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <XCircle size={16} className="text-amber" />
                      <span className="text-sm text-blueprint-50 font-mono">{it.rawFile.name}</span>
                    </div>
                    <Button variant="ghost" onClick={() => removeItem(idx)} className="py-1 text-xs">
                      移除
                    </Button>
                  </div>
                  <p className="mt-2 text-xs text-amber">{it.errorMessage}</p>
                </Card>
              )}
              {it.status === "parsed" && it.result && (
                <div className="relative">
                  <ParsePreview
                    item={it}
                    result={it.result}
                    onCategoryChange={(c) => updateCategory(idx, c)}
                  />
                  <button
                    onClick={() => removeItem(idx)}
                    className="absolute -top-2 -right-2 flex h-6 w-6 items-center justify-center bg-ink-950 border border-amber/40 text-amber rounded-blueprint hover:bg-amber/10 z-10"
                    title="移除"
                  >
                    <X size={12} />
                  </button>
                </div>
              )}
            </div>
          ))}

          {parsedItems.length > 0 && (
            <div className="sticky bottom-4 z-20">
              <Card className="p-4 flex items-center justify-between gap-4 shadow-glow">
                <div className="text-sm">
                  <span className="text-blueprint-50 font-semibold">{parsedItems.length} 个文件</span>
                  <span className="text-blueprint-300"> · {totalQuestions} 道题目将入库</span>
                </div>
                <Button onClick={commit} disabled={committing}>
                  <Check size={15} /> {committing ? "导入中…" : "确认导入"}
                </Button>
              </Card>
            </div>
          )}
        </div>
      )}

      {/* 导入结果报告 */}
      {phase === "done" && (
        <Card className="p-6 animate-fade-up">
          <div className="flex items-center gap-2 mb-4">
            <CheckCircle2 size={20} className="text-emerald" />
            <h3 className="font-mono text-sm uppercase tracking-widest text-blueprint-50">导入完成报告</h3>
          </div>
          <div className="space-y-2 mb-5">
            {results.map((r, i) => (
              <div
                key={i}
                className="flex items-center justify-between gap-3 p-3 border border-blueprint-500/10 rounded-blueprint bg-ink-950/40"
              >
                <div className="flex items-center gap-2 min-w-0">
                  {r.success ? (
                    <CheckCircle2 size={15} className="text-emerald shrink-0" />
                  ) : (
                    <XCircle size={15} className="text-amber shrink-0" />
                  )}
                  <span className="text-sm text-blueprint-50 truncate font-mono">{r.name}</span>
                </div>
                <span className={r.success ? "text-emerald text-xs font-mono" : "text-amber text-xs"}>
                  {r.success ? `+${r.count} 题` : r.error}
                </span>
              </div>
            ))}
          </div>
          <div className="flex flex-wrap gap-3">
            <Button onClick={() => navigate("/bank")}>
              <ArrowRight size={15} /> 前往题库
            </Button>
            <Button variant="ghost" onClick={reset}>
              继续导入
            </Button>
            <Button variant="ghost" onClick={() => navigate("/")}>
              返回控制台
            </Button>
          </div>
        </Card>
      )}
    </div>
  );
}
