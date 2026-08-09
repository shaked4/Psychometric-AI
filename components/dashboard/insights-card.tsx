import { Sparkles } from "lucide-react";
import { ERROR_REASON_LABELS, SECTION_LABELS, type ErrorInsight } from "@/lib/stats";

interface InsightsCardProps {
  insights: ErrorInsight[];
}

export function InsightsCard({ insights }: InsightsCardProps) {
  return (
    <div className="flex flex-col gap-4 rounded-xl border border-border bg-card p-5 shadow-sm">
      <div className="flex items-center gap-2">
        <Sparkles className="size-5 text-primary" />
        <h3 className="text-base font-semibold text-card-foreground">
          תובנות AI על דפוסי הטעויות שלך
        </h3>
      </div>

      {insights.length === 0 ? (
        <p className="text-sm text-muted-foreground">
          עדיין אין מספיק נתונים כדי לזהות דפוסי טעויות. המשיכו לתרגל ולדווח על סיבת
          הטעות כשטועים — ככל שתתרגלו יותר, התובנות כאן ייעשו מדויקות יותר.
        </p>
      ) : (
        <ul className="flex flex-col gap-3">
          {insights.map((insight) => (
            <li
              key={`${insight.section}-${insight.topic}`}
              className="rounded-lg bg-muted/50 p-3 text-sm text-card-foreground"
            >
              <span className="font-medium">{insight.pct}%</span> מהתשובות השגויות שלך
              ב<span className="font-medium">{insight.topic}</span> (
              {SECTION_LABELS[insight.section]}) נובעות מ
              <span className="font-medium">{ERROR_REASON_LABELS[insight.dominantReason]}</span>.
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
