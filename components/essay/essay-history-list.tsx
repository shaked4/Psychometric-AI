"use client";

import { FileText } from "lucide-react";
import type { EssayAttempt } from "@/lib/essay-storage";

function formatDate(iso: string) {
  return new Date(iso).toLocaleDateString("he-IL", { year: "numeric", month: "short", day: "numeric" });
}

interface EssayHistoryListProps {
  attempts: EssayAttempt[];
  onSelect: (attempt: EssayAttempt) => void;
}

export function EssayHistoryList({ attempts, onSelect }: EssayHistoryListProps) {
  if (attempts.length === 0) {
    return (
      <div className="rounded-xl border border-dashed border-border p-8 text-center text-muted-foreground">
        עדיין לא כתבתם חיבורים — בחרו נושא למעלה כדי להתחיל.
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-3">
      {attempts.map((a) => (
        <button
          key={a.id}
          type="button"
          onClick={() => onSelect(a)}
          className="flex items-center justify-between gap-3 rounded-xl border border-border bg-card p-4 text-start shadow-sm transition hover:border-primary/50 hover:bg-muted/40"
        >
          <div className="flex min-w-0 items-center gap-3">
            <FileText className="size-5 shrink-0 text-muted-foreground" />
            <div className="flex min-w-0 flex-col">
              <span className="truncate text-sm font-medium text-card-foreground">{a.promptTitle}</span>
              <span className="text-xs text-muted-foreground">
                {formatDate(a.createdAt)} · {a.wordCount} מילים
              </span>
            </div>
          </div>
          <div className="flex shrink-0 items-center gap-3 text-sm font-medium tabular-nums">
            <span className="text-muted-foreground">תוכן {a.contentScore}/6</span>
            <span className="text-muted-foreground">לשון {a.languageScore}/6</span>
            <span className="rounded-full bg-primary/10 px-2.5 py-1 text-primary">
              {a.estimatedPsychometricScore}
            </span>
          </div>
        </button>
      ))}
    </div>
  );
}
