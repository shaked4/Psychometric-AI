"use client";

import { useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { recordAttempt } from "@/lib/storage";
import { PracticeHeader } from "@/components/practice/practice-header";
import { QuestionCard } from "@/components/practice/question-card";
import { AnswerOptions } from "@/components/practice/answer-options";
import { FeedbackPanel } from "@/components/practice/feedback-panel";
import { TutorChatDrawer } from "@/components/practice/tutor-chat-drawer";
import { Button } from "@/components/ui/button";
import type { Question, SelfReportedError } from "@/types";

interface PracticeSessionProps {
  questions: Question[];
  sectionLabel: string;
  /** Where "סיום התרגול" navigates to. Ignored if onFinish is provided. */
  finishHref?: string;
  /** Alternative to navigating away on finish — e.g. return to a config form. */
  onFinish?: () => void;
}

/** The shared practice engine: progress header, one question at a time,
 * feedback + tutor chat, recording each attempt. Used by both the fixed
 * per-section practice route and the AI-generated custom practice route so
 * this session-cycling logic exists in exactly one place. */
export function PracticeSession({
  questions,
  sectionLabel,
  finishHref = "/dashboard",
  onFinish,
}: PracticeSessionProps) {
  const router = useRouter();
  const [sessionId] = useState(() => crypto.randomUUID());
  const [currentIndex, setCurrentIndex] = useState(0);
  const [selected, setSelected] = useState<number | null>(null);
  const [errorReason, setErrorReason] = useState<SelfReportedError | null>(null);
  const [elapsedSeconds, setElapsedSeconds] = useState(0);

  // Wall-clock based, independent of the display timer above, so it stays
  // accurate regardless of render timing. Starts at 0 (not Date.now(), which
  // would be an impure call during render) — the effect below sets the real
  // value immediately after mount, before any click is physically possible.
  const questionStartTimeRef = useRef(0);
  const answerTimeTakenRef = useRef(0);

  useEffect(() => {
    const interval = setInterval(() => setElapsedSeconds((s) => s + 1), 1000);
    return () => clearInterval(interval);
  }, []);

  useEffect(() => {
    questionStartTimeRef.current = Date.now();
  }, [currentIndex]);

  const currentQuestion = questions[currentIndex];
  const isLastQuestion = currentIndex === questions.length - 1;
  const answered = selected !== null;
  const isCorrect = answered && selected === currentQuestion.correctAnswer;
  // Selecting a self-reported error reason is encouraged (see FeedbackPanel)
  // but never required to advance.
  const canProceed = answered;

  function handleSelect(index: number) {
    answerTimeTakenRef.current = Math.max(
      1,
      Math.round((Date.now() - questionStartTimeRef.current) / 1000)
    );
    setSelected(index);
  }

  function handleNext() {
    if (selected === null) return;

    recordAttempt({
      sessionId,
      questionId: currentQuestion.id,
      chosenAnswer: selected,
      isCorrect,
      timeTakenSeconds: answerTimeTakenRef.current,
      selfReportedError: errorReason,
    });

    if (isLastQuestion) {
      if (onFinish) {
        onFinish();
      } else {
        router.push(finishHref);
      }
      return;
    }
    setCurrentIndex((i) => i + 1);
    setSelected(null);
    setErrorReason(null);
  }

  return (
    <div className="flex min-h-screen flex-col">
      <PracticeHeader
        sectionLabel={sectionLabel}
        currentIndex={currentIndex}
        total={questions.length}
        elapsedSeconds={elapsedSeconds}
      />

      <main className="mx-auto flex w-full max-w-2xl flex-1 flex-col gap-6 px-6 py-8">
        <QuestionCard question={currentQuestion} />

        <AnswerOptions
          choices={currentQuestion.choices}
          correctAnswer={currentQuestion.correctAnswer}
          selected={selected}
          section={currentQuestion.section}
          onSelect={handleSelect}
        />

        {selected !== null && (
          <FeedbackPanel
            question={currentQuestion}
            chosenAnswer={selected}
            isCorrect={isCorrect}
            explanation={currentQuestion.explanation}
            selfReportedError={errorReason}
            onSelectErrorReason={setErrorReason}
          />
        )}

        {answered && (
          <Button
            size="lg"
            disabled={!canProceed}
            onClick={handleNext}
            className="self-end"
          >
            {isLastQuestion ? "סיום התרגול" : "השאלה הבאה"}
          </Button>
        )}
      </main>

      <TutorChatDrawer
        key={currentQuestion.id}
        question={currentQuestion}
        chosenAnswer={selected}
        selfReportedError={errorReason}
      />
    </div>
  );
}
