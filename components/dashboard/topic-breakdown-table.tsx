import { Clock } from "lucide-react";
import { cn } from "@/lib/utils";
import { SECTION_LABELS, getStrengthLevel, type StrengthLevel, type TopicStatsWithSection } from "@/lib/stats";

const ACCURACY_COLOR: Record<StrengthLevel, string> = {
  high: "text-green-700 dark:text-green-400",
  medium: "text-yellow-700 dark:text-yellow-400",
  low: "text-red-700 dark:text-red-400",
  none: "text-muted-foreground",
};

/** Above this, a topic is flagged as a "time-sink" — students are getting
 * there, just too slowly. Set relative to the exam's own 60s/question pace
 * (see TARGET_SECONDS_PER_QUESTION in lib/readiness.ts). */
const TIME_SINK_THRESHOLD_SECONDS = 90;

function formatTime(seconds: number) {
  const m = Math.floor(seconds / 60);
  const s = seconds % 60;
  return m > 0 ? `${m}:${s.toString().padStart(2, "0")}` : `${s}s`;
}

export function TopicBreakdownTable({ topics }: { topics: TopicStatsWithSection[] }) {
  const attempted = topics.filter((t) => t.attemptCount > 0).sort((a, b) => a.accuracy - b.accuracy);

  if (attempted.length === 0) {
    return (
      <div className="rounded-xl border border-dashed border-border p-6 text-center text-sm text-muted-foreground">
        עדיין אין מספיק תרגול כדי להציג פירוט לפי נושא.
      </div>
    );
  }

  return (
    <div className="overflow-x-auto rounded-xl border border-border bg-card shadow-sm">
      <table className="w-full min-w-[560px] text-sm">
        <thead>
          <tr className="border-b border-border text-start text-xs text-muted-foreground">
            <th className="px-4 py-3 text-start font-medium">נושא</th>
            <th className="px-4 py-3 text-start font-medium">קטע</th>
            <th className="px-4 py-3 text-start font-medium">דיוק</th>
            <th className="px-4 py-3 text-start font-medium">זמן ממוצע</th>
            <th className="px-4 py-3 text-start font-medium">שאלות</th>
          </tr>
        </thead>
        <tbody>
          {attempted.map((topic) => {
            const level = getStrengthLevel(topic.accuracy, topic.attemptCount);
            const isTimeSink = topic.avgTimeSeconds > TIME_SINK_THRESHOLD_SECONDS;
            return (
              <tr key={`${topic.section}-${topic.subtopic}`} className="border-b border-border/60 last:border-0">
                <td className="px-4 py-3 text-card-foreground">{topic.subtopic}</td>
                <td className="px-4 py-3 text-muted-foreground">{SECTION_LABELS[topic.section]}</td>
                <td className={cn("px-4 py-3 font-medium tabular-nums", ACCURACY_COLOR[level])}>
                  {topic.accuracy}%
                </td>
                <td className="px-4 py-3">
                  <span
                    dir="ltr"
                    className={cn(
                      "inline-flex items-center gap-1 tabular-nums",
                      isTimeSink ? "font-medium text-amber-600 dark:text-amber-400" : "text-card-foreground"
                    )}
                  >
                    {isTimeSink && <Clock className="size-3.5" />}
                    {formatTime(topic.avgTimeSeconds)}
                  </span>
                </td>
                <td className="px-4 py-3 tabular-nums text-muted-foreground">{topic.attemptCount}</td>
              </tr>
            );
          })}
        </tbody>
      </table>
      <p className="border-t border-border px-4 py-2.5 text-xs text-muted-foreground">
        <Clock className="me-1 inline size-3 align-[-1px] text-amber-600 dark:text-amber-400" />
        מסומן — נושאים שלוקחים לכם מעל {TIME_SINK_THRESHOLD_SECONDS} שניות בממוצע לשאלה (איטי מקצב המבחן).
      </p>
    </div>
  );
}
