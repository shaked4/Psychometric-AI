"use client";

import { useState } from "react";
import { CheckCircle2, Loader2, RefreshCw, XCircle } from "lucide-react";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { MathText } from "@/components/practice/math-text";
import { recordAttempt } from "@/lib/storage";
import { cacheQuestions } from "@/lib/question-cache";
import type { Question } from "@/types";

const LETTERS = ["א", "ב", "ג", "ד"];

function difficultyFromNumeric(n: number): "easy" | "medium" | "hard" {
  if (n <= 2) return "easy";
  if (n >= 4) return "hard";
  return "medium";
}

type DrillState =
  | { kind: "idle" }
  | { kind: "loading" }
  | { kind: "error" }
  | { kind: "ready"; question: Question; selected: number | null; startedAt: number };

/**
 * A deliberate exception to this app's usual blind-answer-then-review flow
 * (components/practice/practice-session.tsx): this is a one-off "test
 * yourself right now" drill triggered from a mistake review, not a graded
 * session, so instant correct/incorrect feedback is the whole point rather
 * than something to withhold. Still records through the same recordAttempt()
 * write path as everything else, so it feeds topic stats and the
 * spaced-repetition queue exactly like a normal attempt.
 */
export function SimilarQuestionDrill({ question }: { question: Question }) {
  const [state, setState] = useState<DrillState>({ kind: "idle" });
  const [sessionId] = useState(() => crypto.randomUUID());

  async function start() {
    setState({ kind: "loading" });
    try {
      const res = await fetch("/api/generate-question", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          section: question.section,
          topic: question.topic,
          subtopic: question.subtopic,
          difficulty: difficultyFromNumeric(question.difficulty),
          excludeQuestionTexts: [question.body],
        }),
      });
      const data = await res.json();
      if (!data.question) {
        setState({ kind: "error" });
        return;
      }
      cacheQuestions([data.question]);
      setState({ kind: "ready", question: data.question, selected: null, startedAt: Date.now() });
    } catch {
      setState({ kind: "error" });
    }
  }

  // Reads the choice index off the DOM event (data-index) rather than
  // closing over it via an inline `onClick={() => selectAnswer(index)}`
  // wrapper, so this can be assigned directly as the button's onClick —
  // matching how components/practice/practice-session.tsx's handleSelect is
  // passed straight through to AnswerOptions' onSelect prop, which is what
  // lets the react-hooks/purity lint rule recognize this as a genuine event
  // handler (and its Date.now() call as safe) rather than something
  // reachable during render.
  function selectAnswer(event: React.MouseEvent<HTMLButtonElement>) {
    if (state.kind !== "ready" || state.selected !== null) return;
    const index = Number(event.currentTarget.dataset.index);
    const timeTakenSeconds = Math.max(1, Math.round((Date.now() - state.startedAt) / 1000));
    recordAttempt({
      sessionId,
      questionId: state.question.id,
      chosenAnswer: index,
      isCorrect: index === state.question.correctAnswer,
      timeTakenSeconds,
      selfReportedError: null,
    });
    setState({ ...state, selected: index });
  }

  if (state.kind === "idle") {
    return (
      <Button variant="outline" size="sm" className="gap-1.5" onClick={start}>
        <RefreshCw className="size-4" />
        נסו שאלה דומה
      </Button>
    );
  }

  if (state.kind === "loading") {
    return (
      <div className="flex items-center gap-2 text-sm text-muted-foreground">
        <Loader2 className="size-4 animate-spin" />
        מכינים שאלה דומה...
      </div>
    );
  }

  if (state.kind === "error") {
    return (
      <div className="flex flex-col items-start gap-2">
        <p className="text-sm text-red-600 dark:text-red-400">לא הצלחנו ליצור שאלה דומה כרגע.</p>
        <Button variant="outline" size="sm" className="gap-1.5" onClick={start}>
          <RefreshCw className="size-4" />
          נסו שוב
        </Button>
      </div>
    );
  }

  const { question: q, selected } = state;
  const dir = q.section === "english" ? "ltr" : undefined;
  const answered = selected !== null;

  return (
    <div className="flex flex-col gap-3 rounded-lg border border-primary/30 bg-primary/5 p-4">
      <p dir={dir} className="text-sm font-medium text-card-foreground">
        <MathText text={q.body} />
      </p>

      <div className="flex flex-col gap-2">
        {q.choices.map((choice, index) => {
          const isSelected = index === selected;
          const isCorrectChoice = index === q.correctAnswer;
          return (
            <button
              key={index}
              type="button"
              data-index={index}
              disabled={answered}
              onClick={selectAnswer}
              className={cn(
                "flex items-center gap-2.5 rounded-lg border px-3.5 py-2.5 text-start text-sm transition",
                !answered && "cursor-pointer border-border hover:border-primary/50 hover:bg-muted/60",
                answered && isCorrectChoice && "border-green-600/40 bg-green-500/10",
                answered && isSelected && !isCorrectChoice && "border-red-600/40 bg-red-500/10",
                answered && !isSelected && !isCorrectChoice && "border-border opacity-60"
              )}
            >
              <span className="flex size-6 shrink-0 items-center justify-center rounded-full border border-border text-xs font-medium text-muted-foreground">
                {LETTERS[index]}
              </span>
              <span dir={dir} className="flex-1">
                <MathText text={choice} />
              </span>
              {answered && isCorrectChoice && <CheckCircle2 className="size-4 shrink-0 text-green-600" />}
              {answered && isSelected && !isCorrectChoice && <XCircle className="size-4 shrink-0 text-red-600" />}
            </button>
          );
        })}
      </div>

      {answered && (
        <>
          <div className="rounded-lg bg-muted/50 p-3 text-sm text-card-foreground">
            <MathText text={q.explanation} />
          </div>
          <Button variant="outline" size="sm" className="gap-1.5 self-start" onClick={start}>
            <RefreshCw className="size-4" />
            עוד שאלה דומה
          </Button>
        </>
      )}
    </div>
  );
}
