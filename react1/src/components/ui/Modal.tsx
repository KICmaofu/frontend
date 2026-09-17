import { cn } from "@/lib/utils";
import { X } from "lucide-react";
import type { ReactNode } from "react";
import { useEffect } from "react";

interface ModalProps {
  open: boolean;
  onClose: () => void;
  title?: string;
  children: ReactNode;
  className?: string;
}

export function Modal({ open, onClose, title, children, className }: ModalProps) {
  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [open, onClose]);

  if (!open) return null;
  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-ink-950/80 backdrop-blur-sm animate-fade-in p-4"
      onClick={onClose}
    >
      <div
        className={cn(
          "bp-card bp-corner relative w-full max-w-lg rounded-blueprint p-6 animate-fade-up",
          className
        )}
        onClick={(e) => e.stopPropagation()}
      >
        <button
          className="absolute right-3 top-3 text-blueprint-300 hover:text-blueprint-50"
          onClick={onClose}
          aria-label="关闭"
        >
          <X size={18} />
        </button>
        {title && (
          <h3 className="font-mono text-sm uppercase tracking-widest text-blueprint-500 mb-4">
            {title}
          </h3>
        )}
        {children}
      </div>
    </div>
  );
}
