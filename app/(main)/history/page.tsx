"use client";

import { useMemo, useState } from "react";
import { useAttempts } from "@/lib/use-attempts";
import { getQuestion } from "@/lib/stats";
import { HistoryAttemptCard } from "@/components/history/history-attempt-card";
import { cn } from "@/lib/utils";
import type { Section } from "@/types";

type HistoryFilter = "all" | "incorrect" | Section;

const FILTERS: { value: HistoryFilter; label: string }[] = [
  { value: "all", label: "הכל" },
  { value: "incorrect", label: "רק שגויות" },
  { value: "quant", label: "כמותי" },
  { value: "verbal", label: "מילולי" },
  { value: "english", label: "אנגלית" },
];

export default function HistoryPage() {
  const attempts = useAttempts();
  const [filter, setFilter] = useState<HistoryFilter>("all");

  const rows = useMemo(() => {
    const withQuestions = attempts.flatMap((attempt) => {
      const question = getQuestion(attempt.questionId);
      return question ? [{ attempt, question }] : [];
    });

    const filtered = withQuestions.filter(({ attempt, question }) => {
      if (filter === "all") return true;
      if (filter === "incorrect") return !attempt.isCorrect;
      return question.section === filter;
    });

    return filtered.sort(
      (a, b) => new Date(b.attempt.createdAt).getTime() - new Date(a.attempt.createdAt).getTime()
    );
  }, [attempts, filter]);

  return (
    <main className="mx-auto flex w-full max-w-3xl flex-col gap-6 px-6 pb-10 pt-14">
      <div>
        <h1 className="text-2xl font-bold tracking-tight">תחקור שאלות</h1>
        <p className="mt-1 text-muted-foreground">
          כל השאלות שתרגלתם, עם התשובות, הזמן שלקח, וההסברים.
        </p>
      </div>

      <div className="flex flex-wrap gap-2">
        {FILTERS.map((f) => (
          <button
            key={f.value}
            type="button"
            onClick={() => setFilter(f.value)}
            className={cn(
              "rounded-full border px-4 py-1.5 text-sm transition",
              filter === f.value
                ? "border-primary bg-primary text-primary-foreground"
                : "border-border text-muted-foreground hover:bg-muted"
            )}
          >
            {f.label}
          </button>
        ))}
      </div>

      {rows.length === 0 ? (
        <div className="rounded-xl border border-dashed border-border p-10 text-center text-muted-foreground">
          עדיין אין שאלות שמתאימות לסינון הזה. התחילו לתרגל כדי לראות כאן היסטוריה.
        </div>
      ) : (
        <div className="flex flex-col gap-4">
          {rows.map(({ attempt, question }) => (
            <HistoryAttemptCard key={attempt.id} attempt={attempt} question={question} />
          ))}
        </div>
      )}
    </main>
  );
}
