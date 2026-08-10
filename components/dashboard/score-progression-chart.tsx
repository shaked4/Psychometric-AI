import { SECTION_LABELS } from "@/lib/stats";
import type { ExamHistoryEntry } from "@/lib/exam-history";

const CHART_WIDTH = 640;
const CHART_HEIGHT = 180;
const PADDING = 28;
const MIN_SCORE = 50;
const MAX_SCORE = 150;

/** Dependency-free SVG line chart — kept out of the RTL flow (dir="ltr")
 * since a chronological left-to-right axis is the standard convention for
 * time-series charts regardless of page language, same as embedded
 * math/numeric content elsewhere in the app. */
export function ScoreProgressionChart({ entries }: { entries: ExamHistoryEntry[] }) {
  if (entries.length < 2) {
    return (
      <div className="flex min-h-[180px] flex-col items-center justify-center gap-1 rounded-xl border border-dashed border-border p-6 text-center text-sm text-muted-foreground">
        <p>עוד אין מספיק סימולציות כדי להציג מגמת ציונים.</p>
        <p>השלימו לפחות שתי סימולציות פרק כדי לראות כאן גרף התקדמות.</p>
      </div>
    );
  }

  const sorted = [...entries].sort(
    (a, b) => new Date(a.completedAt).getTime() - new Date(b.completedAt).getTime()
  );

  const usableWidth = CHART_WIDTH - PADDING * 2;
  const usableHeight = CHART_HEIGHT - PADDING * 2;

  const points = sorted.map((entry, i) => {
    const x = PADDING + (sorted.length === 1 ? usableWidth / 2 : (i / (sorted.length - 1)) * usableWidth);
    const y = PADDING + usableHeight - ((entry.score - MIN_SCORE) / (MAX_SCORE - MIN_SCORE)) * usableHeight;
    return { x, y, entry };
  });

  const path = points.map((p, i) => `${i === 0 ? "M" : "L"}${p.x.toFixed(1)},${p.y.toFixed(1)}`).join(" ");

  return (
    <div dir="ltr" className="w-full overflow-x-auto">
      <svg viewBox={`0 0 ${CHART_WIDTH} ${CHART_HEIGHT}`} className="h-[180px] w-full min-w-[480px]">
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
          <circle key={p.entry.sessionId} cx={p.x} cy={p.y} r={4} className="fill-primary">
            <title>
              {p.entry.score} ({SECTION_LABELS[p.entry.section]},{" "}
              {new Date(p.entry.completedAt).toLocaleDateString("he-IL")})
            </title>
          </circle>
        ))}
      </svg>
      <div className="mt-2 flex justify-between text-xs text-muted-foreground">
        <span>{new Date(sorted[0].completedAt).toLocaleDateString("he-IL")}</span>
        <span>{new Date(sorted[sorted.length - 1].completedAt).toLocaleDateString("he-IL")}</span>
      </div>
    </div>
  );
}
