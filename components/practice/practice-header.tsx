import Link from "next/link";
import { Clock, X } from "lucide-react";
import { Button } from "@/components/ui/button";

function formatElapsed(totalSeconds: number) {
  const minutes = Math.floor(totalSeconds / 60)
    .toString()
    .padStart(2, "0");
  const seconds = (totalSeconds % 60).toString().padStart(2, "0");
  return `${minutes}:${seconds}`;
}

interface PracticeHeaderProps {
  sectionLabel: string;
  /** e.g. "שאלה 2 מתוך 5" while answering, or "סיכום תרגול" once every
   * question in the batch has been answered — the caller owns the wording
   * since only it knows which phase the session is in. */
  progressLabel: string;
  progressPct: number;
  elapsedSeconds: number;
  /** Casual practice hides the running clock by default so answering
   * doesn't feel timed/exam-like — the student can opt into seeing it.
   * Exam mode and the essay timer are separate components and never pass
   * this down, so this toggle has no effect on those strict timers. */
  showTimer: boolean;
  onToggleTimer: () => void;
  /** Lets the student jump straight to the results screen before answering
   * every question — omitted once the results screen is already showing,
   * since there's nothing left to submit at that point. */
  onSubmit?: () => void;
}

export function PracticeHeader({
  sectionLabel,
  progressLabel,
  progressPct,
  elapsedSeconds,
  showTimer,
  onToggleTimer,
  onSubmit,
}: PracticeHeaderProps) {
  return (
    <header className="sticky top-0 z-10 border-b border-border/60 bg-background/95 backdrop-blur">
      <div className="mx-auto flex max-w-2xl items-center gap-4 px-6 py-5">
        <Link
          href="/"
          aria-label="יציאה מהתרגול"
          className="flex size-8 shrink-0 items-center justify-center rounded-full text-muted-foreground transition hover:bg-muted hover:text-foreground"
        >
          <X className="size-5" />
        </Link>

        <div className="flex flex-1 flex-col gap-1.5">
          <div className="flex items-center justify-between text-sm text-muted-foreground">
            <span>{sectionLabel}</span>
            <span>{progressLabel}</span>
          </div>
          <div className="h-1.5 w-full overflow-hidden rounded-full bg-muted">
            <div
              className="h-full rounded-full bg-primary transition-[width] duration-300"
              style={{ width: `${progressPct}%` }}
            />
          </div>
        </div>

        <button
          type="button"
          onClick={onToggleTimer}
          dir="ltr"
          aria-label={showTimer ? "הסתרת הטיימר" : "הצגת הטיימר"}
          className="flex shrink-0 items-center gap-1.5 rounded-full bg-muted px-3 py-1 text-sm font-medium tabular-nums text-muted-foreground transition hover:bg-muted/70"
        >
          <Clock className="size-3.5" />
          {showTimer && formatElapsed(elapsedSeconds)}
        </button>

        {onSubmit && (
          <Button size="sm" onClick={onSubmit} className="shrink-0">
            הגש תרגול
          </Button>
        )}
      </div>
    </header>
  );
}
