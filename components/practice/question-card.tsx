import { ImageIcon } from "lucide-react";
import { MathText } from "@/components/practice/math-text";
import { DataInterpretationTable } from "@/components/practice/data-interpretation-table";
import type { Question } from "@/types";

interface QuestionCardProps {
  question: Question;
}

export function QuestionCard({ question }: QuestionCardProps) {
  const dir = question.section === "english" ? "ltr" : undefined;

  return (
    <div className="flex flex-col gap-5 rounded-xl border border-border bg-card p-7 shadow-sm">
      <div className="flex items-center gap-2 text-xs font-medium text-muted-foreground">
        <span className="rounded-full bg-muted px-2.5 py-1">{question.topic}</span>
        <span className="rounded-full bg-muted px-2.5 py-1">{question.subtopic}</span>
      </div>

      {question.passage && (
        <div
          dir={dir}
          className="rounded-lg bg-muted/60 p-4 text-base leading-relaxed text-muted-foreground"
        >
          <MathText text={question.passage} />
        </div>
      )}

      {question.diagram ? (
        <DataInterpretationTable diagram={question.diagram} />
      ) : (
        question.media && (
          <div className="flex h-40 items-center justify-center rounded-lg border border-dashed border-border bg-muted/40">
            <div className="flex flex-col items-center gap-2 text-sm text-muted-foreground">
              <ImageIcon className="size-6" />
              <span>תרשים / דיאגרמה</span>
            </div>
          </div>
        )
      )}

      <p dir={dir} className="text-lg leading-loose text-card-foreground">
        <MathText text={question.body} />
      </p>
    </div>
  );
}
