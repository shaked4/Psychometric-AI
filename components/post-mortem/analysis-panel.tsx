"use client";

import { Loader2, RefreshCcw, Sparkles } from "lucide-react";
import { Button } from "@/components/ui/button";
import type { MistakeAnalysis } from "@/lib/post-mortem";

export type AnalysisState =
  | { kind: "idle" }
  | { kind: "loading" }
  | { kind: "insufficient" }
  | { kind: "error" }
  | { kind: "ready"; analysis: MistakeAnalysis; offline: boolean };

interface AnalysisPanelProps {
  state: AnalysisState;
  onRun: () => void;
}

export function AnalysisPanel({ state, onRun }: AnalysisPanelProps) {
  return (
    <div className="flex flex-col gap-4 rounded-xl border border-primary/30 bg-primary/5 p-6 shadow-sm">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="flex items-center gap-2">
          <Sparkles className="size-5 text-primary" />
          <h3 className="text-base font-semibold text-card-foreground">ניתוח AI של דפוסי הטעויות</h3>
        </div>
        <Button size="sm" variant="outline" className="gap-1.5" onClick={onRun} disabled={state.kind === "loading"}>
          {state.kind === "loading" ? (
            <Loader2 className="size-3.5 animate-spin" />
          ) : (
            <RefreshCcw className="size-3.5" />
          )}
          {state.kind === "ready" ? "רענון ניתוח" : "הפעל ניתוח"}
        </Button>
      </div>

      {state.kind === "idle" && (
        <p className="text-sm text-muted-foreground">
          לחצו על &quot;הפעל ניתוח&quot; כדי לקבל תובנות מבוססות AI על דפוסי הטעויות שלכם.
        </p>
      )}

      {state.kind === "loading" && (
        <div className="flex items-center gap-2 text-sm text-muted-foreground">
          <Loader2 className="size-4 animate-spin" />
          מנתחים את דפוסי הטעויות שלכם...
        </div>
      )}

      {state.kind === "insufficient" && (
        <p className="text-sm text-muted-foreground">
          עדיין אין מספיק טעויות מתויגות לניתוח. תייגו לפחות 3 טעויות ברשימה למטה ונסו שוב.
        </p>
      )}

      {state.kind === "error" && (
        <p className="text-sm text-red-600 dark:text-red-400">לא הצלחנו להריץ את הניתוח כרגע. נסו שוב.</p>
      )}

      {state.kind === "ready" && (
        <div className="flex flex-col gap-4">
          {state.offline && (
            <p className="text-xs text-muted-foreground">
              * לא זוהה מפתח Claude API פעיל — הניתוח הבא מבוסס על תבנית מקומית שקוראת ישירות את הנתונים שלכם,
              לא על AI חי.
            </p>
          )}

          <p className="text-sm text-card-foreground">{state.analysis.summary}</p>

          {state.analysis.recurringPatterns.length > 0 && (
            <div>
              <h4 className="mb-2 text-sm font-semibold text-card-foreground">דפוסים חוזרים</h4>
              <ul className="flex flex-col gap-2">
                {state.analysis.recurringPatterns.map((p, i) => (
                  <li key={i} className="rounded-lg bg-card p-3 text-sm text-card-foreground shadow-sm">
                    <span className="font-medium">{p.topic}:</span> {p.insight}
                  </li>
                ))}
              </ul>
            </div>
          )}

          {state.analysis.timeLossWarnings.length > 0 && (
            <div>
              <h4 className="mb-2 text-sm font-semibold text-card-foreground">אזהרות זמן</h4>
              <ul className="flex flex-col gap-2">
                {state.analysis.timeLossWarnings.map((w, i) => (
                  <li key={i} className="rounded-lg bg-card p-3 text-sm text-card-foreground shadow-sm">
                    {w}
                  </li>
                ))}
              </ul>
            </div>
          )}

          {state.analysis.actionItems.length > 0 && (
            <div>
              <h4 className="mb-2 text-sm font-semibold text-card-foreground">צעדים מומלצים</h4>
              <ul className="flex flex-col gap-2">
                {state.analysis.actionItems.map((a, i) => (
                  <li key={i} className="flex items-start gap-2 rounded-lg bg-card p-3 text-sm text-card-foreground shadow-sm">
                    <span className="mt-0.5 text-primary">←</span>
                    <span>{a}</span>
                  </li>
                ))}
              </ul>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
