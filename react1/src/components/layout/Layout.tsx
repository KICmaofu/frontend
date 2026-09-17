import { NavLink, useLocation } from "react-router-dom";
import { LayoutDashboard, Library, Upload, BarChart3, Cpu } from "lucide-react";
import { cn } from "@/lib/utils";
import type { ReactNode } from "react";

const NAV = [
  { to: "/", label: "控制台", icon: LayoutDashboard, exact: true },
  { to: "/bank", label: "题库", icon: Library },
  { to: "/import", label: "导入", icon: Upload },
  { to: "/progress", label: "进度", icon: BarChart3 },
];

export function Layout({ children }: { children: ReactNode }) {
  const loc = useLocation();
  // 练习页全屏，不套布局
  if (loc.pathname.startsWith("/practice")) {
    return <>{children}</>;
  }
  return (
    <div className="min-h-screen flex flex-col bp-grid-fine bp-noise relative">
      <header className="sticky top-0 z-40 border-b border-blueprint-500/15 bg-ink-950/85 backdrop-blur-md">
        <div className="container flex h-14 items-center gap-6">
          <NavLink to="/" className="flex items-center gap-2 group">
            <span className="relative flex h-8 w-8 items-center justify-center border border-blueprint-500/50 bg-ink-900 rounded-blueprint group-hover:border-blueprint-500 transition-colors">
              <Cpu size={16} className="text-blueprint-500" />
              <span className="absolute -right-0.5 -top-0.5 h-1.5 w-1.5 bg-amber rounded-full animate-pulse" />
            </span>
            <div className="leading-none">
              <div className="font-mono text-sm font-bold tracking-wider text-blueprint-50">
                BLUEPRINT<span className="text-blueprint-500">·QUIZ</span>
              </div>
              <div className="text-[9px] uppercase tracking-[0.2em] text-blueprint-300">
                工业机器人备赛
              </div>
            </div>
          </NavLink>

          <nav className="ml-auto flex items-center gap-1">
            {NAV.map((item) => {
              const Icon = item.icon;
              const active = item.exact
                ? loc.pathname === item.to
                : loc.pathname.startsWith(item.to);
              return (
                <NavLink
                  key={item.to}
                  to={item.to}
                  end={item.exact}
                  className={cn(
                    "relative flex items-center gap-1.5 px-3 py-1.5 text-sm font-medium rounded-blueprint transition-colors",
                    active
                      ? "text-blueprint-500 bg-blueprint-500/10"
                      : "text-blueprint-200 hover:text-blueprint-50 hover:bg-blueprint-500/5"
                  )}
                >
                  <Icon size={15} />
                  <span className="hidden sm:inline">{item.label}</span>
                  {active && (
                    <span className="absolute -bottom-[9px] left-1/2 h-0.5 w-8 -translate-x-1/2 bg-blueprint-500" />
                  )}
                </NavLink>
              );
            })}
          </nav>
        </div>
        {/* 顶部细线刻度装饰 */}
        <div className="h-px bg-gradient-to-r from-transparent via-blueprint-500/40 to-transparent" />
      </header>

      <main className="container flex-1 py-6 md:py-8 relative z-10">{children}</main>

      <footer className="border-t border-blueprint-500/10 py-4">
        <div className="container flex items-center justify-between text-[11px] text-blueprint-300 font-mono">
          <span>数据本地存储 · 不上传服务器</span>
          <span className="hidden sm:inline">JSON / CSV / TXT 批量导入</span>
        </div>
      </footer>
    </div>
  );
}
