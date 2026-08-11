import { Clock } from "lucide-react";
import { SECTION_LABELS } from "@/lib/stats";
import type { TimeLossWarning } from "@/lib/post-mortem";

function formatMinutes(seconds: number) {
  return (seconds / 60).toFixed(1);
}

export function TimeLossWarningsCard({ warnings }: { warnings: TimeLossWarning[] }) {
  if (warnings.length === 0) {
    return (
      <div className="rounded-xl border border-dashed border-border p-6 text-center text-sm text-muted-foreground">
        לא זיהינו כרגע נושאים עם בזבוז זמן ניכר.
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-3 rounded-xl border border-border bg-card p-5 shadow-sm">
      <h3 className="flex items-center gap-2 text-base font-semibold text-card-foreground">
        <Clock className="size-4 text-amber-600 dark:text-amber-400" />
        התראות על בזבוז זמן
      </h3>
      <ul className="flex flex-col gap-2">
        {warnings.map((w) => (
          <li key={`${w.section}-${w.topic}`} className="rounded-lg bg-amber-500/10 p-3 text-sm text-card-foreground">
            בנושא <span className="font-medium">{w.topic}</span> ({SECTION_LABELS[w.section]}) אתם מבלים בממוצע{" "}
            <span className="font-medium">{formatMinutes(w.avgTimeSeconds)} דקות</span> לשאלה ({w.slowCount}{" "}
            שאלות).
          </li>
        ))}
      </ul>
    </div>
  );
}
