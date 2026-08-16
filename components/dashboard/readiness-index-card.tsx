import { Gauge } from "lucide-react";
import { cn } from "@/lib/utils";
import type { ReadinessBreakdown } from "@/lib/readiness";

const COMPONENTS: { key: keyof Omit<ReadinessBreakdown, "index">; label: string }[] = [
  { key: "accuracyScore", label: "דיוק" },
  { key: "paceScore", label: "קצב" },
  { key: "streakScore", label: "רציפות תרגול" },
];

function levelColor(index: number) {
  if (index >= 80) return "text-green-600 dark:text-green-400";
  if (index >= 50) return "text-yellow-600 dark:text-yellow-400";
  return "text-red-600 dark:text-red-400";
}

function barColor(index: number) {
  if (index >= 80) return "bg-green-500";
  if (index >= 50) return "bg-yellow-500";
  return "bg-red-500";
}

export function ReadinessIndexCard({
  breakdown,
  hasAttempts,
}: {
  breakdown: ReadinessBreakdown;
  hasAttempts: boolean;
}) {
  // A fresh account computes to index: 0 the same way a struggling one
  // could — but 0 here means "no data yet," not "failing," so it gets a
  // neutral empty state instead of the red gauge a real low score earns.
  if (!hasAttempts) {
    return (
      <div className="flex flex-col items-center gap-2 rounded-xl border border-border bg-card p-6 text-center shadow-sm sm:flex-row sm:justify-between sm:text-start">
        <div className="flex items-center gap-2 text-sm font-medium text-muted-foreground">
          <Gauge className="size-4" />
          מדד מוכנות
        </div>
        <p className="text-sm text-muted-foreground">
          עדיין אין לכם מספיק תרגול כדי לחשב מדד מוכנות — הוא יופיע כאן אחרי כמה שאלות.
        </p>
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-5 rounded-xl border border-border bg-card p-6 shadow-sm sm:flex-row sm:items-center sm:gap-8">
      <div className="flex shrink-0 flex-col items-center gap-1.5 text-center">
        <div className="flex items-center gap-1.5 text-sm font-medium text-muted-foreground">
          <Gauge className="size-4" />
          מדד מוכנות
        </div>
        <p className={cn("text-4xl font-bold tabular-nums", levelColor(breakdown.index))}>
          {breakdown.index}%
        </p>
      </div>

      <div className="flex flex-1 flex-col gap-2.5">
        {COMPONENTS.map(({ key, label }) => {
          const value = breakdown[key];
          return (
            <div key={key} className="flex items-center gap-3">
              <span className="w-28 shrink-0 text-xs text-muted-foreground">{label}</span>
              <div className="h-1.5 flex-1 overflow-hidden rounded-full bg-muted">
                <div
                  className={cn("h-full rounded-full transition-[width] duration-300", barColor(value))}
                  style={{ width: `${value}%` }}
                />
              </div>
              <span className="w-9 shrink-0 text-end text-xs tabular-nums text-muted-foreground">
                {value}%
              </span>
            </div>
          );
        })}
      </div>
    </div>
  );
}
