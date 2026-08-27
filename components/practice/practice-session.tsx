"use client";

import { useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { cn } from "@/lib/utils";
import { recordAttempt, updateAttemptAnswer } from "@/lib/storage";
import { markAttemptsDirty } from "@/lib/cloud-sync";
import { PracticeHeader } from "@/components/practice/practice-header";
import { QuestionCard } from "@/components/practice/question-card";
import { AnswerOptions } from "@/components/practice/answer-options";
import { TutorChatDrawer } from "@/components/practice/tutor-chat-drawer";
import { Breadcrumbs, type BreadcrumbItem } from "@/components/practice/breadcrumbs";
import { SessionResults, type SessionResultEntry } from "@/components/practice/session-results";
import { SubmitConfirmModal } from "@/components/practice/submit-confirm-modal";
import { Button } from "@/components/ui/button";
import type { Question } from "@/types";

interface PracticeSessionProps {
  questions: Question[];
  sectionLabel: string;
  /** Where finishing the results screen navigates to. Ignored if onFinish is provided. */
  finishHref?: string;
  /** Alternative to navigating away on finish — e.g. return to a config form. */
  onFinish?: () => void;
  /** "בית / חשיבה כמותית / תרגול נושאי"-style trail shown above the
   * question. Only /practice/[section] passes this today — the other
   * consumers (AI stream, spaced-repetition review) aren't browsing a
   * fixed topic tree, so a trail wouldn't mean anything for them. */
  breadcrumbs?: BreadcrumbItem[];
  /** Optional "תוכן הלימוד" topic-tree panel — widens the layout to make
   * room for it when present. */
  sidebar?: React.ReactNode;
}

/** The shared practice engine: progress header, one question at a time,
 * tutor chat, recording each attempt. Used by both the fixed per-section
 * practice route and the AI-generated custom practice route so this
 * session-cycling logic exists in exactly one place.
 *
 * Correctness and explanations are deliberately withheld while questions
 * are in progress — answers are recorded silently as the student
 * progresses, and only revealed together on a results screen once the
 * whole batch is answered (see components/practice/session-results.tsx).
 *
 * Navigation is not one-way: the student can go back to a previous
 * question and change their answer. Answers and the attempt each one was
 * recorded under are tracked per question index (not just for "the current
 * question"), so revisiting a question updates its existing attempt in
 * place — via updateAttemptAnswer() — instead of recording a second attempt
 * for the same question, which would double-count it in accuracy/mastery
 * stats and the spaced-repetition queue. */
export function PracticeSession({
  questions,
  sectionLabel,
  finishHref = "/dashboard",
  onFinish,
  breadcrumbs,
  sidebar,
}: PracticeSessionProps) {
  const router = useRouter();
  const [sessionId] = useState(() => crypto.randomUUID());
  const [phase, setPhase] = useState<"question" | "summary">("question");
  const [currentIndex, setCurrentIndex] = useState(0);
  // Parallel to `questions`: the selected choice (or null) and the resulting
  // SessionResultEntry (once committed) for each index, so answering out of
  // strict forward order — i.e. going back and changing something — never
  // loses or duplicates a recorded attempt.
  const [answers, setAnswers] = useState<(number | null)[]>(() => questions.map(() => null));
  const [resultsByIndex, setResultsByIndex] = useState<(SessionResultEntry | null)[]>(() =>
    questions.map(() => null)
  );
  const [elapsedSeconds, setElapsedSeconds] = useState(0);
  const [confirmingSubmit, setConfirmingSubmit] = useState(false);
  // Casual practice is untimed by default — the clock still runs
  // internally (results/stats need it), it's just not displayed unless the
  // student opts in. Exam mode uses its own separate, always-visible timer.
  const [showTimer, setShowTimer] = useState(false);

  // Wall-clock based, independent of the display timer above, so it stays
  // accurate regardless of render timing. Starts at 0 (not Date.now(), which
  // would be an impure call during render) — the effect below sets the real
  // value immediately after mount, before any click is physically possible.
  const questionStartTimeRef = useRef(0);
  const answerTimeTakenRef = useRef(0);

  useEffect(() => {
    // Stops ticking once the results screen is up — that time is no longer
    // "answering time" and shouldn't keep inflating the session total.
    if (phase !== "question") return;
    const interval = setInterval(() => setElapsedSeconds((s) => s + 1), 1000);
    return () => clearInterval(interval);
  }, [phase]);

  useEffect(() => {
    questionStartTimeRef.current = Date.now();
  }, [currentIndex]);

  const currentQuestion = questions[currentIndex];
  const isFirstQuestion = currentIndex === 0;
  const isLastQuestion = currentIndex === questions.length - 1;
  const selected = answers[currentIndex];
  const answered = selected !== null;
  const canProceed = answered;

  function handleSelect(index: number) {
    // Clicking the already-selected option again deselects it, rather than
    // being a no-op — the student can back out of an answer entirely, not
    // just switch between choices.
    const nextValue = selected === index ? null : index;
    if (nextValue !== null) {
      answerTimeTakenRef.current = Math.max(
        1,
        Math.round((Date.now() - questionStartTimeRef.current) / 1000)
      );
    }
    setAnswers((prev) => prev.map((a, i) => (i === currentIndex ? nextValue : a)));
  }

  /** Records or updates whatever is currently selected for `index` as an
   * attempt — a fresh recordAttempt() the first time this index is left,
   * updateAttemptAnswer() on every revisit after that. A no-op if nothing
   * is selected, or if the selection hasn't changed since it was last
   * committed, so navigating back and forth without editing anything never
   * writes redundantly. */
  function commitAnswer(index: number): SessionResultEntry | null {
    const answer = answers[index];
    if (answer === null) return null;

    const question = questions[index];
    const isCorrect = answer === question.correctAnswer;
    const existing = resultsByIndex[index];

    if (existing) {
      if (existing.attempt.chosenAnswer === answer) return existing;
      const timeTakenSeconds = answerTimeTakenRef.current;
      updateAttemptAnswer(existing.attempt.id, { chosenAnswer: answer, isCorrect, timeTakenSeconds });
      markAttemptsDirty([existing.attempt.id]);
      const updatedEntry: SessionResultEntry = {
        question,
        attempt: { ...existing.attempt, chosenAnswer: answer, isCorrect, timeTakenSeconds },
      };
      setResultsByIndex((prev) => prev.map((r, i) => (i === index ? updatedEntry : r)));
      return updatedEntry;
    }

    const attempt = recordAttempt({
      sessionId,
      questionId: question.id,
      chosenAnswer: answer,
      isCorrect,
      timeTakenSeconds: answerTimeTakenRef.current,
      // Not asked live anymore — mistakes are tagged from the results
      // screen, where the student can actually see what went wrong.
      selfReportedError: null,
    });
    const entry: SessionResultEntry = { question, attempt };
    setResultsByIndex((prev) => prev.map((r, i) => (i === index ? entry : r)));
    return entry;
  }

  function handlePrev() {
    if (isFirstQuestion) return;
    commitAnswer(currentIndex);
    setCurrentIndex((i) => i - 1);
  }

  function handleNext() {
    commitAnswer(currentIndex);
    if (isLastQuestion) {
      setPhase("summary");
      return;
    }
    setCurrentIndex((i) => i + 1);
  }

  // Every index the student hasn't answered yet — reflects live selection
  // state, not just what's been committed to storage, since forward
  // progress already guarantees every earlier index is answered.
  const unansweredCount = answers.filter((a) => a === null).length;

  function submitNow() {
    commitAnswer(currentIndex);
    setConfirmingSubmit(false);
    setPhase("summary");
  }

  function handleSubmitClick() {
    if (unansweredCount > 0) {
      setConfirmingSubmit(true);
    } else {
      submitNow();
    }
  }

  function handleFinish() {
    if (onFinish) {
      onFinish();
    } else {
      router.push(finishHref);
    }
  }

  const results = resultsByIndex.filter((r): r is SessionResultEntry => r !== null);

  return (
    <div className="flex min-h-screen flex-col">
      <PracticeHeader
        sectionLabel={sectionLabel}
        progressLabel={
          phase === "summary"
            ? "סיכום תרגול"
            : `שאלה ${currentIndex + 1} מתוך ${questions.length}`
        }
        progressPct={phase === "summary" ? 100 : (currentIndex / questions.length) * 100}
        elapsedSeconds={elapsedSeconds}
        showTimer={showTimer}
        onToggleTimer={() => setShowTimer((v) => !v)}
        onSubmit={phase === "question" ? handleSubmitClick : undefined}
      />

      <SubmitConfirmModal
        open={confirmingSubmit}
        unansweredCount={unansweredCount}
        onCancel={() => setConfirmingSubmit(false)}
        onConfirm={submitNow}
      />

      <div
        className={cn(
          "mx-auto flex w-full flex-1 gap-6 px-6 py-8",
          sidebar ? "max-w-2xl lg:max-w-5xl" : "max-w-2xl"
        )}
      >
        {sidebar}

        <main className="flex w-full flex-1 flex-col gap-6">
          {breadcrumbs && <Breadcrumbs items={breadcrumbs} />}

          {phase === "summary" ? (
            <SessionResults results={results} totalElapsedSeconds={elapsedSeconds} onFinish={handleFinish} />
          ) : (
            <>
              <QuestionCard question={currentQuestion} />

              <AnswerOptions
                choices={currentQuestion.choices}
                selected={selected}
                section={currentQuestion.section}
                onSelect={handleSelect}
              />

              <div className="flex items-center justify-between gap-3">
                <Button size="lg" variant="outline" disabled={isFirstQuestion} onClick={handlePrev}>
                  הקודם
                </Button>

                <Button size="lg" disabled={!canProceed} onClick={handleNext}>
                  {isLastQuestion ? "הגש וסיים" : "השאלה הבאה"}
                </Button>
              </div>
            </>
          )}
        </main>
      </div>

      {phase === "question" && (
        <TutorChatDrawer
          key={currentQuestion.id}
          question={currentQuestion}
          chosenAnswer={selected}
          selfReportedError={null}
        />
      )}
    </div>
  );
}
