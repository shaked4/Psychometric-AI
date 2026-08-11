import { ERROR_REASON_LABELS } from "@/lib/stats";
import type { TagBreakdownEntry } from "@/lib/post-mortem";

interface ErrorBreakdownCardProps {
  breakdown: TagBreakdownEntry[];
  totalTagged: number;
}

export function ErrorBreakdownCard({ breakdown, totalTagged }: ErrorBreakdownCardProps) {
  if (breakdown.length === 0) {
    return (
      <div className="rounded-xl border border-dashed border-border p-6 text-center text-sm text-muted-foreground">
        עדיין אין טעויות מתויגות. תייגו טעויות ברשימה למטה כדי לראות כאן פילוח.
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-3 rounded-xl border border-border bg-card p-5 shadow-sm">
      <h3 className="text-base font-semibold text-card-foreground">
        התפלגות סיבות טעות ({totalTagged} מתויגות)
      </h3>
      <div className="flex flex-col gap-2.5">
        {breakdown.map((entry) => (
          <div key={entry.tag} className="flex items-center gap-3">
            <span className="w-44 shrink-0 text-xs text-muted-foreground">{ERROR_REASON_LABELS[entry.tag]}</span>
            <div className="h-1.5 flex-1 overflow-hidden rounded-full bg-muted">
              <div
                className="h-full rounded-full bg-primary transition-[width] duration-300"
                style={{ width: `${entry.pct}%` }}
              />
            </div>
            <span className="w-10 shrink-0 text-end text-xs tabular-nums text-muted-foreground">
              {entry.pct}%
            </span>
          </div>
        ))}
      </div>
    </div>
  );
}
