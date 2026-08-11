"use client";

import { cn } from "@/lib/utils";

interface EssayEditorProps {
  value: string;
  onChange: (text: string) => void;
  disabled?: boolean;
}

export const TARGET_MIN_WORDS = 300;
export const TARGET_MAX_WORDS = 500;

export function countEssayWords(text: string): number {
  const trimmed = text.trim();
  return trimmed.length === 0 ? 0 : trimmed.split(/\s+/).length;
}

export function EssayEditor({ value, onChange, disabled }: EssayEditorProps) {
  const wordCount = countEssayWords(value);
  const inTarget = wordCount >= TARGET_MIN_WORDS && wordCount <= TARGET_MAX_WORDS;
  const overTarget = wordCount > TARGET_MAX_WORDS;

  return (
    <div className="flex flex-col gap-2">
      <textarea
        value={value}
        onChange={(e) => onChange(e.target.value)}
        disabled={disabled}
        dir="rtl"
        placeholder="התחילו לכתוב את החיבור שלכם כאן..."
        className="min-h-[420px] w-full resize-y rounded-xl border border-border bg-card p-5 text-base leading-relaxed text-card-foreground outline-none focus:border-primary disabled:opacity-60"
      />
      <div className="flex items-center justify-between text-sm">
        <span
          className={cn(
            "font-medium tabular-nums",
            inTarget
              ? "text-green-700 dark:text-green-400"
              : overTarget
                ? "text-amber-600 dark:text-amber-400"
                : "text-muted-foreground"
          )}
        >
          {wordCount} מילים <span className="font-normal text-muted-foreground">(יעד: 300–500)</span>
        </span>
      </div>
    </div>
  );
}
