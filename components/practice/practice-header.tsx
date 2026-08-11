import Link from "next/link";
import { X } from "lucide-react";

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
}

export function PracticeHeader({
  sectionLabel,
  progressLabel,
  progressPct,
  elapsedSeconds,
}: PracticeHeaderProps) {
  return (
    <header className="sticky top-0 z-10 border-b border-border bg-background/95 backdrop-blur">
      <div className="mx-auto flex max-w-2xl items-center gap-4 px-6 py-4">
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

        <div
          dir="ltr"
          className="shrink-0 rounded-full bg-muted px-3 py-1 text-sm font-medium tabular-nums text-muted-foreground"
        >
          {formatElapsed(elapsedSeconds)}
        </div>
      </div>
    </header>
  );
}
