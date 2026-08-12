"use client";

import { useState } from "react";
import { CheckCircle2, ChevronDown, Clock, Loader2, Sparkles, Target, XCircle } from "lucide-react";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { MathText } from "@/components/practice/math-text";
import { ErrorTagPicker } from "@/components/post-mortem/error-tag-picker";
import { SimilarQuestionDrill } from "@/components/practice/similar-question-drill";
import { useTutorExplain } from "@/lib/use-tutor-explain";
import { SECTION_LABELS } from "@/lib/stats";
import { updateAttemptTag } from "@/lib/storage";
import { markAttemptsDirty } from "@/lib/cloud-sync";
import type { QualifyingAttempt } from "@/lib/post-mortem";
import type { SelfReportedError } from "@/types";

function formatTime(seconds: number) {
  const m = Math.floor(seconds / 60);
  const s = seconds % 60;
  return m > 0 ? `${m} דק' ${s} שנ'` : `${s} שניות`;
}

function MistakeReviewCard({ attempt, question, isSlow }: QualifyingAttempt) {
  const [expanded, setExpanded] = useState(false);
  const { reply, loading, mode, explainDifferently, analyzeTrap } = useTutorExplain(
    question,
    attempt.chosenAnswer,
    attempt.selfReportedError
  );
  const dir = question.section === "english" ? "ltr" : undefined;

  function handleTag(tag: SelfReportedError) {
    updateAttemptTag(attempt.id, tag);
    markAttemptsDirty([attempt.id]);
  }

  return (
    <div
      className={cn(
        "flex flex-col gap-3 rounded-xl border bg-card p-5 shadow-sm",
        !attempt.isCorrect ? "border-red-600/20" : "border-amber-500/20"
      )}
    >
      <div className="flex flex-wrap items-center justify-between gap-2">
        <div className="flex flex-wrap items-center gap-2 text-xs font-medium text-muted-foreground">
          <span className="rounded-full bg-muted px-2.5 py-1">{SECTION_LABELS[question.section]}</span>
          <span className="rounded-full bg-muted px-2.5 py-1">{question.topic}</span>
        </div>
        <div className="flex items-center gap-2 text-sm font-medium">
          {!attempt.isCorrect ? (
            <span className="flex items-center gap-1.5 text-red-700 dark:text-red-400">
              <XCircle className="size-4" />
              שגוי
            </span>
          ) : (
            <span className="flex items-center gap-1.5 text-green-700 dark:text-green-400">
              <CheckCircle2 className="size-4" />
              נכון
            </span>
          )}
          {isSlow && (
            <span className="flex items-center gap-1 rounded-full bg-amber-500/10 px-2 py-0.5 text-xs text-amber-700 dark:text-amber-400">
              <Clock className="size-3" />
              {formatTime(attempt.timeTakenSeconds)}
            </span>
          )}
        </div>
      </div>

      <p dir={dir} className="text-base text-card-foreground">
        <MathText text={question.body} />
      </p>

      {!attempt.isCorrect && (
        <div className="flex flex-col gap-1.5 text-sm">
          <div dir={dir} className="flex items-start gap-1.5">
            <span className="shrink-0 text-muted-foreground">התשובה שלך:</span>
            <span className="text-red-700 dark:text-red-400">
              <MathText text={question.choices[attempt.chosenAnswer]} />
            </span>
          </div>
          <div dir={dir} className="flex items-start gap-1.5">
            <span className="shrink-0 text-muted-foreground">התשובה הנכונה:</span>
            <span className="text-green-700 dark:text-green-400">
              <MathText text={question.choices[question.correctAnswer]} />
            </span>
          </div>
        </div>
      )}

      {!attempt.isCorrect && (
        <div className="flex flex-col gap-2 border-t border-border pt-3">
          <p className="text-sm font-medium text-muted-foreground">מה גרם לטעות, לדעתך?</p>
          <ErrorTagPicker value={attempt.selfReportedError} onSelect={handleTag} size="sm" />
        </div>
      )}

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

            <div className="flex flex-wrap gap-2">
              <Button
                variant="outline"
                size="sm"
                className="gap-1.5"
                onClick={explainDifferently}
                disabled={loading}
              >
                <Sparkles className="size-4" />
                הסבר בדרך אחרת מ-AI
              </Button>

              {!attempt.isCorrect && (
                <Button
                  variant="outline"
                  size="sm"
                  className="gap-1.5"
                  onClick={analyzeTrap}
                  disabled={loading}
                >
                  <Target className="size-4" />
                  זיהוי המלכודת
                </Button>
              )}
            </div>

            {loading && (
              <div className="flex items-center gap-2 text-sm text-muted-foreground">
                <Loader2 className="size-4 animate-spin" />
                {mode === "trap" ? "מנתח את המלכודת בשאלה..." : "חושב..."}
              </div>
            )}

            {reply && !loading && (
              <div className="rounded-lg bg-muted/50 p-3 text-sm text-card-foreground">
                <MathText text={reply} />
              </div>
            )}

            {!attempt.isCorrect && (
              <div className="flex flex-col gap-2 border-t border-border pt-3">
                <p className="text-sm font-medium text-muted-foreground">רוצים לבדוק שהבנתם? נסו שאלה דומה:</p>
                <SimilarQuestionDrill question={question} />
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
}

export function MistakeReviewList({ items }: { items: QualifyingAttempt[] }) {
  if (items.length === 0) {
    return (
      <div className="rounded-xl border border-dashed border-border p-10 text-center text-muted-foreground">
        אין עדיין שאלות לתחקור — כשתטעו בשאלה, או תתעכבו עליה, היא תופיע כאן.
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-4">
      {items.map(({ attempt, question, isSlow }) => (
        <MistakeReviewCard key={attempt.id} attempt={attempt} question={question} isSlow={isSlow} />
      ))}
    </div>
  );
}
