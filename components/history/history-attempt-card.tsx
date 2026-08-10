"use client";

import { useState } from "react";
import { CheckCircle2, ChevronDown, Loader2, Sparkles, XCircle } from "lucide-react";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { MathText } from "@/components/practice/math-text";
import { useTutorExplain } from "@/lib/use-tutor-explain";
import { ERROR_REASON_LABELS, SECTION_LABELS } from "@/lib/stats";
import type { Attempt, Question } from "@/types";

interface HistoryAttemptCardProps {
  attempt: Attempt;
  question: Question;
}

function formatTime(seconds: number) {
  const m = Math.floor(seconds / 60);
  const s = seconds % 60;
  return m > 0 ? `${m} דק' ${s} שנ'` : `${s} שניות`;
}

export function HistoryAttemptCard({ attempt, question }: HistoryAttemptCardProps) {
  const [expanded, setExpanded] = useState(false);
  const { reply, loading, explainDifferently } = useTutorExplain(
    question,
    attempt.chosenAnswer,
    attempt.selfReportedError
  );
  const dir = question.section === "english" ? "ltr" : undefined;

  return (
    <div
      className={cn(
        "flex flex-col gap-3 rounded-xl border bg-card p-5 shadow-sm",
        attempt.isCorrect ? "border-border" : "border-red-600/20"
      )}
    >
      <div className="flex flex-wrap items-center justify-between gap-2">
        <div className="flex flex-wrap items-center gap-2 text-xs font-medium text-muted-foreground">
          <span className="rounded-full bg-muted px-2.5 py-1">{SECTION_LABELS[question.section]}</span>
          <span className="rounded-full bg-muted px-2.5 py-1">{question.topic}</span>
          <span className="rounded-full bg-muted px-2.5 py-1">{question.subtopic}</span>
        </div>
        <div className="flex items-center gap-1.5 text-sm font-medium">
          {attempt.isCorrect ? (
            <CheckCircle2 className="size-4 text-green-600" />
          ) : (
            <XCircle className="size-4 text-red-600" />
          )}
          <span
            className={
              attempt.isCorrect
                ? "text-green-700 dark:text-green-400"
                : "text-red-700 dark:text-red-400"
            }
          >
            {attempt.isCorrect ? "נכון" : "שגוי"}
          </span>
        </div>
      </div>

      <p dir={dir} className="text-base text-card-foreground">
        <MathText text={question.body} />
      </p>

      <div className="flex flex-col gap-1.5 text-sm">
        <div dir={dir} className="flex items-start gap-1.5">
          <span className="shrink-0 text-muted-foreground">התשובה שלך:</span>
          <span
            className={
              attempt.isCorrect
                ? "text-green-700 dark:text-green-400"
                : "text-red-700 dark:text-red-400"
            }
          >
            <MathText text={question.choices[attempt.chosenAnswer]} />
          </span>
        </div>
        {!attempt.isCorrect && (
          <div dir={dir} className="flex items-start gap-1.5">
            <span className="shrink-0 text-muted-foreground">התשובה הנכונה:</span>
            <span className="text-green-700 dark:text-green-400">
              <MathText text={question.choices[question.correctAnswer]} />
            </span>
          </div>
        )}
      </div>

      <div className="flex flex-wrap items-center gap-3 text-xs text-muted-foreground">
        <span>זמן: {formatTime(attempt.timeTakenSeconds)}</span>
        {attempt.selfReportedError && (
          <span>סיבה: {ERROR_REASON_LABELS[attempt.selfReportedError]}</span>
        )}
      </div>

      {!attempt.isCorrect && (
        <div className="border-t border-border pt-3">
          <button
            type="button"
            onClick={() => setExpanded((v) => !v)}
            className="flex items-center gap-1.5 text-sm font-medium text-primary hover:underline"
          >
            <ChevronDown className={cn("size-4 transition-transform", expanded && "rotate-180")} />
            {expanded ? "הסתר הסבר" : "הצג הסבר"}
          </button>

          {expanded && (
            <div className="mt-3 flex flex-col gap-3">
              <div className="rounded-lg bg-muted/50 p-3 text-sm text-card-foreground">
                <MathText text={question.explanation} />
              </div>

              <Button
                variant="outline"
                size="sm"
                className="gap-1.5 self-start"
                onClick={explainDifferently}
                disabled={loading}
              >
                <Sparkles className="size-4" />
                הסבר בדרך אחרת מ-AI
              </Button>

              {loading && (
                <div className="flex items-center gap-2 text-sm text-muted-foreground">
                  <Loader2 className="size-4 animate-spin" />
                  חושב...
                </div>
              )}

              {reply && !loading && (
                <div className="rounded-lg bg-muted/50 p-3 text-sm text-card-foreground">
                  <MathText text={reply} />
                </div>
              )}
            </div>
          )}
        </div>
      )}
    </div>
  );
}
