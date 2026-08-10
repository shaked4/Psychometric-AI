"use client";

import { cn } from "@/lib/utils";
import { MathText } from "@/components/practice/math-text";
import type { Section } from "@/types";

const LETTERS = ["א", "ב", "ג", "ד"];

interface ExamAnswerOptionsProps {
  choices: string[];
  selected: number | null;
  section: Section;
  onSelect: (index: number) => void;
}

/** Unlike the practice-mode AnswerOptions, this never reveals correctness
 * and never disables — exam takers can freely change their answer. */
export function ExamAnswerOptions({ choices, selected, section, onSelect }: ExamAnswerOptionsProps) {
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
              "flex items-center gap-3 rounded-xl border px-4 py-3.5 text-start transition cursor-pointer",
              isSelected
                ? "border-primary bg-primary/10"
                : "border-border hover:border-primary/50 hover:bg-muted/60"
            )}
          >
            <span className="flex size-7 shrink-0 items-center justify-center rounded-full border border-border text-sm font-medium text-muted-foreground">
              {LETTERS[index]}
            </span>
            <span dir={dir} className="text-base">
              <MathText text={choice} />
            </span>
          </button>
        );
      })}
    </div>
  );
}
