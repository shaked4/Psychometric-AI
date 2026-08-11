"use client";

import { CheckCircle2, XCircle } from "lucide-react";
import { cn } from "@/lib/utils";
import { MathText } from "@/components/practice/math-text";
import type { Section } from "@/types";

const LETTERS = ["א", "ב", "ג", "ד"];

interface AnswerOptionsProps {
  choices: string[];
  correctAnswer: number;
  selected: number | null;
  section: Section;
  onSelect: (index: number) => void;
}

export function AnswerOptions({
  choices,
  correctAnswer,
  selected,
  section,
  onSelect,
}: AnswerOptionsProps) {
  const answered = selected !== null;
  const dir = section === "verbal" ? undefined : "ltr";

  return (
    <div className="flex flex-col gap-3">
      {choices.map((choice, index) => {
        const isCorrect = index === correctAnswer;
        const isSelected = index === selected;

        return (
          <button
            key={index}
            type="button"
            disabled={answered}
            onClick={() => onSelect(index)}
            className={cn(
              "flex items-center justify-between gap-3 rounded-xl border px-5 py-4 text-start transition",
              !answered &&
                "cursor-pointer border-border hover:border-primary/50 hover:bg-muted/60",
              answered &&
                isCorrect &&
                "border-green-600/40 bg-green-500/10",
              answered &&
                isSelected &&
                !isCorrect &&
                "border-red-600/40 bg-red-500/10",
              answered &&
                !isSelected &&
                !isCorrect &&
                "border-border opacity-50"
            )}
          >
            <span className="flex items-center gap-3">
              <span className="flex size-7 shrink-0 items-center justify-center rounded-full border border-border text-sm font-medium text-muted-foreground">
                {LETTERS[index]}
              </span>
              <span dir={dir} className="text-base">
                <MathText text={choice} />
              </span>
            </span>

            {answered && isCorrect && (
              <CheckCircle2 className="size-5 shrink-0 text-green-600" />
            )}
            {answered && isSelected && !isCorrect && (
              <XCircle className="size-5 shrink-0 text-red-600" />
            )}
          </button>
        );
      })}
    </div>
  );
}
