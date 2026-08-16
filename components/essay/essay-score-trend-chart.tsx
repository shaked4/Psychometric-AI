import { TrendingDown, TrendingUp } from "lucide-react";
import { cn } from "@/lib/utils";
import type { EssayAttempt } from "@/lib/essay-storage";

const CHART_WIDTH = 640;
const CHART_HEIGHT = 160;
const PADDING = 28;
const MIN_SCORE = 50;
const MAX_SCORE = 150;

/** Dependency-free SVG line chart — same pattern as
 * components/dashboard/score-progression-chart.tsx (kept out of the RTL
 * flow with dir="ltr", since chronological left-to-right is the standard
 * time-series convention regardless of page language), adapted for essay
 * attempts instead of exam sessions. */
export function EssayScoreTrendChart({ attempts }: { attempts: EssayAttempt[] }) {
  if (attempts.length < 2) {
    return (
      <div className="flex min-h-[160px] flex-col items-center justify-center gap-1 rounded-xl border border-dashed border-border p-6 text-center text-sm text-muted-foreground">
        <p>עוד אין מספיק חיבורים כדי להציג מגמת ציונים.</p>
        <p>כתבו לפחות שני חיבורים כדי לראות כאן גרף התקדמות.</p>
      </div>
    );
  }

  const sorted = [...attempts].sort(
    (a, b) => new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime()
  );

  const usableWidth = CHART_WIDTH - PADDING * 2;
  const usableHeight = CHART_HEIGHT - PADDING * 2;

  const points = sorted.map((attempt, i) => {
    const x = PADDING + (i / (sorted.length - 1)) * usableWidth;
    const y =
      PADDING +
      usableHeight -
      ((attempt.estimatedPsychometricScore - MIN_SCORE) / (MAX_SCORE - MIN_SCORE)) * usableHeight;
    return { x, y, attempt };
  });

  const path = points.map((p, i) => `${i === 0 ? "M" : "L"}${p.x.toFixed(1)},${p.y.toFixed(1)}`).join(" ");

  const first = sorted[0].estimatedPsychometricScore;
  const last = sorted[sorted.length - 1].estimatedPsychometricScore;
  const delta = last - first;

  return (
    <div className="flex flex-col gap-3">
      <div className="flex items-center gap-2 text-sm">
        {delta >= 0 ? (
          <TrendingUp className="size-4 text-green-600" />
        ) : (
          <TrendingDown className="size-4 text-red-600" />
        )}
        <span className={cn("font-medium tabular-nums", delta >= 0 ? "text-green-700 dark:text-green-400" : "text-red-700 dark:text-red-400")}>
          {delta >= 0 ? "+" : ""}
          {delta} נקודות
        </span>
        <span className="text-muted-foreground">מאז החיבור הראשון</span>
      </div>

      <div dir="ltr" className="w-full overflow-x-auto">
        <svg viewBox={`0 0 ${CHART_WIDTH} ${CHART_HEIGHT}`} className="h-[160px] w-full min-w-[420px]">
          <line
            x1={PADDING}
            y1={CHART_HEIGHT - PADDING}
            x2={CHART_WIDTH - PADDING}
            y2={CHART_HEIGHT - PADDING}
            className="stroke-border"
            strokeWidth={1}
          />
          <path d={path} fill="none" className="stroke-primary" strokeWidth={2} />
          {points.map((p) => (
            <circle key={p.attempt.id} cx={p.x} cy={p.y} r={4} className="fill-primary">
              <title>
                {p.attempt.estimatedPsychometricScore} · {p.attempt.promptTitle} (
                {new Date(p.attempt.createdAt).toLocaleDateString("he-IL")})
              </title>
            </circle>
          ))}
        </svg>
        <div className="mt-2 flex justify-between text-xs text-muted-foreground">
          <span>{new Date(sorted[0].createdAt).toLocaleDateString("he-IL")}</span>
          <span>{new Date(sorted[sorted.length - 1].createdAt).toLocaleDateString("he-IL")}</span>
        </div>
      </div>
    </div>
  );
}
