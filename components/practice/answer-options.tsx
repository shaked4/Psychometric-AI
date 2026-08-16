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
 * off the next question in the same batch.
 *
 * Selection is never locked: every option stays clickable after a first
 * pick, so the student can freely change their answer, and clicking the
 * already-selected option again deselects it — same freely-reselectable
 * behavior as exam mode's components/exam/exam-answer-options.tsx.
 * Nothing is recorded until the student advances/submits
 * (components/practice/practice-session.tsx's recordCurrentAnswer), so
 * there's nothing to "undo" here, just a UI choice to stop hiding options
 * behind a one-shot click. */
export function AnswerOptions({ choices, selected, section, onSelect }: AnswerOptionsProps) {
  const dir = section === "verbal" ? undefined : "ltr";

  return (
    <div className="flex flex-col gap-3">
      {choices.map((choice, index) => {
        const isSelected = index === selected;

        return (
          <button
            key={index}
            type="button"
            onClick={() => onSelect(index)}
            className={cn(
              "flex cursor-pointer items-center justify-between gap-3 rounded-xl border px-5 py-4 text-start transition",
              isSelected ? "border-primary bg-primary/10" : "border-border hover:border-primary/50 hover:bg-muted/60"
            )}
          >
            <span className="flex items-center gap-3">
              <span
                className={cn(
                  "flex size-7 shrink-0 items-center justify-center rounded-full border text-sm font-medium",
                  isSelected ? "border-primary text-primary" : "border-border text-muted-foreground"
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
