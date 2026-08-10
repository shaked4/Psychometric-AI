"use client";

import { useMemo, useState } from "react";
import Link from "next/link";
import { Brain, PartyPopper } from "lucide-react";
import { NavBar } from "@/components/nav-bar";
import { PracticeSession } from "@/components/practice/practice-session";
import { Button, buttonVariants } from "@/components/ui/button";
import { useAttempts } from "@/lib/use-attempts";
import { computeReviewQueue } from "@/lib/spaced-repetition";
import { getQuestion } from "@/lib/stats";
import type { Question } from "@/types";

export default function ReviewPracticePage() {
  const attempts = useAttempts();
  const [started, setStarted] = useState(false);

  const dueQuestions = useMemo(() => {
    const { dueToday } = computeReviewQueue(attempts);
    return dueToday
      .map((item) => getQuestion(item.questionId))
      .filter((q): q is Question => q !== undefined);
  }, [attempts]);

  if (started && dueQuestions.length > 0) {
    return (
      <PracticeSession
        key={dueQuestions.map((q) => q.id).join(",")}
        questions={dueQuestions}
        sectionLabel="חזרה מרווחת"
        onFinish={() => setStarted(false)}
      />
    );
  }

  return (
    <>
      <NavBar />
      <main className="mx-auto flex w-full max-w-2xl flex-col gap-8 px-6 py-10">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">חזרה מרווחת</h1>
          <p className="mt-1 text-muted-foreground">
            שאלות שטעיתם בהן, או סימנתם לבדיקה חוזרת בסימולציה, חוזרות אליכם בעיתוי הנכון
            לפי מרווחי חזרה (יום, 3 ימים, שבוע) — כדי לחזק את הזיכרון לטווח ארוך.
          </p>
        </div>

        {dueQuestions.length === 0 ? (
          <div className="flex flex-col items-center gap-3 rounded-xl border border-dashed border-border p-10 text-center">
            <PartyPopper className="size-8 text-primary" />
            <p className="text-base font-medium text-foreground">אין לכם שאלות לחזרה היום</p>
            <p className="max-w-sm text-sm text-muted-foreground">
              כשתטעו בשאלה, או תסמנו אותה לבדיקה חוזרת בסימולציית פרק, היא תיכנס לתור החזרה
              המרווחת ותופיע כאן ברגע שהיא מגיעה לתאריך שלה.
            </p>
            <Link href="/dashboard" className={buttonVariants({ variant: "outline" })}>
              ללוח הבקרה
            </Link>
          </div>
        ) : (
          <div className="flex flex-col gap-4 rounded-xl border border-primary/30 bg-primary/5 p-6 shadow-sm">
            <div className="flex items-center gap-3">
              <Brain className="size-6 text-primary" />
              <div className="flex flex-1 items-center justify-between">
                <span className="text-sm font-medium">שאלות שממתינות לחזרה היום</span>
                <span className="text-2xl font-bold tabular-nums">{dueQuestions.length}</span>
              </div>
            </div>
            <Button size="lg" onClick={() => setStarted(true)}>
              התחילו חזרה מרווחת
            </Button>
          </div>
        )}
      </main>
    </>
  );
}
