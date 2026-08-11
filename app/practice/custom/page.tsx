"use client";

import { useMemo, useState } from "react";
import { Loader2, Sparkles } from "lucide-react";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { NavBar } from "@/components/nav-bar";
import { PracticeSession } from "@/components/practice/practice-session";
import { getAllTopics } from "@/lib/stats";
import { cacheQuestions } from "@/lib/question-cache";
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

interface GeneratedBatch {
  questions: Question[];
  offline: boolean;
}

async function fetchBatch(
  section: Section,
  topic: string | undefined,
  subtopic: string | undefined,
  difficulty: Difficulty,
  count: number
): Promise<GeneratedBatch | null> {
  const res = await fetch("/api/generate-questions", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ section, topic, subtopic, difficulty, count }),
  });
  const data = await res.json();
  if (!Array.isArray(data.questions) || data.questions.length === 0) return null;
  return { questions: data.questions, offline: data.offline === true };
}

export default function CustomPracticePage() {
  const [section, setSection] = useState<Section>("quant");
  const [subtopic, setSubtopic] = useState("");
  const [difficulty, setDifficulty] = useState<Difficulty>("medium");
  const [count, setCount] = useState(5);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [streamNotice, setStreamNotice] = useState<string | null>(null);

  const [questions, setQuestions] = useState<Question[] | null>(null);
  const [batchLoading, setBatchLoading] = useState(false);
  const [batchNumber, setBatchNumber] = useState(0);
  const [totalServed, setTotalServed] = useState(0);
  // Once a batch comes back offline (mock fallback), the stream stops
  // auto-continuing — otherwise it would loop the same 4 mock questions
  // indefinitely, exactly what this feature is meant to avoid.
  const [streamEnded, setStreamEnded] = useState(false);

  const subtopicOptions = useMemo(
    () => getAllTopics().filter((t) => t.section === section),
    [section]
  );

  function currentTopicMatch() {
    return subtopicOptions.find((t) => t.subtopic === subtopic);
  }

  async function handleGenerate() {
    setLoading(true);
    setError(null);
    setStreamNotice(null);
    const match = currentTopicMatch();

    const batch = await fetchBatch(section, match?.topic, match?.subtopic, difficulty, count);
    setLoading(false);

    if (!batch) {
      setError("לא הצלחנו ליצור שאלות כרגע. נסו שוב.");
      return;
    }

    cacheQuestions(batch.questions);
    setQuestions(batch.questions);
    setBatchNumber(1);
    setTotalServed(batch.questions.length);
    setStreamEnded(batch.offline);
    if (batch.offline) {
      setStreamNotice(
        "לא זיהינו מפתח Claude API פעיל, כך שהוצגו שאלות לדוגמה מתוך בנק השאלות הקבוע במקום זרם AI חי."
      );
    }
  }

  async function handleBatchFinish() {
    if (streamEnded) {
      // Last batch was the offline mock fallback — nothing fresh to stream,
      // so end the session here instead of silently looping mock content.
      setQuestions(null);
      return;
    }

    setBatchLoading(true);
    const match = currentTopicMatch();
    const batch = await fetchBatch(section, match?.topic, match?.subtopic, difficulty, count);
    setBatchLoading(false);

    if (!batch) {
      setQuestions(null);
      setStreamNotice("החיבור לזרם השאלות נקטע. התחילו תרגול חדש כדי להמשיך.");
      return;
    }

    cacheQuestions(batch.questions);
    setQuestions(batch.questions);
    setBatchNumber((n) => n + 1);
    setTotalServed((t) => t + batch.questions.length);
    setStreamEnded(batch.offline);
    if (batch.offline) {
      setStreamNotice(
        "לא זיהינו מפתח Claude API פעיל, כך שהוצגו שאלות לדוגמה מתוך בנק השאלות הקבוע — זו תהיה המנה האחרונה בזרם הנוכחי."
      );
    }
  }

  if (questions && batchLoading) {
    return (
      <div className="flex min-h-screen flex-col items-center justify-center gap-3 px-6 text-center text-muted-foreground">
        <Loader2 className="size-6 animate-spin" />
        <p>יוצרים עבורכם מנה נוספת של שאלות AI טריות...</p>
      </div>
    );
  }

  if (questions) {
    return (
      <PracticeSession
        key={`${batchNumber}-${questions.map((q) => q.id).join(",")}`}
        questions={questions}
        sectionLabel={`${SECTION_LABELS[section]} · תרגול רציף עם AI · מנה ${batchNumber}`}
        onFinish={handleBatchFinish}
      />
    );
  }

  return (
    <>
      <NavBar />
      <main className="mx-auto flex w-full max-w-2xl flex-col gap-8 px-6 py-10">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">תרגול רציף עם AI</h1>
          <p className="mt-1 text-muted-foreground">
            בחרו קטע, נושא ורמת קושי — ה-AI ימשיך לייצר עבורכם שאלות חדשות ומקוריות בזמן אמת,
            מנה אחר מנה, כל עוד תרצו להמשיך.
          </p>
        </div>

        {streamNotice && (
          <div className="rounded-lg border border-amber-500/30 bg-amber-500/10 p-3 text-sm text-amber-700 dark:text-amber-400">
            {streamNotice}
          </div>
        )}

        {totalServed > 0 && (
          <p className="text-sm text-muted-foreground">
            תרגלתם <span className="font-medium text-foreground">{totalServed}</span> שאלות ברצף
            האחרון.
          </p>
        )}

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
            <span className="text-sm font-medium">שאלות במנה</span>
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
            <p className="text-xs text-muted-foreground">
              גודל כל מנה בזרם — הזרם עצמו ממשיך לבקש מנות חדשות אוטומטית עד שתצאו.
            </p>
          </div>

          <Button
            size="lg"
            onClick={handleGenerate}
            disabled={loading}
            className="gap-2 self-start"
          >
            {loading ? <Loader2 className="size-4 animate-spin" /> : <Sparkles className="size-4" />}
            {loading ? "יוצר תרגול..." : "התחילו זרם תרגול AI"}
          </Button>

          {error && <p className="text-sm text-red-600 dark:text-red-400">{error}</p>}
        </div>
      </main>
    </>
  );
}
