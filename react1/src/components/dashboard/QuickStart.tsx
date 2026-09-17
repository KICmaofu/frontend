import { useState } from "react";
import { useLiveQuery } from "dexie-react-hooks";
import { db } from "@/lib/db";
import { Card } from "@/components/ui/Card";
import { Button } from "@/components/ui/Button";
import { useStartPractice } from "@/lib/start";
import { Play, Shuffle, ArrowRightCircle, Library, FolderTree, AlertCircle } from "lucide-react";
import { cn } from "@/lib/utils";
import type { PracticeMode, SourceType } from "@/types";

interface SourceOption {
  id: string;
  label: string;
  type: SourceType;
  count: number;
}

export function QuickStart() {
  const files = useLiveQuery(() => db.files.toArray(), []);
  const wrongCount = useLiveQuery(() => db.bookmarks.where("type").equals("wrong").count(), []);

  const [selected, setSelected] = useState<string>("");
  const [mode, setMode] = useState<PracticeMode>("sequential");
  const [error, setError] = useState<string>("");
  const start = useStartPractice();

  // 组装来源选项
  const options: SourceOption[] = [];
  if (files) {
    // 按分类聚合
    const catMap = new Map<string, number>();
    for (const f of files) {
      const cat = f.category || "未分类";
      catMap.set(cat, (catMap.get(cat) ?? 0) + f.questionCount);
    }
    for (const [cat, count] of catMap) {
      options.push({ id: cat, label: `分类 · ${cat}`, type: "category", count });
    }
    for (const f of files) {
      options.push({ id: f.id, label: `文件 · ${f.name}`, type: "file", count: f.questionCount });
    }
  }
  if (wrongCount && wrongCount > 0) {
    options.push({ id: "wrongbook", label: `错题本 · ${wrongCount} 题`, type: "wrongbook", count: wrongCount });
  }

  const handleStart = async () => {
    setError("");
    const opt = options.find((o) => o.id === selected && (o.type === "wrongbook" || true));
    // selected 格式：`${type}::${id}`
    const [type, id] = selected.split("::");
    if (!id) {
      setError("请先选择练习来源");
      return;
    }
    const realOpt = options.find((o) => o.type === type && o.id === id);
    if (!realOpt) {
      setError("来源无效");
      return;
    }
    try {
      await start(realOpt.type, realOpt.id, realOpt.label, mode);
    } catch (e) {
      setError((e as Error).message);
    }
  };

  const value = (type: SourceType, id: string) => `${type}::${id}`;

  return (
    <Card className="p-6 bp-grid-fine relative overflow-hidden">
      <div className="relative z-10">
        <div className="flex items-center gap-2 mb-1">
          <Play size={14} className="text-blueprint-500" />
          <h2 className="bp-eyebrow text-blueprint-500">快速开始</h2>
        </div>
        <p className="text-blueprint-200 text-sm mb-5">选择题目来源与模式，一键进入刷题</p>

        {options.length === 0 ? (
          <div className="border border-dashed border-blueprint-500/30 rounded-blueprint p-8 text-center">
            <AlertCircle size={24} className="mx-auto text-blueprint-300 mb-2" />
            <p className="text-sm text-blueprint-200 mb-3">题库为空，请先导入题目文件</p>
            <Button onClick={() => (window.location.href = "/import")}>
              <ArrowRightCircle size={15} /> 前往导入
            </Button>
          </div>
        ) : (
          <>
            <div className="mb-5">
              <label className="bp-eyebrow block mb-2">题目来源</label>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 max-h-56 overflow-y-auto pr-1">
                {options.map((o) => {
                  const active = selected === value(o.type, o.id);
                  const Icon = o.type === "category" ? FolderTree : o.type === "wrongbook" ? AlertCircle : Library;
                  return (
                    <button
                      key={`${o.type}-${o.id}`}
                      onClick={() => setSelected(value(o.type, o.id))}
                      className={cn(
                        "flex items-center gap-2 p-2.5 border rounded-blueprint text-left transition-all",
                        active
                          ? "border-blueprint-500 bg-blueprint-500/10 shadow-glow"
                          : "border-blueprint-500/15 hover:border-blueprint-500/40 bg-ink-950/40"
                      )}
                    >
                      <Icon size={15} className={active ? "text-blueprint-500" : "text-blueprint-300"} />
                      <span className="text-sm text-blueprint-50 flex-1 truncate">{o.label}</span>
                      <span className="font-mono text-[10px] text-blueprint-300">{o.count}题</span>
                    </button>
                  );
                })}
              </div>
            </div>

            <div className="mb-5">
              <label className="bp-eyebrow block mb-2">练习模式</label>
              <div className="inline-flex border border-blueprint-500/20 rounded-blueprint overflow-hidden">
                {([
                  { v: "sequential", label: "顺序", icon: ArrowRightCircle },
                  { v: "random", label: "随机", icon: Shuffle },
                ] as const).map((m) => {
                  const Icon = m.icon;
                  const active = mode === m.v;
                  return (
                    <button
                      key={m.v}
                      onClick={() => setMode(m.v)}
                      className={cn(
                        "flex items-center gap-1.5 px-4 py-2 text-sm transition-colors",
                        active ? "bg-blueprint-500 text-ink-950 font-semibold" : "text-blueprint-200 hover:bg-blueprint-500/10"
                      )}
                    >
                      <Icon size={14} /> {m.label}
                    </button>
                  );
                })}
              </div>
            </div>

            {error && <p className="text-amber text-xs mb-3 font-mono">{error}</p>}

            <Button onClick={handleStart} disabled={!selected} className="w-full sm:w-auto">
              <Play size={15} /> 开始练习
            </Button>
          </>
        )}
      </div>
    </Card>
  );
}
