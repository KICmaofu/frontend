import { cn } from "@/lib/utils";
import type { HTMLAttributes, ReactNode } from "react";

interface CardProps extends HTMLAttributes<HTMLDivElement> {
  children: ReactNode;
  corner?: boolean;
}

export function Card({ className, children, corner = true, ...props }: CardProps) {
  return (
    <div className={cn("bp-card bp-corner rounded-blueprint", className)} {...props}>
      {children}
    </div>
  );
}
