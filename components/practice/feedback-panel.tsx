"use client";

import { BookOpen, CheckCircle2, Loader2, Sparkles, Target, XCircle } from "lucide-react";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { MathText } from "@/components/practice/math-text";
import { ErrorTagPicker } from "@/components/post-mortem/error-tag-picker";
import { SimilarQuestionDrill } from "@/components/practice/similar-question-drill";
import { useTutorExplain } from "@/lib/use-tutor-explain";
import type { Question, SelfReportedError } from "@/types";

interface FeedbackPanelProps {
  question: Question;
  chosenAnswer: number;
  isCorrect: boolean;
  explanation: string;
  selfReportedError: SelfReportedError | null;
  onSelectErrorReason: (reason: SelfReportedError) => void;
}

export function FeedbackPanel({
  question,
  chosenAnswer,
  isCorrect,
  explanation,
  selfReportedError,
  onSelectErrorReason,
}: FeedbackPanelProps) {
  const { reply: aiReply, loading, mode, explainDifferently, analyzeTrap } = useTutorExplain(
    question,
    chosenAnswer,
    selfReportedError
  );

  return (
    <div
      className={cn(
        "flex flex-col gap-5 rounded-xl border p-6",
        isCorrect
          ? "border-green-600/25 bg-green-500/5"
          : "border-red-600/25 bg-red-500/5"
      )}
    >
      <div className="flex items-center gap-2 text-lg font-semibold">
        {isCorrect ? (
          <CheckCircle2 className="size-5 text-green-600" />
        ) : (
          <XCircle className="size-5 text-red-600" />
        )}
        <span
          className={
            isCorrect
              ? "text-green-700 dark:text-green-400"
              : "text-red-700 dark:text-red-400"
          }
        >
          {isCorrect ? "תשובה נכונה!" : "תשובה שגויה"}
        </span>
      </div>

      {/* The explanation is the whole point of the review screen — it gets
       * its own clearly-labeled, generously-spaced card rather than sitting
       * as an undifferentiated paragraph, so working through it reads like
       * a worked solution, not a caption. */}
      <div className="flex flex-col gap-2.5 rounded-lg bg-background/60 p-5">
        <div className="flex items-center gap-1.5 text-xs font-semibold uppercase tracking-wide text-muted-foreground">
          <BookOpen className="size-3.5" />
          הסבר מלא
        </div>
        <div className="text-base leading-loose text-card-foreground">
          <MathText text={explanation} />
        </div>
      </div>

      {!isCorrect && (
        <div className="flex flex-col gap-2 border-t border-border pt-5">
          <p className="text-sm font-medium text-muted-foreground">
            מה גרם לטעות, לדעתך?
          </p>
          <ErrorTagPicker value={selfReportedError} onSelect={onSelectErrorReason} />
        </div>
      )}

      <div className="border-t border-border pt-5">
        <div className="flex flex-wrap gap-2">
          <Button
            variant="outline"
            size="sm"
            className="gap-1.5"
            onClick={explainDifferently}
            disabled={loading}
          >
            <Sparkles className="size-4" />
            הסבר בדרך אחרת
          </Button>

          {!isCorrect && (
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
          <div className="mt-3 flex items-center gap-2 text-sm text-muted-foreground">
            <Loader2 className="size-4 animate-spin" />
            {mode === "trap" ? "מנתח את המלכודת בשאלה..." : "חושב על דרך הסברה טובה יותר..."}
          </div>
        )}

        {aiReply && !loading && (
          <div className="mt-3 rounded-lg bg-muted/50 p-3 text-sm text-card-foreground">
            <MathText text={aiReply} />
          </div>
        )}
      </div>

      {!isCorrect && (
        <div className="flex flex-col gap-2 border-t border-border pt-5">
          <p className="text-sm font-medium text-muted-foreground">רוצים לבדוק שהבנתם? נסו שאלה דומה:</p>
          <SimilarQuestionDrill question={question} />
        </div>
      )}
    </div>
  );
}
