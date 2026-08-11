"use client";

import { cn } from "@/lib/utils";
import { MathText } from "@/components/practice/math-text";
import type { Section } from "@/types";

const LETTERS = ["א", "ב", "ג", "ד"];

interface AnswerOptionsProps {
  choices: string[];
  selected: number | null;
  section: Section;
  onSelect: (index: number) => void;
}

/** Only ever shows which option the student picked — never whether it was
 * right, and never the correct answer. Correctness and the explanation are
 * deliberately withheld until the end-of-session results screen (see
 * components/practice/session-results.tsx), so a wrong guess doesn't tip
 * off the next question in the same batch. */
export function AnswerOptions({ choices, selected, section, onSelect }: AnswerOptionsProps) {
  const answered = selected !== null;
  const dir = section === "verbal" ? undefined : "ltr";

  return (
    <div className="flex flex-col gap-3">
      {choices.map((choice, index) => {
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
              answered && isSelected && "border-primary bg-primary/10",
              answered && !isSelected && "border-border opacity-50"
            )}
          >
            <span className="flex items-center gap-3">
              <span
                className={cn(
                  "flex size-7 shrink-0 items-center justify-center rounded-full border text-sm font-medium",
                  answered && isSelected
                    ? "border-primary text-primary"
                    : "border-border text-muted-foreground"
                )}
              >
                {LETTERS[index]}
              </span>
              <span dir={dir} className="text-base">
                <MathText text={choice} />
              </span>
            </span>
          </button>
        );
      })}
    </div>
  );
}
