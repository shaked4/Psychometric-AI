"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import Link from "next/link";
import { Flag, Loader2, X } from "lucide-react";
import { cn } from "@/lib/utils";
import { getAttempts, recordAttempt } from "@/lib/storage";
import { saveExamResult } from "@/lib/exam-result";
import { cacheQuestions } from "@/lib/question-cache";
import { recordExamHistory, scaleScore } from "@/lib/exam-history";
import { ExamTimer } from "@/components/exam/exam-timer";
import { QuestionNavigator } from "@/components/exam/question-navigator";
import { ExamAnswerOptions } from "@/components/exam/exam-answer-options";
import { QuestionCard } from "@/components/practice/question-card";
import { SubmitConfirmModal } from "@/components/practice/submit-confirm-modal";
import { Button, buttonVariants } from "@/components/ui/button";
import type { Question, Section } from "@/types";

const SECTION_LABELS: Record<Section, string> = {
  quant: "כמותי",
  verbal: "מילולי",
  english: "אנגלית",
};

const VALID_SECTIONS: Section[] = ["quant", "verbal", "english"];

function isValidSection(value: string): value is Section {
  return (VALID_SECTIONS as string[]).includes(value);
}

/** English gets two extra questions, matching the real exam's own
 * per-section split — the other two sections keep the original 20. */
const EXAM_QUESTION_COUNTS: Record<Section, number> = { quant: 20, verbal: 20, english: 22 };
const EXAM_DURATION_SECONDS = 20 * 60;

