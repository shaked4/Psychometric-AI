"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { Loader2, TriangleAlert, Zap } from "lucide-react";
import { NavBar } from "@/components/nav-bar";
import { PracticeSession } from "@/components/practice/practice-session";
import { buttonVariants } from "@/components/ui/button";
import { getAttempts } from "@/lib/storage";
import { cacheQuestions } from "@/lib/question-cache";
import { QUICK_PRACTICE_MIX, QUICK_PRACTICE_TOTAL } from "@/lib/quick-practice";
import type { Question, Section } from "@/types";

type LoadState = "loading" | "ready" | "empty";

interface AllocateResponse {
  questions?: Question[];
  bankAvailable?: boolean;
}

/**
 * The homepage's "התחילו תרגול יומי קצר" CTA lands here. Unlike
 * /practice/custom (a config form for the AI stream), this page has no form
 * — on mount it calls the exact same /api/exam/allocate endpoint exam mode
 * uses, once per section in QUICK_PRACTICE_MIX, and drops straight into
 * PracticeSession. No new API route, no new Supabase table, no mock
 * fallback: this reuses allocateExamQuestions() (lib/exam-fetcher.ts) and
 * its existing attempts-based per-user dedup/recycle logic verbatim — the
 * only thing new here is calling it three times with small per-section
 * counts instead of once with a full exam's count.
 */
export default function QuickPracticePage() {
  const [state, setState] = useState<LoadState>("loading");
  const [questions, setQuestions] = useState<Question[]>([]);

  useEffect(() => {
    let cancelled = false;

    async function load() {
      try {
        const localSolvedIds = [...new Set(getAttempts().map((a) => a.questionId))];

        const responses = await Promise.all(
          (Object.entries(QUICK_PRACTICE_MIX) as [Section, number][]).map(([section, count]) =>
            fetch("/api/exam/allocate", {
              method: "POST",
              headers: { "Content-Type": "application/json" },
              body: JSON.stringify({ section, count, excludeQuestionIds: localSolvedIds }),
            })
              .then((r) => r.json() as Promise<AllocateResponse>)
              .catch(() => null)
          )
        );

        if (cancelled) return;

        const loaded = responses.flatMap((r) => (r?.bankAvailable && Array.isArray(r.questions) ? r.questions : []));
        if (loaded.length === 0) {
          setState("empty");
          return;
        }

        cacheQuestions(loaded);
        setQuestions(loaded);
        setState("ready");
      } catch {
        if (!cancelled) setState("empty");
      }
    }

    load();
    return () => {
      cancelled = true;
    };
  }, []);

  if (state === "ready") {
    return (
      <PracticeSession
        key={questions.map((q) => q.id).join(",")}
        questions={questions}
        sectionLabel="תרגול יומי קצר"
        finishHref="/dashboard"
      />
    );
  }

  return (
    <>
      <NavBar />
      <main className="mx-auto flex w-full max-w-2xl flex-col items-center gap-4 px-6 py-24 text-center">
        {state === "loading" ? (
          <>
            <Loader2 className="size-8 animate-spin text-primary" />
            <p className="text-base font-medium text-foreground">מכינים {QUICK_PRACTICE_TOTAL} שאלות מגוונות...</p>
            <p className="text-sm text-muted-foreground">כמותי, מילולי ואנגלית — כמה שאלות, בלי לחץ, בלי שעון</p>
          </>
        ) : (
          <>
            <TriangleAlert className="size-8 text-amber-600" />
            <p className="text-base font-medium text-foreground">אין כרגע מספיק שאלות זמינות לתרגול היומי</p>
            <p className="max-w-sm text-sm text-muted-foreground">
              מאגר השאלות עדיין לא נטען במלואו. נסו שוב בעוד כמה רגעים, או עברו לתרגול לפי נושא.
            </p>
            <div className="mt-2 flex gap-3">
              <Link href="/dashboard" className={buttonVariants({ variant: "outline" })}>
                ללוח הבקרה
              </Link>
              <Link href="/practice/quant" className={buttonVariants()}>
                <Zap className="size-4" />
                תרגול לפי נושא
              </Link>
            </div>
          </>
        )}
      </main>
    </>
  );
}
