"use client";

import { cn } from "@/lib/utils";
import { ERROR_REASON_LABELS } from "@/lib/stats";
import type { SelfReportedError } from "@/types";

const TAG_ORDER: SelfReportedError[] = [
  "misread_question",
  "calculation_error",
  "time_pressure",
  "knowledge_gap",
  "guessed",
];

interface ErrorTagPickerProps {
  value: SelfReportedError | null;
  onSelect: (tag: SelfReportedError) => void;
  size?: "sm" | "md";
}

/** Shared 5-category root-cause tag picker — used both for the inline
 * quick-tag right after answering (components/practice/feedback-panel.tsx)
 * and for retroactive tagging in the deep post-mortem review. */
export function ErrorTagPicker({ value, onSelect, size = "md" }: ErrorTagPickerProps) {
  return (
    <div className="flex flex-wrap gap-2">
      {TAG_ORDER.map((tag) => (
        <button
          key={tag}
          type="button"
          onClick={() => onSelect(tag)}
          className={cn(
            "rounded-full border transition",
            size === "sm" ? "px-3 py-1 text-xs" : "px-3.5 py-1.5 text-sm",
            value === tag
              ? "border-primary bg-primary text-primary-foreground"
              : "border-border text-muted-foreground hover:bg-muted"
          )}
        >
          {ERROR_REASON_LABELS[tag]}
        </button>
      ))}
    </div>
  );
}
