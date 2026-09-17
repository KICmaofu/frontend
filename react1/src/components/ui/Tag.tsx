import { cn } from "@/lib/utils";
import type { ReactNode } from "react";

interface TagProps {
  children: ReactNode;
  className?: string;
  title?: string;
}

export function Tag({ children, className, title }: TagProps) {
  return (
    <span
      title={title}
      className={cn(
        "inline-flex items-center gap-1 border px-2 py-0.5 font-mono text-[10px] uppercase tracking-wider rounded-blueprint",
        className
      )}
    >
      {children}
    </span>
  );
}
