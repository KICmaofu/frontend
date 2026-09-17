import { useRef, useState } from "react";
import { UploadCloud, FileJson, FileText, FileSpreadsheet, FileType } from "lucide-react";
import { cn } from "@/lib/utils";
import { detectFormat } from "@/lib/parsers";

interface UploadZoneProps {
  onFiles: (files: File[]) => void;
}

export function UploadZone({ onFiles }: UploadZoneProps) {
  const inputRef = useRef<HTMLInputElement>(null);
  const [dragging, setDragging] = useState(false);

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    setDragging(false);
    const files = Array.from(e.dataTransfer.files).filter((f) => detectFormat(f.name));
    if (files.length) onFiles(files);
  };

  const handleSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(e.target.files ?? []).filter((f) => detectFormat(f.name));
    if (files.length) onFiles(files);
    e.target.value = "";
  };

  return (
    <div
      onDragOver={(e) => {
        e.preventDefault();
        setDragging(true);
      }}
      onDragLeave={() => setDragging(false)}
      onDrop={handleDrop}
      onClick={() => inputRef.current?.click()}
      className={cn(
        "relative cursor-pointer border-2 border-dashed rounded-blueprint p-10 text-center transition-all bp-grid-fine overflow-hidden",
        dragging
          ? "border-blueprint-500 bg-blueprint-500/10 shadow-glow"
          : "border-blueprint-500/30 hover:border-blueprint-500/60 hover:bg-blueprint-500/5"
      )}
    >
      <input
        ref={inputRef}
        type="file"
        accept=".json,.csv,.txt,.pdf"
        multiple
        className="hidden"
        onChange={handleSelect}
      />
      <div className="relative z-10">
        <div className="mx-auto mb-4 flex h-14 w-14 items-center justify-center border border-blueprint-500/40 rounded-blueprint bg-ink-950">
          <UploadCloud size={24} className={dragging ? "text-blueprint-500" : "text-blueprint-400"} />
        </div>
        <p className="font-mono text-sm text-blueprint-50 mb-1">
          {dragging ? "释放即可导入" : "拖拽文件到此处，或点击选择"}
        </p>
        <p className="text-xs text-blueprint-300">支持批量导入 · JSON / CSV / TXT / PDF</p>
        <div className="mt-4 flex items-center justify-center gap-4 text-[11px] text-blueprint-300 font-mono">
          <span className="flex items-center gap-1">
            <FileJson size={12} className="text-blueprint-500" /> JSON
          </span>
          <span className="flex items-center gap-1">
            <FileSpreadsheet size={12} className="text-emerald" /> CSV
          </span>
          <span className="flex items-center gap-1">
            <FileText size={12} className="text-amber" /> TXT
          </span>
          <span className="flex items-center gap-1">
            <FileType size={12} className="text-blueprint-400" /> PDF
          </span>
        </div>
      </div>
    </div>
  );
}
