import { useLiveQuery } from "dexie-react-hooks";
import { db } from "@/lib/db";
import { OverviewCards } from "@/components/dashboard/OverviewCards";
import { QuickStart } from "@/components/dashboard/QuickStart";
import { ContinueLast } from "@/components/dashboard/ContinueLast";
import { Button } from "@/components/ui/Button";
import { Upload, Cpu, Database, ShieldCheck } from "lucide-react";
import { Link } from "react-router-dom";

export default function Dashboard() {
  const hasFiles = useLiveQuery(() => db.files.count().then((c) => c > 0), []);

  return (
    <div className="space-y-8">
      {/* Hero 区 */}
      <section className="relative overflow-hidden border border-blueprint-500/15 bp-grid-fine rounded-blueprint">
        <div className="bp-noise absolute inset-0" />
        <div className="relative z-10 p-8 md:p-10">
          <div className="flex items-center gap-2 mb-3">
            <span className="h-1.5 w-1.5 bg-blueprint-500 rounded-full animate-pulse" />
            <span className="bp-eyebrow text-blueprint-500">SYSTEM ONLINE · 系统就绪</span>
          </div>
          <h1 className="font-mono text-3xl md:text-4xl font-bold text-blueprint-50 leading-tight">
            工业机器人备赛
            <span className="text-blueprint-500">·</span>
            蓝图刷题台
          </h1>
          <p className="mt-3 max-w-2xl text-blueprint-200 text-sm md:text-base leading-relaxed">
            导入你自己的 JSON / CSV / TXT 题库文件，按文件结构自动分类，顺序或随机刷题，全程本地存储。
            所有题目内容完全来自你的文件——软件不预置任何题目。
          </p>
          <div className="mt-5 flex flex-wrap items-center gap-3">
            <Link to="/import">
              <Button>
                <Upload size={15} /> 导入题库
              </Button>
            </Link>
            <Link to="/bank">
              <Button variant="ghost">
                <Database size={15} /> 查看题库
              </Button>
            </Link>
          </div>

          <div className="mt-6 flex flex-wrap gap-4 text-[11px] text-blueprint-300 font-mono">
            <span className="flex items-center gap-1.5">
              <ShieldCheck size={12} className="text-emerald" /> 数据不上传
            </span>
            <span className="flex items-center gap-1.5">
              <Cpu size={12} className="text-blueprint-500" /> 本地解析
            </span>
          </div>
        </div>
        {/* 角落坐标标记 */}
        <div className="absolute top-2 right-3 font-mono text-[9px] text-blueprint-300/60 tracking-widest">
          X:0.00 Y:0.00 / SCALE 1:1
        </div>
      </section>

      <OverviewCards />

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div className="lg:col-span-2">
          <QuickStart />
        </div>
        <div className="space-y-6">
          <ContinueLast />
          {hasFiles === false && (
            <div className="bp-card bp-corner rounded-blueprint p-5 border-dashed">
              <div className="bp-eyebrow text-amber mb-2">首次使用</div>
              <p className="text-sm text-blueprint-200 mb-3">
                题库为空。下载示例模板了解格式，或直接拖入你的题库文件。
              </p>
              <Link to="/import">
                <Button variant="ghost" className="w-full">
                  <Upload size={14} /> 前往导入向导
                </Button>
              </Link>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
