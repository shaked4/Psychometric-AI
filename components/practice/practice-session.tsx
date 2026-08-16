"use client";

import { useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { cn } from "@/lib/utils";
import { recordAttempt } from "@/lib/storage";
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
 * whole batch is answered (see components/practice/session-results.tsx). */
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
  const [selected, setSelected] = useState<number | null>(null);
  const [results, setResults] = useState<SessionResultEntry[]>([]);
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
  const isLastQuestion = currentIndex === questions.length - 1;
  const answered = selected !== null;
  const canProceed = answered;

  function handleSelect(index: number) {
    // Clicking the already-selected option again deselects it, rather than
    // being a no-op — the student can back out of an answer entirely, not
    // just switch between choices.
    if (selected === index) {
      setSelected(null);
      return;
    }
    answerTimeTakenRef.current = Math.max(
      1,
      Math.round((Date.now() - questionStartTimeRef.current) / 1000)
    );
    setSelected(index);
  }

  /** Records whatever is currently selected (if anything) as an attempt.
   * Shared by the normal "next question" advance and by early submission,
   * so a question the student already answered right before hitting
   * "הגש תרגול" is never silently dropped. */
  function recordCurrentAnswer(): SessionResultEntry | null {
    if (selected === null) return null;
    const attempt = recordAttempt({
      sessionId,
      questionId: currentQuestion.id,
      chosenAnswer: selected,
      isCorrect: selected === currentQuestion.correctAnswer,
      timeTakenSeconds: answerTimeTakenRef.current,
      // Not asked live anymore — mistakes are tagged from the results
      // screen, where the student can actually see what went wrong.
      selfReportedError: null,
    });
    return { question: currentQuestion, attempt };
  }

  function handleNext() {
    const entry = recordCurrentAnswer();
    if (!entry) return;
    setResults((prev) => [...prev, entry]);

    if (isLastQuestion) {
      setPhase("summary");
      return;
    }
    setCurrentIndex((i) => i + 1);
    setSelected(null);
  }

  // Any question at or after the current one that hasn't been answered yet
  // — the current question only counts as "answered" once selected, even
  // though its attempt isn't recorded until advancing/submitting.
  const unansweredCount = questions.length - results.length - (selected !== null ? 1 : 0);

  function submitNow() {
    const entry = recordCurrentAnswer();
    setResults((prev) => (entry ? [...prev, entry] : prev));
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

              {answered && (
                <Button
                  size="lg"
                  disabled={!canProceed}
                  onClick={handleNext}
                  className="self-end"
                >
                  {isLastQuestion ? "הגש וסיים" : "השאלה הבאה"}
                </Button>
              )}
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
