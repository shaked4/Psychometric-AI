"use client";

import { useMemo } from "react";
import { useParams, useSearchParams } from "next/navigation";
import Link from "next/link";
import { MOCK_QUESTIONS } from "@/lib/mock-data";
import { PracticeSession } from "@/components/practice/practice-session";
import { StudySidebar } from "@/components/practice/study-sidebar";
import { buttonVariants } from "@/components/ui/button";
import type { Section } from "@/types";

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

export default function PracticeSessionPage() {
  const params = useParams<{ section: string }>();
  const searchParams = useSearchParams();
  const sectionParam = params.section;
  const topicParam = searchParams.get("topic");

  const questions = useMemo(() => {
    if (!isValidSection(sectionParam)) return [];
    const bySection = MOCK_QUESTIONS.filter((q) => q.section === sectionParam);
    if (!topicParam) return bySection;
    // Falls back to the full section if the topic filter would otherwise
    // leave nothing to practice (e.g. a stale/mistyped ?topic= value).
    const byTopic = bySection.filter((q) => q.topic === topicParam);
    return byTopic.length > 0 ? byTopic : bySection;
  }, [sectionParam, topicParam]);

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

  return (
    <PracticeSession
      key={`${sectionParam}-${topicParam ?? "all"}`}
      questions={questions}
      sectionLabel={SECTION_LABELS[sectionParam]}
      breadcrumbs={[
        { label: "בית", href: "/" },
        { label: SECTION_BREADCRUMB_LABELS[sectionParam], href: `/practice/${sectionParam}` },
        { label: topicParam ?? "תרגול נושאי" },
      ]}
      sidebar={<StudySidebar currentSection={sectionParam} currentTopic={topicParam ?? undefined} />}
    />
  );
}