export default function ExamSectionPage() {
  const params = useParams<{ section: string }>();
  const router = useRouter();
  const sectionParam = params.section;
  const section = isValidSection(sectionParam) ? sectionParam : null;

  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState(false);
  const [questions, setQuestions] = useState<Question[]>([]);
  // Set when the pre-seeded question bank ran out of questions this
  // student hasn't already solved and had to recycle some of their oldest
  // solved ones to fill out the set (lib/exam-fetcher.ts) — a graceful
  // notice rather than silently pretending every question is new.
  const [recycledCount, setRecycledCount] = useState(0);
  // Set when the bank had genuine questions but not enough to fill a full
  // exam, and live AI top-up was unavailable — rather than padding the real
  // bank content with dozens of repeats of the same ~3 static mock
  // questions, the exam is just shorter than usual.
  const [shortExamNotice, setShortExamNotice] = useState<{ actual: number; target: number } | null>(null);
  const [answers, setAnswers] = useState<(number | null)[]>([]);
  const [flagged, setFlagged] = useState<boolean[]>([]);
  const [currentIndex, setCurrentIndex] = useState(0);
  const [confirmingSubmit, setConfirmingSubmit] = useState(false);
  // A plain guard, not state: submission fires side effects (recordAttempt,
  // navigation) that must run exactly once, and a setState updater isn't a
  // safe place for those (React may invoke updaters more than once).
  const submittedRef = useRef(false);
  const [sessionId] = useState(() => crypto.randomUUID());
  const [startedAt] = useState(() => Date.now());

  useEffect(() => {
    if (!section) return;
    let cancelled = false;

    async function load() {
      setLoading(true);
      setLoadError(false);
      try {
        const targetCount = EXAM_QUESTION_COUNTS[section as Section];
        const requestBatch = (count: number) =>
          fetch("/api/generate-questions", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ section, difficulty: "medium", count }),
          }).then((r) => r.json());

        // Prefer the pre-seeded, deduplicated question bank
        // (lib/exam-fetcher.ts) — falls back to live AI generation below
        // for any shortfall, whether that's the whole set (bank not seeded
        // / Supabase not configured) or just a thin remainder.
        let loaded: Question[] = [];
        let recycled = 0;
        try {
          const localSolvedIds = [...new Set(getAttempts().map((a) => a.questionId))];
          const allocateRes = await fetch("/api/exam/allocate", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ section, count: targetCount, excludeQuestionIds: localSolvedIds }),
          }).then((r) => r.json());

          if (allocateRes?.bankAvailable && Array.isArray(allocateRes.questions)) {
            loaded = allocateRes.questions;
            recycled = typeof allocateRes.recycledCount === "number" ? allocateRes.recycledCount : 0;
          }
        } catch {
          // Bank allocation is a pure enhancement — any failure here just
          // means the full amount gets topped up via generation below.
        }
        if (cancelled) return;

        // Real bank content already in hand — don't dilute it with the
        // live-generation route's own offline fallback, which just cycles
        // a handful of static mock questions to pad out whatever count it's
        // asked for. An empty bank (hadBankQuestions === false) still gets
        // that fallback below, exactly reproducing this page's original
        // pre-bank behavior.
        const hadBankQuestions = loaded.length > 0;

        const shortfall = targetCount - loaded.length;
        if (shortfall > 0) {
          const half = Math.ceil(shortfall / 2);
          const batches =
            shortfall > 1
              ? await Promise.all([requestBatch(half), requestBatch(shortfall - half)])
              : [await requestBatch(shortfall)];
          if (cancelled) return;
          for (const batch of batches) {
            if (hadBankQuestions && batch.offline) continue;
            loaded = [...loaded, ...(batch.questions ?? [])];
          }
        }

        if (loaded.length === 0) {
          setLoadError(true);
          return;
        }

        cacheQuestions(loaded);
        setQuestions(loaded);
        setAnswers(new Array(loaded.length).fill(null));
        setFlagged(new Array(loaded.length).fill(false));
        setRecycledCount(recycled);
        setShortExamNotice(hadBankQuestions && loaded.length < targetCount ? { actual: loaded.length, target: targetCount } : null);
      } catch {
        if (!cancelled) setLoadError(true);
      } finally {
        if (!cancelled) setLoading(false);
      }
    }

    load();
    return () => {
      cancelled = true;
    };
  }, [section]);

  const submitExam = useCallback(() => {
    if (submittedRef.current) return;
    submittedRef.current = true;

    const totalTimeSeconds = Math.max(1, Math.round((Date.now() - startedAt) / 1000));
    const perQuestionTime = Math.max(1, Math.round(totalTimeSeconds / questions.length));

    let correctCount = 0;
    questions.forEach((q, i) => {
      const chosen = answers[i];
      if (chosen === null) return; // no attempt to record for a skipped question
      const isCorrect = chosen === q.correctAnswer;
      if (isCorrect) correctCount += 1;
      recordAttempt({
        sessionId,
        questionId: q.id,
        chosenAnswer: chosen,
        isCorrect,
        timeTakenSeconds: perQuestionTime,
        selfReportedError: null,
        flagged: flagged[i],
      });
    });

    const completedAt = new Date().toISOString();

    recordExamHistory({
      sessionId,
      section: section as Section,
      score: scaleScore(correctCount / questions.length),
      accuracyPct: Math.round((correctCount / questions.length) * 100),
      totalTimeSeconds,
      questionCount: questions.length,
      completedAt,
    });

    saveExamResult({
      section: section as Section,
      sessionId,
      totalTimeSeconds,
      questions,
      answers,
      flaggedIndices: flagged.flatMap((f, i) => (f ? [i] : [])),
      completedAt,
    });

    router.push("/exam/results");
  }, [startedAt, questions, answers, sessionId, section, flagged, router]);

  function handleSubmitClick() {
    const unanswered = questions.length - answers.filter((a) => a !== null).length;
    if (unanswered > 0) {
      setConfirmingSubmit(true);
    } else {
      submitExam();
    }
  }

  function handleSelect(index: number) {
    setAnswers((prev) => {
      const next = [...prev];
      next[currentIndex] = index;
      return next;
    });
  }

  function toggleFlag() {
    setFlagged((prev) => {
      const next = [...prev];
      next[currentIndex] = !next[currentIndex];
      return next;
    });
  }

  if (!section) {
    return (
      <div className="flex min-h-screen flex-col items-center justify-center gap-4 px-6 text-center">
        <p className="text-lg font-medium">הסימולציה המבוקשת לא נמצאה</p>
        <Link href="/" className={buttonVariants({ variant: "default" })}>
          חזרה לדף הבית
        </Link>
      </div>
    );
  }

  if (loading) {
    return (
      <div className="flex min-h-screen flex-col items-center justify-center gap-3 px-6 text-center text-muted-foreground">
        <Loader2 className="size-6 animate-spin" />
        <p>בונים עבורכם סימולציית פרק {SECTION_LABELS[section]}...</p>
      </div>
    );
  }

  if (loadError || questions.length === 0) {
    return (
      <div className="flex min-h-screen flex-col items-center justify-center gap-4 px-6 text-center">
        <p className="text-lg font-medium">לא הצלחנו לטעון את הסימולציה. נסו שוב.</p>
        <Link href="/" className={buttonVariants({ variant: "default" })}>
          חזרה לדף הבית
        </Link>
      </div>
    );
  }

  const currentQuestion = questions[currentIndex];
  const answeredCount = answers.filter((a) => a !== null).length;
  const isLastQuestion = currentIndex === questions.length - 1;

  return (
    <div className="flex min-h-screen flex-col">
      <header className="sticky top-0 z-10 border-b border-border bg-background/95 backdrop-blur">
        <div className="mx-auto flex max-w-3xl flex-wrap items-center justify-between gap-3 px-6 py-4">
          <Link
            href="/"
            aria-label="יציאה מהסימולציה"
            className="flex size-8 shrink-0 items-center justify-center rounded-full text-muted-foreground transition hover:bg-muted hover:text-foreground"
          >
            <X className="size-5" />
          </Link>
          <div className="text-sm font-medium">סימולציית פרק {SECTION_LABELS[section]}</div>
          <div className="flex items-center gap-2">
            <ExamTimer totalSeconds={EXAM_DURATION_SECONDS} onExpire={submitExam} />
            <Button size="sm" onClick={handleSubmitClick}>
              הגש בחינה
            </Button>
          </div>
        </div>
      </header>

      <SubmitConfirmModal
        open={confirmingSubmit}
        unansweredCount={questions.length - answeredCount}
        onCancel={() => setConfirmingSubmit(false)}
        onConfirm={submitExam}
      />

      <main className="mx-auto flex w-full max-w-3xl flex-1 flex-col gap-6 px-6 py-8">
        {recycledCount > 0 && (
          <div className="rounded-lg border border-amber-500/30 bg-amber-500/10 p-3 text-sm text-amber-700 dark:text-amber-400">
            {recycledCount === questions.length
              ? "פתרתם כבר את כל השאלות הזמינות בבנק לקטע הזה — הסימולציה הזו חוזרת על שאלות ישנות."
              : `${recycledCount} מתוך ${questions.length} השאלות בסימולציה הזו כבר נפתרו בעבר — לא נותרו מספיק שאלות חדשות בבנק.`}
          </div>
        )}

        {shortExamNotice && (
          <div className="rounded-lg border border-amber-500/30 bg-amber-500/10 p-3 text-sm text-amber-700 dark:text-amber-400">
            {`הסימולציה כוללת ${shortExamNotice.actual} שאלות במקום ${shortExamNotice.target} — בנק השאלות לקטע הזה עדיין קטן מדי ליצירת שאלות AI חדשות כרגע.`}
          </div>
        )}

        <QuestionNavigator
          total={questions.length}
          currentIndex={currentIndex}
          answered={answers.map((a) => a !== null)}
          flagged={flagged}
          onJump={setCurrentIndex}
        />

        <QuestionCard question={currentQuestion} />

        <ExamAnswerOptions
          choices={currentQuestion.choices}
          selected={answers[currentIndex]}
          section={currentQuestion.section}
          onSelect={handleSelect}
        />

        <div className="flex flex-wrap items-center justify-between gap-3">
          <button
            type="button"
            onClick={toggleFlag}
            className={cn(
              "flex items-center gap-1.5 rounded-full border px-4 py-2 text-sm transition",
              flagged[currentIndex]
                ? "border-amber-500 bg-amber-500/10 text-amber-600 dark:text-amber-400"
                : "border-border text-muted-foreground hover:bg-muted"
            )}
          >
            <Flag className="size-4" />
            {flagged[currentIndex] ? "מסומן לבדיקה חוזרת" : "סמנו לבדיקה חוזרת"}
          </button>

          <div className="flex items-center gap-2">
            <Button
              variant="outline"
              disabled={currentIndex === 0}
              onClick={() => setCurrentIndex((i) => Math.max(0, i - 1))}
            >
              הקודמת
            </Button>
            {isLastQuestion ? (
              <Button onClick={handleSubmitClick}>הגש וסיים</Button>
            ) : (
              <Button onClick={() => setCurrentIndex((i) => Math.min(questions.length - 1, i + 1))}>
                הבאה
              </Button>
            )}
          </div>
        </div>
      </main>
    </div>
  );
}
