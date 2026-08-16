"use client";

import { useEffect, useState } from "react";
import { useParams, useSearchParams } from "next/navigation";
import Link from "next/link";
import { Loader2 } from "lucide-react";
import { getAttempts } from "@/lib/storage";
import { cacheQuestions } from "@/lib/question-cache";
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

/** A topical practice batch, not a full exam — short enough to feel like
 * "practice one topic for a bit", long enough that the same visit doesn't
 * run dry after two questions on a thin topic. */
const PRACTICE_QUESTION_COUNT = 8;

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

        // Prefer the pre-seeded, deduplicated question bank
        // (lib/exam-fetcher.ts) — same allocation engine and per-user
        // solved-history exclusion exam mode uses, scoped to this topic —
        // falls back to live AI generation below for any shortfall, same
        // pattern as app/exam/[section]/page.tsx.
        let loaded: Question[] = [];
        try {
          const allocateRes = await fetch("/api/exam/allocate", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
              section,
              count: PRACTICE_QUESTION_COUNT,
              topic: topicParam ?? undefined,
              excludeQuestionIds: localSolvedIds,
            }),
          }).then((r) => r.json());

          if (allocateRes?.bankAvailable && Array.isArray(allocateRes.questions)) {
            loaded = allocateRes.questions;
          }
        } catch {
          // Bank allocation is a pure enhancement — any failure here just
          // means the full amount gets topped up via generation below.
        }
        if (cancelled) return;

        // Real bank content already in hand — don't dilute it with the
        // live-generation route's own offline fallback, which just cycles
        // a handful of static mock questions. An empty bank still gets
        // that fallback below, same as exam mode.
        const hadBankQuestions = loaded.length > 0;
        const shortfall = PRACTICE_QUESTION_COUNT - loaded.length;
        if (shortfall > 0) {
          try {
            const batch = await fetch("/api/generate-questions", {
              method: "POST",
              headers: { "Content-Type": "application/json" },
              body: JSON.stringify({
                section,
                topic: topicParam ?? undefined,
                difficulty: "medium",
                count: shortfall,
              }),
            }).then((r) => r.json());
            if (cancelled) return;
            if (!(hadBankQuestions && batch.offline)) {
              loaded = [...loaded, ...(batch.questions ?? [])];
            }
          } catch {
            // Live generation is also just a top-up — whatever the bank
            // already returned still stands.
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
    return (
      <div className="flex min-h-screen flex-col items-center justify-center gap-4 px-6 text-center">
        <p className="text-lg font-medium">אין כרגע שאלות זמינות לתרגול הזה</p>
        <p className="max-w-sm text-sm text-muted-foreground">
          נסו שוב בעוד כמה רגעים, או בחרו נושא אחר מתוכן הלימוד.
        </p>
        <Link href="/" className={buttonVariants({ variant: "default" })}>
          חזרה לדף הבית
        </Link>
      </div>
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
