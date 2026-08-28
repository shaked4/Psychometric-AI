"use client";

import { useState } from "react";
import { CheckCircle2, ChevronDown, Clock, Target, XCircle } from "lucide-react";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { MathText } from "@/components/practice/math-text";
import { FeedbackPanel } from "@/components/practice/feedback-panel";
import { updateAttemptTag } from "@/lib/storage";
import { markAttemptsDirty } from "@/lib/cloud-sync";
import type { Attempt, Question, SelfReportedError } from "@/types";

export interface SessionResultEntry {
  question: Question;
  attempt: Attempt;
}

function formatTime(seconds: number) {
  const m = Math.floor(seconds / 60);
  const s = seconds % 60;
  return m > 0 ? `${m} דק' ${s} שנ'` : `${s} שניות`;
}

function ResultRow({ entry, index }: { entry: SessionResultEntry; index: number }) {
  const { question, attempt } = entry;
  const [expanded, setExpanded] = useState(false);
  // Local mirror of the tag so FeedbackPanel's picker updates immediately —
  // the persisted write goes through updateAttemptTag(), the same
  // retroactive-tagging path the deep post-mortem review uses.
  const [tag, setTag] = useState<SelfReportedError | null>(attempt.selfReportedError);
  const dir = question.section === "english" ? "ltr" : undefined;

  function handleTag(nextTag: SelfReportedError) {
    setTag(nextTag);
    updateAttemptTag(attempt.id, nextTag);
    markAttemptsDirty([attempt.id]);
  }

  return (
    <div
      className={cn(
        "flex flex-col gap-3 rounded-xl border border-border/60 bg-card p-6",
        !attempt.isCorrect && "border-red-600/20"
      )}
    >
      <button
        type="button"
        onClick={() => setExpanded((v) => !v)}
        className="flex w-full items-center justify-between gap-3 text-start"
      >
        <div className="flex min-w-0 items-center gap-3">
          <span className="flex size-7 shrink-0 items-center justify-center rounded-full bg-muted text-sm font-medium text-muted-foreground">
            {index + 1}
          </span>
          <span dir={dir} className="line-clamp-1 text-sm text-card-foreground">
            <MathText text={question.body} />
          </span>
        </div>
        <div className="flex shrink-0 items-center gap-2">
          <span className="flex items-center gap-1 text-xs text-muted-foreground">
            <Clock className="size-3.5" />
            {formatTime(attempt.timeTakenSeconds)}
          </span>
          {attempt.isCorrect ? (
            <CheckCircle2 className="size-5 text-green-600" />
          ) : (
            <XCircle className="size-5 text-red-600" />
          )}
          <ChevronDown className={cn("size-4 text-muted-foreground transition-transform", expanded && "rotate-180")} />
        </div>
      </button>

      {expanded && (
        <div className="flex flex-col gap-4 border-t border-border pt-4">
          <p dir={dir} className="text-base leading-relaxed text-card-foreground">
            <MathText text={question.body} />
          </p>

          <div className="flex flex-col gap-2 text-sm">
            <div
              dir={dir}
              className={cn(
                "flex items-start gap-1.5 rounded-lg px-3 py-2.5",
                attempt.isCorrect ? "bg-green-500/5" : "bg-red-500/5"
              )}
            >
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
              <div dir={dir} className="flex items-start gap-1.5 rounded-lg bg-green-500/5 px-3 py-2.5">
                <span className="shrink-0 text-muted-foreground">התשובה הנכונה:</span>
                <span className="text-green-700 dark:text-green-400">
                  <MathText text={question.choices[question.correctAnswer]} />
                </span>
              </div>
            )}
          </div>

          <FeedbackPanel
            question={question}
            chosenAnswer={attempt.chosenAnswer}
            isCorrect={attempt.isCorrect}
            explanation={question.explanation}
            selfReportedError={tag}
            onSelectErrorReason={handleTag}
          />
        </div>
      )}
    </div>
  );
}

interface SessionResultsProps {
  results: SessionResultEntry[];
  totalElapsedSeconds: number;
  onFinish: () => void;
  finishLabel?: string;
}

/** Shown once every question in a batch/session has been answered —
 * questions are answered "blind" first (practice-session.tsx hides
 * correctness and explanations while questions are in progress), then the
 * full breakdown is reviewed here in one place, including retroactive
 * mistake tagging via the same FeedbackPanel used for inline feedback. */
export function SessionResults({ results, totalElapsedSeconds, onFinish, finishLabel = "סיום" }: SessionResultsProps) {
  const total = results.length;
  const correctCount = results.filter((r) => r.attempt.isCorrect).length;
  const accuracyPct = total > 0 ? Math.round((correctCount / total) * 100) : 0;
  const avgSeconds =
    total > 0 ? Math.round(results.reduce((sum, r) => sum + r.attempt.timeTakenSeconds, 0) / total) : 0;

  return (
    <div className="flex flex-col gap-6">
      <div className="flex flex-col gap-4 rounded-xl border border-primary/30 bg-primary/5 p-6 shadow-sm">
        <div className="flex items-center gap-2 text-lg font-bold">
          <Target className="size-5 text-primary" />
          סיכום תרגול
        </div>
        <div className="grid grid-cols-4 gap-4 text-center">
          <div className="flex flex-col gap-1">
            <span className="text-2xl font-bold tabular-nums">
              {correctCount}/{total}
            </span>
            <span className="text-xs text-muted-foreground">תשובות נכונות</span>
          </div>
          <div className="flex flex-col gap-1">
            <span className="text-2xl font-bold tabular-nums">{accuracyPct}%</span>
            <span className="text-xs text-muted-foreground">דיוק</span>
          </div>
          <div className="flex flex-col gap-1">
            <span dir="ltr" className="text-2xl font-bold tabular-nums">
              {formatTime(avgSeconds)}
            </span>
            <span className="text-xs text-muted-foreground">זמן ממוצע לשאלה</span>
          </div>
          <div className="flex flex-col gap-1">
            <span dir="ltr" className="text-2xl font-bold tabular-nums">
              {formatTime(totalElapsedSeconds)}
            </span>
            <span className="text-xs text-muted-foreground">זמן כולל</span>
          </div>
        </div>
      </div>

      <div className="flex flex-col gap-3">
        {results.map((entry, i) => (
          <ResultRow key={entry.attempt.id} entry={entry} index={i} />
        ))}
      </div>

      <Button size="lg" onClick={onFinish} className="self-end">
        {finishLabel}
      </Button>
    </div>
  );
}
