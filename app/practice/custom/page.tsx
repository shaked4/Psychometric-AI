"use client";

import { useMemo, useState } from "react";
import { Loader2, Sparkles } from "lucide-react";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { NavBar } from "@/components/nav-bar";
import { PracticeSession } from "@/components/practice/practice-session";
import { getAllTopics } from "@/lib/stats";
import type { Question, Section } from "@/types";

type Difficulty = "easy" | "medium" | "hard";

const SECTIONS: { value: Section; label: string }[] = [
  { value: "quant", label: "כמותי" },
  { value: "verbal", label: "מילולי" },
  { value: "english", label: "אנגלית" },
];

const DIFFICULTIES: { value: Difficulty; label: string }[] = [
  { value: "easy", label: "קלה" },
  { value: "medium", label: "בינונית" },
  { value: "hard", label: "קשה" },
];

const SECTION_LABELS: Record<Section, string> = {
  quant: "כמותי",
  verbal: "מילולי",
  english: "אנגלית",
};

export default function CustomPracticePage() {
  const [section, setSection] = useState<Section>("quant");
  const [subtopic, setSubtopic] = useState("");
  const [difficulty, setDifficulty] = useState<Difficulty>("medium");
  const [count, setCount] = useState(5);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [questions, setQuestions] = useState<Question[] | null>(null);

  const subtopicOptions = useMemo(
    () => getAllTopics().filter((t) => t.section === section),
    [section]
  );

  async function handleGenerate() {
    setLoading(true);
    setError(null);
    const match = subtopicOptions.find((t) => t.subtopic === subtopic);

    try {
      const res = await fetch("/api/generate-questions", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          section,
          topic: match?.topic,
          subtopic: match?.subtopic,
          difficulty,
          count,
        }),
      });
      const data = await res.json();
      if (!Array.isArray(data.questions) || data.questions.length === 0) {
        setError("לא הצלחנו ליצור שאלות כרגע. נסו שוב.");
        return;
      }
      setQuestions(data.questions);
    } catch {
      setError("אירעה שגיאה. בדקו את החיבור ונסו שוב.");
    } finally {
      setLoading(false);
    }
  }

  if (questions) {
    return (
      <PracticeSession
        key={questions.map((q) => q.id).join(",")}
        questions={questions}
        sectionLabel={`${SECTION_LABELS[section]} · מותאם אישית`}
        onFinish={() => setQuestions(null)}
      />
    );
  }

  return (
    <>
      <NavBar />
      <main className="mx-auto flex w-full max-w-2xl flex-col gap-8 px-6 py-10">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">תרגול מותאם אישית עם AI</h1>
          <p className="mt-1 text-muted-foreground">
            בחרו קטע, נושא ורמת קושי — ונבנה עבורכם תרגול חדש ומקורי, במקום.
          </p>
        </div>

        <div className="flex flex-col gap-6 rounded-xl border border-border bg-card p-6 shadow-sm">
          <div className="flex flex-col gap-2">
            <span className="text-sm font-medium">קטע</span>
            <div className="flex flex-wrap gap-2">
              {SECTIONS.map((s) => (
                <button
                  key={s.value}
                  type="button"
                  onClick={() => {
                    setSection(s.value);
                    setSubtopic("");
                  }}
                  className={cn(
                    "rounded-full border px-4 py-1.5 text-sm transition",
                    section === s.value
                      ? "border-primary bg-primary text-primary-foreground"
                      : "border-border text-muted-foreground hover:bg-muted"
                  )}
                >
                  {s.label}
                </button>
              ))}
            </div>
          </div>

          <div className="flex flex-col gap-2">
            <label htmlFor="subtopic" className="text-sm font-medium">
              נושא (אופציונלי)
            </label>
            <select
              id="subtopic"
              value={subtopic}
              onChange={(e) => setSubtopic(e.target.value)}
              className="rounded-lg border border-border bg-background px-3 py-2 text-sm outline-none focus:border-primary"
            >
              <option value="">כל הנושאים</option>
              {subtopicOptions.map((t) => (
                <option key={`${t.topic}-${t.subtopic}`} value={t.subtopic}>
                  {t.topic} — {t.subtopic}
                </option>
              ))}
            </select>
          </div>

          <div className="flex flex-col gap-2">
            <span className="text-sm font-medium">רמת קושי</span>
            <div className="flex flex-wrap gap-2">
              {DIFFICULTIES.map((d) => (
                <button
                  key={d.value}
                  type="button"
                  onClick={() => setDifficulty(d.value)}
                  className={cn(
                    "rounded-full border px-4 py-1.5 text-sm transition",
                    difficulty === d.value
                      ? "border-primary bg-primary text-primary-foreground"
                      : "border-border text-muted-foreground hover:bg-muted"
                  )}
                >
                  {d.label}
                </button>
              ))}
            </div>
          </div>

          <div className="flex flex-col gap-2">
            <span className="text-sm font-medium">מספר שאלות</span>
            <div className="flex items-center gap-3">
              <button
                type="button"
                onClick={() => setCount((c) => Math.max(1, c - 1))}
                className="flex size-8 items-center justify-center rounded-full border border-border text-lg text-muted-foreground hover:bg-muted"
                aria-label="הפחת מספר שאלות"
              >
                −
              </button>
              <span dir="ltr" className="w-6 text-center text-base font-medium tabular-nums">
                {count}
              </span>
              <button
                type="button"
                onClick={() => setCount((c) => Math.min(10, c + 1))}
                className="flex size-8 items-center justify-center rounded-full border border-border text-lg text-muted-foreground hover:bg-muted"
                aria-label="הוסף מספר שאלות"
              >
                +
              </button>
            </div>
          </div>

          <Button
            size="lg"
            onClick={handleGenerate}
            disabled={loading}
            className="gap-2 self-start"
          >
            {loading ? <Loader2 className="size-4 animate-spin" /> : <Sparkles className="size-4" />}
            {loading ? "יוצר תרגול..." : "צור אימון מותאם אישית"}
          </Button>

          {error && <p className="text-sm text-red-600 dark:text-red-400">{error}</p>}
        </div>
      </main>
    </>
  );
}
