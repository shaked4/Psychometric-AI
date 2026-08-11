"use client";

import { CheckCircle2, Loader2, Sparkles, XCircle } from "lucide-react";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { MathText } from "@/components/practice/math-text";
import { ErrorTagPicker } from "@/components/post-mortem/error-tag-picker";
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
  const { reply: aiReply, loading, explainDifferently } = useTutorExplain(
    question,
    chosenAnswer,
    selfReportedError
  );

  return (
    <div
      className={cn(
        "flex flex-col gap-4 rounded-xl border p-5",
        isCorrect
          ? "border-green-600/30 bg-green-500/5"
          : "border-red-600/30 bg-red-500/5"
      )}
    >
      <div className="flex items-center gap-2 text-base font-semibold">
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

      <div className="text-sm leading-relaxed text-card-foreground">
        <MathText text={explanation} />
      </div>

      {!isCorrect && (
        <div className="flex flex-col gap-2 border-t border-border pt-4">
          <p className="text-sm font-medium text-muted-foreground">
            מה גרם לטעות, לדעתך?
          </p>
          <ErrorTagPicker value={selfReportedError} onSelect={onSelectErrorReason} />
        </div>
      )}

      <div className="border-t border-border pt-4">
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

        {loading && (
          <div className="mt-3 flex items-center gap-2 text-sm text-muted-foreground">
            <Loader2 className="size-4 animate-spin" />
            חושב על דרך הסברה טובה יותר...
          </div>
        )}

        {aiReply && !loading && (
          <div className="mt-3 rounded-lg bg-muted/50 p-3 text-sm text-card-foreground">
            <MathText text={aiReply} />
          </div>
        )}
      </div>
    </div>
  );
}
