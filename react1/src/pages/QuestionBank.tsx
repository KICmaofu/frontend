import { useState } from "react";
import { useLiveQuery } from "dexie-react-hooks";
import { db } from "@/lib/db";
import { Card } from "@/components/ui/Card";
import { Button } from "@/components/ui/Button";
import { Tag } from "@/components/ui/Tag";
import { Modal } from "@/components/ui/Modal";
import { useStartPractice } from "@/lib/start";
import { deleteFile } from "@/lib/import";
import { downloadTemplate } from "@/lib/templates";
import { formatDateTime, truncate, typeLabel, typeColorClass, cn } from "@/lib/utils";
import {
  FileJson,
  FileSpreadsheet,
  FileText,
  FileType,
  Play,
  Eye,
  Trash2,
  Search,
  Download,
  Library,
  Upload,
  ArrowLeft,
  Star,
  AlertTriangle,
} from "lucide-react";
import { Link } from "react-router-dom";
import type { ImportedFile, PracticeMode } from "@/types";

const FORMAT_ICON = {
  json: FileJson,
  csv: FileSpreadsheet,
  txt: FileText,
  pdf: FileType,
} as const;

export default function QuestionBank() {
  const files = useLiveQuery(() => db.files.orderBy("importedAt").reverse().toArray(), []);
  const bookmarks = useLiveQuery(() => db.bookmarks.toArray(), []);
  const [selectedFile, setSelectedFile] = useState<ImportedFile | null>(null);
  const [search, setSearch] = useState("");
  const [confirmDelete, setConfirmDelete] = useState<ImportedFile | null>(null);

  const questions = useLiveQuery(
    async () => {
      if (!selectedFile) return [];
      return db.questions.where("fileId").equals(selectedFile.id).sortBy("order");
    },
    [selectedFile?.id]
  );

  const start = useStartPractice();

  const filteredQs = (questions ?? []).filter((q) =>
    search.trim() ? q.stem.toLowerCase().includes(search.toLowerCase().trim()) : true
  );

  const favSet = new Set((bookmarks ?? []).filter((b) => b.type === "favorite").map((b) => b.questionId));
  const wrongSet = new Set((bookmarks ?? []).filter((b) => b.type === "wrong").map((b) => b.questionId));

  if (!files) {
    return <div className="h-64 bp-card bp-corner rounded-blueprint animate-pulse" />;
  }

  // 空状态
  if (files.length === 0) {
    return (
      <div className="space-y-6">
        <Header />
        <Card className="p-10 text-center border-dashed">
          <Library size={32} className="mx-auto text-blueprint-300 mb-3" />
          <h3 className="font-mono text-blueprint-50 mb-1">题库为空</h3>
          <p className="text-sm text-blueprint-200 mb-4">导入 JSON / CSV / TXT 题库文件后，将在此处管理</p>
          <Link to="/import">
            <Button>
              <Upload size={15} /> 去导入
            </Button>
          </Link>
        </Card>
      </div>
    );
  }

  // 题目浏览视图
  if (selectedFile) {
    return (
      <div className="space-y-4 animate-fade-in">
        <div className="flex items-center justify-between gap-3 flex-wrap">
          <button
            onClick={() => setSelectedFile(null)}
            className="flex items-center gap-1.5 text-sm text-blueprint-300 hover:text-blueprint-50 font-mono"
          >
            <ArrowLeft size={15} /> 返回文件列表
          </button>
          <div className="flex items-center gap-2">
            <select
              className="bp-input py-1.5 text-sm w-auto"
              onChange={(e) => {
                const v = e.target.value;
                const mode: PracticeMode = v === "random" ? "random" : "sequential";
                if (v) start("file", selectedFile.id, `文件 · ${selectedFile.name}`, mode);
              }}
              value=""
            >
              <option value="">开始练习…</option>
              <option value="sequential">顺序练习</option>
              <option value="random">随机练习</option>
            </select>
          </div>
        </div>

        <Card className="p-4">
          <div className="flex items-center gap-2 mb-2">
            {(() => {
              const Icon = FORMAT_ICON[selectedFile.format];
              return <Icon size={16} className="text-blueprint-500" />;
            })()}
            <h2 className="font-mono text-blueprint-50">{selectedFile.name}</h2>
            <Tag className="border-blueprint-500/30 text-blueprint-300">
              {selectedFile.format.toUpperCase()}
            </Tag>
            <Tag className="border-blueprint-500/40 text-blueprint-500">
              {selectedFile.questionCount} 题
            </Tag>
            <Tag className="border-blueprint-400/30 text-blueprint-400">{selectedFile.category}</Tag>
          </div>
          <p className="text-[11px] text-blueprint-300 font-mono">
            导入于 {formatDateTime(selectedFile.importedAt)}
          </p>
        </Card>

        <div className="relative">
          <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-blueprint-300" />
          <input
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="搜索题干关键词…"
            className="bp-input pl-9"
          />
        </div>

        <div className="space-y-2">
          {filteredQs.length === 0 ? (
            <p className="text-center text-sm text-blueprint-300 py-8">未找到匹配题目</p>
          ) : (
            filteredQs.map((q) => (
              <Card key={q.id} className="p-3 hover:border-blueprint-500/40">
                <div className="flex items-start gap-3">
                  <span className="font-mono text-xs text-blueprint-300 mt-0.5 shrink-0 w-8">
                    #{q.order}
                  </span>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 mb-1">
                      <Tag className={cn("border", typeColorClass(q.questionType))}>
                        {typeLabel(q.questionType)}
                      </Tag>
                      {favSet.has(q.id) && <Star size={11} className="text-amber fill-amber" />}
                      {wrongSet.has(q.id) && <AlertTriangle size={11} className="text-amber" />}
                      <span className="font-mono text-[10px] text-blueprint-300">答案 {q.answer}</span>
                    </div>
                    <p className="text-sm text-blueprint-50">{q.stem}</p>
                    {q.options.length > 0 && (
                      <div className="mt-1.5 flex flex-wrap gap-x-4 gap-y-0.5 text-[11px] text-blueprint-200">
                        {q.options.map((o) => (
                          <span key={o.key} className="font-mono">
                            <span className="text-blueprint-500">{o.key}.</span> {truncate(o.text, 24)}
                          </span>
                        ))}
                      </div>
                    )}
                    {q.analysis && (
                      <p className="mt-1.5 text-[11px] text-blueprint-300 border-l border-amber/40 pl-2">
                        {truncate(q.analysis, 60)}
                      </p>
                    )}
                  </div>
                </div>
              </Card>
            ))
          )}
        </div>
      </div>
    );
  }

  // 文件列表视图
  return (
    <div className="space-y-6">
      <Header />

      <div className="flex items-center justify-between">
        <h2 className="bp-eyebrow text-blueprint-300">已导入 {files.length} 个文件</h2>
        <div className="flex gap-2">
          <Button variant="ghost" className="text-xs py-1.5" onClick={() => downloadTemplate("txt")}>
            <Download size={13} /> 模板
          </Button>
          <Link to="/import">
            <Button className="text-xs py-1.5">
              <Upload size={13} /> 导入
            </Button>
          </Link>
        </div>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 stagger">
        {files.map((f) => {
          const Icon = FORMAT_ICON[f.format];
          return (
            <Card key={f.id} className="p-4 flex flex-col">
              <div className="flex items-start justify-between mb-3">
                <div className="flex items-center gap-2 min-w-0">
                  <span className="flex h-9 w-9 items-center justify-center border border-blueprint-500/30 bg-ink-950 rounded-blueprint shrink-0">
                    <Icon size={16} className="text-blueprint-500" />
                  </span>
                  <div className="min-w-0">
                    <div className="text-sm text-blueprint-50 font-medium truncate">{f.name}</div>
                    <div className="text-[10px] text-blueprint-300 font-mono uppercase">
                      {f.format} · {formatDateTime(f.importedAt).split(" ")[0]}
                    </div>
                  </div>
                </div>
              </div>
              <div className="flex items-center gap-2 mb-3">
                <Tag className="border-blueprint-500/40 text-blueprint-500">
                  {f.questionCount} 题
                </Tag>
                <Tag className="border-blueprint-400/30 text-blueprint-400">{f.category}</Tag>
              </div>
              <div className="mt-auto flex items-center gap-1.5">
                <Button variant="ghost" className="text-xs py-1 flex-1" onClick={() => setSelectedFile(f)}>
                  <Eye size={13} /> 浏览
                </Button>
                <Button
                  className="text-xs py-1 flex-1"
                  onClick={() => start("file", f.id, `文件 · ${f.name}`, "sequential")}
                >
                  <Play size={13} /> 练习
                </Button>
                <button
                  onClick={() => setConfirmDelete(f)}
                  className="flex h-8 w-8 items-center justify-center border border-amber/30 text-amber rounded-blueprint hover:bg-amber/10 transition-colors"
                  title="删除文件"
                >
                  <Trash2 size={13} />
                </button>
              </div>
            </Card>
          );
        })}
      </div>

      {/* 删除确认 */}
      <Modal
        open={!!confirmDelete}
        onClose={() => setConfirmDelete(null)}
        title="确认删除"
      >
        <p className="text-sm text-blueprint-100 mb-1">
          将删除文件 <span className="font-mono text-blueprint-50">{confirmDelete?.name}</span> 及其{" "}
          <span className="text-amber font-mono">{confirmDelete?.questionCount}</span> 道题目。
        </p>
        <p className="text-xs text-blueprint-300 mb-5">相关错题/收藏标记也会一并清理，此操作不可撤销。</p>
        <div className="flex justify-end gap-2">
          <Button variant="ghost" onClick={() => setConfirmDelete(null)}>
            取消
          </Button>
          <Button
            variant="danger"
            onClick={async () => {
              if (confirmDelete) await deleteFile(confirmDelete.id);
              setConfirmDelete(null);
            }}
          >
            <Trash2 size={14} /> 删除
          </Button>
        </div>
      </Modal>
    </div>
  );
}

function Header() {
  return (
    <div className="flex items-center gap-2">
      <Library size={16} className="text-blueprint-500" />
      <h1 className="font-mono text-xl text-blueprint-50">题库管理</h1>
      <span className="bp-eyebrow ml-2">QUESTION BANK</span>
    </div>
  );
}
