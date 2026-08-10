"use client";

import Link from "next/link";
import { CheckCircle2, MinusCircle, XCircle } from "lucide-react";
import { cn } from "@/lib/utils";
import { buttonVariants } from "@/components/ui/button";
import { NavBar } from "@/components/nav-bar";
import { MathText } from "@/components/practice/math-text";
import { useExamResult } from "@/lib/use-exam-result";
import { SECTION_LABELS } from "@/lib/stats";

/** Simplified, transparently-labeled linear approximation onto the real
 * exam's published 50-150 per-section scale. This is NOT the real NITE
 * equating algorithm (item-difficulty calibration, norming against other
 * test-takers) — that data doesn't exist for a simulated bank, which is why
 * the results screen explicitly disclaims it as an estimate. */
function scaleScore(accuracyFraction: number): number {
  const raw = 50 + accuracyFraction * 100;
  return Math.max(50, Math.min(150, Math.round(raw / 5) * 5));
}

function formatTime(totalSeconds: number) {
  const m = Math.floor(totalSeconds / 60);
  const s = totalSeconds % 60;
  return `${m}:${s.toString().padStart(2, "0")}`;
}

export default function ExamResultsPage() {
  const result = useExamResult();

  if (!result) {
    return (
      <>
        <NavBar />
        <main className="mx-auto flex w-full max-w-2xl flex-col items-center gap-4 px-6 py-16 text-center">
          <p className="text-lg font-medium">אין תוצאות סימולציה להצגה</p>
          <p className="text-muted-foreground">
            התחילו סימולציית פרק כדי לראות כאן סיכום תוצאות.
          </p>
          <Link href="/exam/quant" className={buttonVariants({ size: "lg" })}>
            התחילו סימולציה
          </Link>
        </main>
      </>
    );
  }

  const total = result.questions.length;
  const correctCount = result.answers.filter(
    (a, i) => a !== null && a === result.questions[i].correctAnswer
  ).length;
  const answeredCount = result.answers.filter((a) => a !== null).length;
  const accuracy = total > 0 ? correctCount / total : 0;
  const score = scaleScore(accuracy);

  return (
    <>
      <NavBar />
      <main className="mx-auto flex w-full max-w-3xl flex-col gap-6 px-6 py-10">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">
            תוצאות סימולציית פרק {SECTION_LABELS[result.section]}
          </h1>
          <p className="mt-1 text-muted-foreground">סיכום הביצועים שלכם בסימולציה שהושלמה.</p>
        </div>

        <div className="grid grid-cols-2 gap-4 sm:grid-cols-4">
          <div className="rounded-xl border border-primary/30 bg-primary/5 p-5 text-center">
            <p className="text-3xl font-bold tracking-tight">{score}</p>
            <p className="mt-1 text-sm text-muted-foreground">ציון משוער (50-150)</p>
          </div>
          <div className="rounded-xl border border-border bg-card p-5 text-center">
            <p className="text-3xl font-bold tracking-tight">{Math.round(accuracy * 100)}%</p>
            <p className="mt-1 text-sm text-muted-foreground">דיוק</p>
          </div>
          <div className="rounded-xl border border-border bg-card p-5 text-center">
            <p className="text-3xl font-bold tracking-tight">
              {correctCount}/{total}
            </p>
            <p className="mt-1 text-sm text-muted-foreground">תשובות נכונות</p>
          </div>
          <div className="rounded-xl border border-border bg-card p-5 text-center">
            <p dir="ltr" className="text-3xl font-bold tracking-tight">
              {formatTime(result.totalTimeSeconds)}
            </p>
            <p className="mt-1 text-sm text-muted-foreground">זמן כולל</p>
          </div>
        </div>

        <p className="text-xs text-muted-foreground">
          * זהו ציון משוער בלבד, המבוסס על אחוז התשובות הנכונות מתוך {total} שאלות (
          {answeredCount} מהן נענו). הציון הרשמי במבחן האמיתי מחושב באמצעות תהליך שקלול
          סטטיסטי (איזון נורמות) שאינו זמין לסימולציה זו.
        </p>

        <div>
          <h2 className="mb-3 text-lg font-semibold">סקירת שאלות</h2>
          <div className="flex flex-col gap-4">
            {result.questions.map((q, i) => {
              const chosen = result.answers[i];
              const isAnswered = chosen !== null;
              const isCorrect = isAnswered && chosen === q.correctAnswer;
              const dir = q.section === "english" ? "ltr" : undefined;

              return (
                <div
                  key={q.id}
                  className={cn(
                    "flex flex-col gap-3 rounded-xl border bg-card p-5 shadow-sm",
                    !isAnswered
                      ? "border-border"
                      : isCorrect
                        ? "border-green-600/20"
                        : "border-red-600/20"
                  )}
                >
                  <div className="flex items-center justify-between gap-2">
                    <span className="text-xs font-medium text-muted-foreground">
                      שאלה {i + 1}
                    </span>
                    <div className="flex items-center gap-1.5 text-sm font-medium">
                      {!isAnswered ? (
                        <>
                          <MinusCircle className="size-4 text-muted-foreground" />
                          <span className="text-muted-foreground">לא נענתה</span>
                        </>
                      ) : isCorrect ? (
                        <>
                          <CheckCircle2 className="size-4 text-green-600" />
                          <span className="text-green-700 dark:text-green-400">נכון</span>
                        </>
                      ) : (
                        <>
                          <XCircle className="size-4 text-red-600" />
                          <span className="text-red-700 dark:text-red-400">שגוי</span>
                        </>
                      )}
                    </div>
                  </div>

                  <p dir={dir} className="text-base text-card-foreground">
                    <MathText text={q.body} />
                  </p>

                  <div className="flex flex-col gap-1.5 text-sm">
                    {isAnswered && (
                      <div dir={dir} className="flex items-start gap-1.5">
                        <span className="shrink-0 text-muted-foreground">התשובה שלך:</span>
                        <span
                          className={
                            isCorrect
                              ? "text-green-700 dark:text-green-400"
                              : "text-red-700 dark:text-red-400"
                          }
                        >
                          <MathText text={q.choices[chosen]} />
                        </span>
                      </div>
                    )}
                    {!isCorrect && (
                      <div dir={dir} className="flex items-start gap-1.5">
                        <span className="shrink-0 text-muted-foreground">התשובה הנכונה:</span>
                        <span className="text-green-700 dark:text-green-400">
                          <MathText text={q.choices[q.correctAnswer]} />
                        </span>
                      </div>
                    )}
                  </div>

                  <div className="rounded-lg bg-muted/50 p-3 text-sm text-card-foreground">
                    <MathText text={q.explanation} />
                  </div>
                </div>
              );
            })}
          </div>
        </div>

        <div className="flex gap-2">
          <Link href={`/exam/${result.section}`} className={buttonVariants({ size: "lg" })}>
            סימולציה נוספת
          </Link>
          <Link
            href="/dashboard"
            className={buttonVariants({ variant: "outline", size: "lg" })}
          >
            ללוח הבקרה
          </Link>
        </div>
      </main>
    </>
  );
}
