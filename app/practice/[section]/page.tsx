"use client";

import { useEffect, useState } from "react";
import { useParams, useSearchParams } from "next/navigation";
import Link from "next/link";
import { Loader2 } from "lucide-react";
import { getAttempts } from "@/lib/storage";
import { cacheQuestions } from "@/lib/question-cache";
import { NavBar } from "@/components/nav-bar";
import { PracticeSession } from "@/components/practice/practice-session";
import { StudySidebar } from "@/components/practice/study-sidebar";
import { buttonVariants } from "@/components/ui/button";
import type { Question, Section } from "@/types";

const SECTION_LABELS: Record<Section, string> = {
  quant: "כמותי",
  verbal: "מילולי",
  english: "אנגלית",
};

/** Fuller, official-sounding section names for the breadcrumb trail —
 * deliberately more formal than the short tab labels used elsewhere
 * (nav bar, progress header), matching how a study portal would name a
 * curriculum branch. */
const SECTION_BREADCRUMB_LABELS: Record<Section, string> = {
  quant: "חשיבה כמותית",
  verbal: "חשיבה מילולית",
  english: "אנגלית",
};

const VALID_SECTIONS: Section[] = ["quant", "verbal", "english"];

function isValidSection(value: string): value is Section {
  return (VALID_SECTIONS as string[]).includes(value);
}

/** Practice mode draws as much of the section/topic's seeded pool as
 * actually exists, not a fixed exam-length slice — this is the cap on that
 * draw, not a target the engine tries to fill. allocateExamQuestions()
 * (lib/exam-fetcher.ts) already returns fewer than this whenever the pool
 * genuinely has fewer, which is exactly "all available questions", not a
 * shortfall to be padded. */
const PRACTICE_QUESTION_LIMIT = 50;

export default function PracticeSessionPage() {
  const params = useParams<{ section: string }>();
  const searchParams = useSearchParams();
  const sectionParam = params.section;
  const topicParam = searchParams.get("topic");
  const section = isValidSection(sectionParam) ? sectionParam : null;

  const [loading, setLoading] = useState(true);
  const [questions, setQuestions] = useState<Question[]>([]);

  useEffect(() => {
    // Rendered before the loading check either way (see below) — no state
    // update needed for this branch, `loading`'s value is simply unused.
    if (!section) return;
    let cancelled = false;

    async function load() {
      setLoading(true);
      try {
        const localSolvedIds = [...new Set(getAttempts().map((a) => a.questionId))];

        // Draw everything the pre-seeded question bank has for this
        // section/topic (lib/exam-fetcher.ts) — same allocation engine and
        // per-user solved-history exclusion exam mode uses (unsolved
        // first, then previously-wrong, then a full reset), just asked for
        // up to PRACTICE_QUESTION_LIMIT instead of a fixed exam-length
        // count. Unlike exam mode, a partial result here is NOT a
        // shortfall to top up — it's simply "all available questions",
        // which is exactly what practice mode should show.
        let loaded: Question[] = [];
        try {
          const allocateRes = await fetch("/api/exam/allocate", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
              section,
              count: PRACTICE_QUESTION_LIMIT,
              topic: topicParam ?? undefined,
              excludeQuestionIds: localSolvedIds,
            }),
          }).then((r) => r.json());

          if (allocateRes?.bankAvailable && Array.isArray(allocateRes.questions)) {
            loaded = allocateRes.questions;
          }
        } catch {
          // Bank allocation is a pure enhancement — any failure here just
          // falls through to live generation below, same as an empty bank.
        }
        if (cancelled) return;

        // The bank has literally nothing for this section/topic (not
        // seeded, or Supabase not configured) — this is the one case where
        // falling back to live AI generation makes sense, since there's
        // nothing real to dilute. A bank that returned *some* real
        // questions is left exactly as-is, never padded with generated
        // filler — see the comment above.
        if (loaded.length === 0) {
          try {
            const batch = await fetch("/api/generate-questions", {
              method: "POST",
              headers: { "Content-Type": "application/json" },
              body: JSON.stringify({
                section,
                topic: topicParam ?? undefined,
                difficulty: "medium",
                count: PRACTICE_QUESTION_LIMIT,
              }),
            }).then((r) => r.json());
            if (cancelled) return;
            loaded = batch.questions ?? [];
          } catch {
            // Live generation failing too just means an empty result,
            // handled by the empty-state screen below.
          }
        }
        if (cancelled) return;

        cacheQuestions(loaded);
        setQuestions(loaded);
      } finally {
        if (!cancelled) setLoading(false);
      }
    }

    load();
    return () => {
      cancelled = true;
    };
  }, [section, topicParam]);

  if (!section) {
    return (
      <div className="flex min-h-screen flex-col items-center justify-center gap-4 px-6 text-center">
        <p className="text-lg font-medium">התרגול המבוקש לא נמצא</p>
        <Link href="/" className={buttonVariants({ variant: "default" })}>
          חזרה לדף הבית
        </Link>
      </div>
    );
  }

  if (loading) {
    return (
      <div className="flex min-h-screen flex-col items-center justify-center gap-4 px-6 text-center">
        <Loader2 className="size-8 animate-spin text-primary" />
        <p className="text-base font-medium text-foreground">מכינים שאלות תרגול...</p>
      </div>
    );
  }

  if (questions.length === 0) {
    // Thin/empty pool for this exact section+topic — a real possibility for
    // a mistyped or stale ?topic= value even though every canonical topic
    // (lib/topics.ts) is well-seeded. Rather than stranding the student on a
    // dead end, this renders the same StudySidebar as the ready state so
    // switching to any other topic is one click away, not a trip back to
    // the homepage first.
    return (
      <>
        <NavBar />
        <div className="mx-auto flex w-full max-w-5xl flex-1 gap-6 px-6 py-8">
          <StudySidebar currentSection={section} currentTopic={topicParam ?? undefined} />
          <main className="flex w-full flex-1 flex-col items-center justify-center gap-4 py-16 text-center">
            <p className="text-lg font-medium">אין כרגע שאלות זמינות לתרגול הזה</p>
            <p className="max-w-sm text-sm text-muted-foreground">
              בחרו נושא אחר מתוכן הלימוד בצד, או נסו שוב בעוד כמה רגעים.
            </p>
            <Link href="/" className={buttonVariants({ variant: "default" })}>
              חזרה לדף הבית
            </Link>
          </main>
        </div>
      </>
    );
  }

  return (
    <PracticeSession
      key={`${section}-${topicParam ?? "all"}-${questions.map((q) => q.id).join(",")}`}
      questions={questions}
      sectionLabel={SECTION_LABELS[section]}
      breadcrumbs={[
        { label: "בית", href: "/" },
        { label: SECTION_BREADCRUMB_LABELS[section], href: `/practice/${section}` },
        { label: topicParam ?? "תרגול נושאי" },
      ]}
      sidebar={<StudySidebar currentSection={section} currentTopic={topicParam ?? undefined} />}
    />
  );
}
