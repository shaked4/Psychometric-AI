"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import Link from "next/link";
import { MOCK_QUESTIONS } from "@/lib/mock-data";
import { recordAttempt } from "@/lib/storage";
import { PracticeHeader } from "@/components/practice/practice-header";
import { QuestionCard } from "@/components/practice/question-card";
import { AnswerOptions } from "@/components/practice/answer-options";
import { FeedbackPanel } from "@/components/practice/feedback-panel";
import { TutorChatDrawer } from "@/components/practice/tutor-chat-drawer";
import { Button } from "@/components/ui/button";
import { buttonVariants } from "@/components/ui/button";
import type { Section, SelfReportedError } from "@/types";

const SECTION_LABELS: Record<Section, string> = {
  quant: "כמותי",
  verbal: "מילולי",
  english: "אנגלית",
};

const VALID_SECTIONS: Section[] = ["quant", "verbal", "english"];

function isValidSection(value: string): value is Section {
  return (VALID_SECTIONS as string[]).includes(value);
}

export default function PracticeSessionPage() {
  const params = useParams<{ section: string }>();
  const router = useRouter();
  const sectionParam = params.section;

  const questions = useMemo(
    () =>
      isValidSection(sectionParam)
        ? MOCK_QUESTIONS.filter((q) => q.section === sectionParam)
        : [],
    [sectionParam]
  );

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

  if (!isValidSection(sectionParam) || questions.length === 0) {
    return (
      <div className="flex min-h-screen flex-col items-center justify-center gap-4 px-6 text-center">
        <p className="text-lg font-medium">התרגול המבוקש לא נמצא</p>
        <Link href="/" className={buttonVariants({ variant: "default" })}>
          חזרה לדף הבית
        </Link>
      </div>
    );
  }

  const section = sectionParam;
  const currentQuestion = questions[currentIndex];
  const isLastQuestion = currentIndex === questions.length - 1;
  const answered = selected !== null;
  const isCorrect = answered && selected === currentQuestion.correctAnswer;
  // Selecting a self-reported error reason is encouraged (see FeedbackPanel)
  // but never required to advance — it must not be able to strand the
  // student on a question they've already answered.
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
      router.push("/dashboard");
      return;
    }
    setCurrentIndex((i) => i + 1);
    setSelected(null);
    setErrorReason(null);
  }

  return (
    <div className="flex min-h-screen flex-col">
      <PracticeHeader
        sectionLabel={SECTION_LABELS[section]}
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
          section={section}
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
