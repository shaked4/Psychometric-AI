"use client";

import { useMemo } from "react";
import { useParams } from "next/navigation";
import Link from "next/link";
import { MOCK_QUESTIONS } from "@/lib/mock-data";
import { PracticeSession } from "@/components/practice/practice-session";
import { buttonVariants } from "@/components/ui/button";
import type { Section } from "@/types";

const SECTION_LABELS: Record<Section, string> = {
  quant: "כמותי",
  verbal: "מילולי",
  english: "אנגלית",
};

const VALID_SECTIONS: Section[] = ["quant", "verbal", "english"];

function isValidSection(value: string): value is Section {
  return (VALID_SECTIONS as string[]).includes(value);
}

export default function PracticeSessionPage() {
  const params = useParams<{ section: string }>();
  const sectionParam = params.section;

  const questions = useMemo(
    () =>
      isValidSection(sectionParam)
        ? MOCK_QUESTIONS.filter((q) => q.section === sectionParam)
        : [],
    [sectionParam]
  );

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
      key={sectionParam}
      questions={questions}
      sectionLabel={SECTION_LABELS[sectionParam]}
    />
  );
}
