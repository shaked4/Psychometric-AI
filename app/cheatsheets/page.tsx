"use client";

import { useMemo, useState } from "react";
import { Loader2, Sparkles } from "lucide-react";
import { NavBar } from "@/components/nav-bar";
import { PracticeSession } from "@/components/practice/practice-session";
import { Button } from "@/components/ui/button";
import { MathText } from "@/components/practice/math-text";
import { cacheQuestions } from "@/lib/question-cache";
import { CHEATSHEET_CARDS, type CheatsheetCard } from "@/lib/cheatsheets";
import { SECTION_LABELS } from "@/lib/stats";
import type { Question, Section } from "@/types";

const SECTIONS: Section[] = ["quant", "english"];
const PRACTICE_SET_SIZE = 4;

async function fetchPracticeSet(card: CheatsheetCard): Promise<Question[]> {
  const results = await Promise.all(
    Array.from({ length: PRACTICE_SET_SIZE }, () =>
      fetch("/api/generate-question", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          section: card.section,
          topic: card.topic,
          subtopic: card.subtopic,
          difficulty: "medium",
        }),
      })
        .then((res) => res.json())
        .then((data) => (data.question as Question | null) ?? null)
        .catch(() => null)
    )
  );
  return results.filter((q): q is Question => q !== null);
}

function CheatsheetCardView({ card, onPractice, loading }: { card: CheatsheetCard; onPractice: () => void; loading: boolean }) {
  const dir = card.section === "english" ? "ltr" : undefined;

  return (
    <div className="flex flex-col gap-3 rounded-xl border border-border bg-card p-5 shadow-sm">
      <div className="flex items-center justify-between gap-2">
        <span className="rounded-full bg-muted px-2.5 py-1 text-xs font-medium text-muted-foreground">
          {card.category}
        </span>
      </div>

      <h3 dir={dir} className="text-base font-semibold text-card-foreground">
        {card.title}
      </h3>

      {card.formula && (
        <div dir="ltr" className="rounded-lg bg-muted px-4 py-3 text-start">
          <MathText text={`$${card.formula}$`} />
        </div>
      )}

      <p dir={dir} className="text-sm leading-relaxed text-muted-foreground">
        <MathText text={card.description} />
      </p>

      <Button variant="outline" size="sm" className="mt-1 gap-1.5 self-start" onClick={onPractice} disabled={loading}>
        {loading ? <Loader2 className="size-4 animate-spin" /> : <Sparkles className="size-4" />}
        {loading ? "מכינים תרגול..." : "תרגלו את זה"}
      </Button>
    </div>
  );
}

export default function CheatsheetsPage() {
  const [loadingCardId, setLoadingCardId] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [practiceCard, setPracticeCard] = useState<CheatsheetCard | null>(null);
  const [practiceQuestions, setPracticeQuestions] = useState<Question[] | null>(null);

  const cardsBySection = useMemo(() => {
    return SECTIONS.map((section) => ({
      section,
      cards: CHEATSHEET_CARDS.filter((c) => c.section === section),
    }));
  }, []);

  async function handlePractice(card: CheatsheetCard) {
    setError(null);
    setLoadingCardId(card.id);
    const questions = await fetchPracticeSet(card);
    setLoadingCardId(null);

    if (questions.length === 0) {
      setError("לא הצלחנו להכין תרגול לנוסחה הזו כרגע. נסו שוב בעוד רגע.");
      return;
    }

    cacheQuestions(questions);
    setPracticeCard(card);
    setPracticeQuestions(questions);
  }

  if (practiceCard && practiceQuestions) {
    return (
      <PracticeSession
        key={practiceQuestions.map((q) => q.id).join(",")}
        questions={practiceQuestions}
        sectionLabel={`תרגול ממוקד · ${practiceCard.title}`}
        onFinish={() => {
          setPracticeCard(null);
          setPracticeQuestions(null);
        }}
      />
    );
  }

  return (
    <>
      <NavBar />
      <main className="mx-auto flex w-full max-w-4xl flex-col gap-8 px-6 py-10">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">גיליון נוסחאות</h1>
          <p className="mt-1 text-muted-foreground">
            כללים ונוסחאות שחוזרים על עצמם — כמותי ואנגלית. לכל כרטיס יש כפתור תרגול ממוקד שמייצר
            שאלות AI מותאמות בדיוק לנושא הזה.
          </p>
        </div>

        {error && <p className="text-sm text-red-600 dark:text-red-400">{error}</p>}

        {cardsBySection.map(({ section, cards }) => (
          <div key={section} className="flex flex-col gap-3">
            <h2 className="text-lg font-semibold">{SECTION_LABELS[section]}</h2>
            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
              {cards.map((card) => (
                <CheatsheetCardView
                  key={card.id}
                  card={card}
                  loading={loadingCardId === card.id}
                  onPractice={() => handlePractice(card)}
                />
              ))}
            </div>
          </div>
        ))}
      </main>
    </>
  );
}
