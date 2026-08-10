"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import Link from "next/link";
import { Flag, Loader2, X } from "lucide-react";
import { cn } from "@/lib/utils";
import { recordAttempt } from "@/lib/storage";
import { saveExamResult } from "@/lib/exam-result";
import { cacheQuestions } from "@/lib/question-cache";
import { recordExamHistory, scaleScore } from "@/lib/exam-history";
import { ExamTimer } from "@/components/exam/exam-timer";
import { QuestionNavigator } from "@/components/exam/question-navigator";
import { ExamAnswerOptions } from "@/components/exam/exam-answer-options";
import { QuestionCard } from "@/components/practice/question-card";
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

const EXAM_QUESTION_COUNT = 20;
const EXAM_DURATION_SECONDS = 20 * 60;

export default function ExamSectionPage() {
  const params = useParams<{ section: string }>();
  const router = useRouter();
  const sectionParam = params.section;
  const section = isValidSection(sectionParam) ? sectionParam : null;

  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState(false);
  const [questions, setQuestions] = useState<Question[]>([]);
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
        const half = EXAM_QUESTION_COUNT / 2;
        const requestBatch = () =>
          fetch("/api/generate-questions", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ section, difficulty: "medium", count: half }),
          }).then((r) => r.json());

        const [a, b] = await Promise.all([requestBatch(), requestBatch()]);
        if (cancelled) return;

        const loaded: Question[] = [...(a.questions ?? []), ...(b.questions ?? [])];
        if (loaded.length === 0) {
          setLoadError(true);
          return;
        }

        cacheQuestions(loaded);
        setQuestions(loaded);
        setAnswers(new Array(loaded.length).fill(null));
        setFlagged(new Array(loaded.length).fill(false));
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
            <Button size="sm" variant="outline" onClick={() => setConfirmingSubmit(true)}>
              הגש בחינה
            </Button>
          </div>
        </div>
      </header>

      <main className="mx-auto flex w-full max-w-3xl flex-1 flex-col gap-6 px-6 py-8">
        {confirmingSubmit && (
          <div className="flex flex-col gap-3 rounded-xl border border-primary/30 bg-primary/5 p-4">
            <p className="text-sm">
              {answeredCount < questions.length &&
                `שימו לב: ${questions.length - answeredCount} שאלות עדיין ללא תשובה. `}
              להגיש את הבחינה?
            </p>
            <div className="flex gap-2">
              <Button size="sm" onClick={submitExam}>
                כן, הגישו
              </Button>
              <Button size="sm" variant="outline" onClick={() => setConfirmingSubmit(false)}>
                ביטול
              </Button>
            </div>
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
            <Button
              disabled={isLastQuestion}
              onClick={() => setCurrentIndex((i) => Math.min(questions.length - 1, i + 1))}
            >
              הבאה
            </Button>
          </div>
        </div>
      </main>
    </div>
  );
}
