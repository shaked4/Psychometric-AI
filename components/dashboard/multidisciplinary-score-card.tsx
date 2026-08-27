import { Scale } from "lucide-react";
import { cn } from "@/lib/utils";
import type { MultidisciplinaryScore } from "@/lib/stats";

const COMPONENTS: { key: "quantAccuracyPct" | "verbalAccuracyPct"; label: string }[] = [
  { key: "quantAccuracyPct", label: "כמותי" },
  { key: "verbalAccuracyPct", label: "מילולי" },
];

function levelColor(pct: number) {
  if (pct >= 80) return "text-green-600 dark:text-green-400";
  if (pct >= 50) return "text-yellow-600 dark:text-yellow-400";
  return "text-red-600 dark:text-red-400";
}

function barColor(pct: number) {
  if (pct >= 80) return "bg-green-500";
  if (pct >= 50) return "bg-yellow-500";
  return "bg-red-500";
}

/** "ציון רב-תחומי" — the 2026-format composite score (50% quant / 50%
 * verbal, English excluded now that AMIRNET is a separate test). Mirrors
 * ReadinessIndexCard's two-state shape (empty state vs. populated). */
export function MultidisciplinaryScoreCard({ result }: { result: MultidisciplinaryScore }) {
  if (!result.hasEnoughData) {
    return (
      <div className="flex flex-col items-center gap-2 rounded-xl border border-border bg-card p-6 text-center shadow-sm sm:flex-row sm:justify-between sm:text-start">
        <div className="flex items-center gap-2 text-sm font-medium text-muted-foreground">
          <Scale className="size-4" />
          ציון רב-תחומי (מתכונת 2026)
        </div>
        <p className="text-sm text-muted-foreground">
          עדיין אין מספיק תרגול בכמותי ובמילולי כדי לחשב ציון רב-תחומי — הוא יופיע כאן לאחר תרגול בשני התחומים.
        </p>
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-5 rounded-xl border border-border bg-card p-6 shadow-sm sm:flex-row sm:items-center sm:gap-8">
      <div className="flex shrink-0 flex-col items-center gap-1.5 text-center">
        <div className="flex items-center gap-1.5 text-sm font-medium text-muted-foreground">
          <Scale className="size-4" />
          ציון רב-תחומי (מתכונת 2026)
        </div>
        <p className="text-4xl font-bold tabular-nums text-card-foreground">{result.score}</p>
        <p className="text-xs text-muted-foreground">50% כמותי · 50% מילולי, ללא אנגלית</p>
      </div>

      <div className="flex flex-1 flex-col gap-2.5">
        {COMPONENTS.map(({ key, label }) => {
          const value = result[key];
          return (
            <div key={key} className="flex items-center gap-3">
              <span className="w-16 shrink-0 text-xs text-muted-foreground">{label}</span>
              <div className="h-1.5 flex-1 overflow-hidden rounded-full bg-muted">
                <div
                  className={cn("h-full rounded-full transition-[width] duration-300", barColor(value))}
                  style={{ width: `${value}%` }}
                />
              </div>
              <span className={cn("w-9 shrink-0 text-end text-xs tabular-nums", levelColor(value))}>
                {value}%
              </span>
            </div>
          );
        })}
      </div>
    </div>
  );
}
