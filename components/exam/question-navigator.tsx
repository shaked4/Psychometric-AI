"use client";

import { Flag } from "lucide-react";
import { cn } from "@/lib/utils";

interface QuestionNavigatorProps {
  total: number;
  currentIndex: number;
  answered: boolean[];
  flagged: boolean[];
  onJump: (index: number) => void;
}

/** Deliberately neutral colors (not green/red) — exam mode never reveals
 * correctness, so "answered" must not look like "correct". */
export function QuestionNavigator({
  total,
  currentIndex,
  answered,
  flagged,
  onJump,
}: QuestionNavigatorProps) {
  return (
    <div className="flex flex-col gap-3 rounded-xl border border-border bg-card p-4">
      <div className="flex flex-wrap items-center gap-4 text-xs text-muted-foreground">
        <span className="flex items-center gap-1.5">
          <span className="size-2.5 rounded-full bg-primary" /> נענתה
        </span>
        <span className="flex items-center gap-1.5">
          <span className="size-2.5 rounded-full border border-border" /> טרם נענתה
        </span>
        <span className="flex items-center gap-1.5">
          <Flag className="size-3 fill-amber-500 text-amber-500" /> מסומנת לבדיקה חוזרת
        </span>
      </div>

      <div className="grid grid-cols-5 gap-2 sm:grid-cols-10">
        {Array.from({ length: total }, (_, i) => (
          <button
            key={i}
            type="button"
            onClick={() => onJump(i)}
            aria-current={i === currentIndex}
            className={cn(
              "relative flex size-9 items-center justify-center rounded-lg border text-sm font-medium transition",
              i === currentIndex
                ? "border-primary ring-2 ring-primary/30"
                : "border-border hover:border-primary/50",
              answered[i] ? "bg-primary/10 text-foreground" : "bg-background text-muted-foreground"
            )}
          >
            {i + 1}
            {flagged[i] && (
              <Flag className="absolute -top-1.5 -end-1.5 size-3.5 fill-amber-500 text-amber-500" />
            )}
          </button>
        ))}
      </div>
    </div>
  );
}
