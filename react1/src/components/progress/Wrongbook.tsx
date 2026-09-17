import { useLiveQuery } from "dexie-react-hooks";
import { db } from "@/lib/db";
import { Card } from "@/components/ui/Card";
import { Button } from "@/components/ui/Button";
import { Tag } from "@/components/ui/Tag";
import { useStartPractice } from "@/lib/start";
import { truncate, typeLabel, typeColorClass, cn } from "@/lib/utils";
import { AlertTriangle, Play, Trash2, Star, Search } from "lucide-react";
import { useState } from "react";
import type { Question } from "@/types";

export function Wrongbook() {
  const wrongs = useLiveQuery(() => db.bookmarks.where("type").equals("wrong").toArray(), []);
  const questions = useLiveQuery(async () => {
    if (!wrongs) return [];
    const ids = wrongs.map((w) => w.questionId);
    return db.questions.bulkGet(ids);
  }, [wrongs?.length]);
  const files = useLiveQuery(() => db.files.toArray(), []);
  const favs = useLiveQuery(() => db.bookmarks.where("type").equals("favorite").toArray(), []);

  const start = useStartPractice();
  const [search, setSearch] = useState("");

  const fileMap = new Map((files ?? []).map((f) => [f.id, f.name]));
  const favSet = new Set((favs ?? []).map((b) => b.questionId));

  const qs = (questions ?? []).filter(Boolean) as Question[];
  const filtered = qs.filter((q) =>
    search.trim() ? q.stem.toLowerCase().includes(search.toLowerCase().trim()) : true
  );

  const removeWrong = async (qid: string) => {
    await db.bookmarks.where("questionId").equals(qid).and((b) => b.type === "wrong").delete();
  };

  return (
    <Card className="p-5">
      <div className="flex items-center justify-between mb-4 gap-3 flex-wrap">
        <div className="flex items-center gap-2">
          <AlertTriangle size={14} className="text-amber" />
          <div className="bp-eyebrow text-amber">错题本 · {qs.length} 题</div>
        </div>
        {qs.length > 0 && (
          <Button className="text-xs py-1.5" onClick={() => start("wrongbook", "wrongbook", "错题本重做", "sequential")}>
            <Play size={13} /> 错题重做
          </Button>
        )}
      </div>

      {qs.length === 0 ? (
        <p className="text-center text-sm text-blueprint-300 py-8">暂无错题，去刷题吧 ✦</p>
      ) : (
        <>
          <div className="relative mb-3">
            <Search size={13} className="absolute left-3 top-1/2 -translate-y-1/2 text-blueprint-300" />
            <input
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="搜索错题…"
              className="bp-input pl-9 py-1.5 text-sm"
            />
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 max-h-96 overflow-y-auto pr-1">
            {filtered.map((q) => (
              <div key={q.id} className="border border-amber/20 rounded-blueprint p-3 bg-amber/5 hover:border-amber/40 transition-colors">
                <div className="flex items-center gap-1.5 mb-1.5">
                  <Tag className={cn("border", typeColorClass(q.questionType))}>
                    {typeLabel(q.questionType)}
                  </Tag>
                  {favSet.has(q.id) && <Star size={10} className="text-amber fill-amber" />}
                  <span className="text-[10px] text-blueprint-300 font-mono truncate ml-auto">
                    {fileMap.get(q.fileId) ?? "未知文件"}
                  </span>
                </div>
                <p className="text-sm text-blueprint-50 mb-2 line-clamp-2">{q.stem}</p>
                <div className="flex items-center gap-1.5">
                  <span className="font-mono text-[10px] text-emerald">答案 {q.answer}</span>
                  <button
                    onClick={() => removeWrong(q.id)}
                    className="ml-auto flex h-6 w-6 items-center justify-center text-blueprint-300 hover:text-amber rounded-blueprint"
                    title="移出错题本"
                  >
                    <Trash2 size={11} />
                  </button>
                </div>
              </div>
            ))}
          </div>
          {filtered.length === 0 && (
            <p className="text-center text-xs text-blueprint-300 py-4">未找到匹配错题</p>
          )}
        </>
      )}
    </Card>
  );
}
