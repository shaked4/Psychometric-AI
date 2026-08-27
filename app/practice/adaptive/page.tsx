"use client";

import { useMemo, useState } from "react";
import Link from "next/link";
import { Loader2, PartyPopper, Sparkles, TrendingDown } from "lucide-react";
import { NavBar } from "@/components/nav-bar";
import { PracticeSession } from "@/components/practice/practice-session";
import { Button, buttonVariants } from "@/components/ui/button";
import { useAttempts } from "@/lib/use-attempts";
import { computeReviewQueue } from "@/lib/spaced-repetition";
import { computeTopicMasteryMatrix } from "@/lib/mastery";
import { getQuestion, SECTION_LABELS } from "@/lib/stats";
import { cacheQuestions } from "@/lib/question-cache";
import type { Question } from "@/types";

/** How many distinct weak subtopics get a freshly-generated reinforcement
 * question injected per session — capped so starting a session never fires
 * a large fan-out of Claude calls. */
const MAX_REINFORCEMENT_TOPICS = 3;

type WeakTopicWithBodies = ReturnType<typeof computeTopicMasteryMatrix>[number] & { recentBodies: string[] };

async function fetchReinforcementQuestion(topic: WeakTopicWithBodies): Promise<Question | null> {
  try {
    const res = await fetch("/api/generate-question", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        section: topic.section,
        topic: topic.topic,
        subtopic: topic.subtopic,
        difficulty: "adaptive",
        recentAccuracyPct: topic.accuracy,
        excludeQuestionTexts: topic.recentBodies,
      }),
    });
    const data = await res.json();
    return data.question ?? null;
  } catch {
    return null;
  }
}

export default function AdaptivePracticePage() {
  const attempts = useAttempts();
  const [started, setStarted] = useState(false);
  const [loadingReinforcement, setLoadingReinforcement] = useState(false);
  const [sessionQuestions, setSessionQuestions] = useState<Question[] | null>(null);

  const masteryMatrix = useMemo(() => computeTopicMasteryMatrix(attempts), [attempts]);
  // Adaptive practice is scoped to the core psychometric pair (quant/verbal)
  // now that English lives under its own explicit AmiraNet track
  // (/practice/english) — it should never surface here automatically.
  const weakTopics = useMemo(
    () =>
      masteryMatrix
        .filter((t) => t.needsReinforcement && t.section !== "english")
        .slice(0, MAX_REINFORCEMENT_TOPICS),
    [masteryMatrix]
  );

  const dueQuestions = useMemo(() => {
    const { dueToday } = computeReviewQueue(attempts);
    return dueToday
      .map((item) => getQuestion(item.questionId))
      .filter((q): q is Question => q !== undefined && q.section !== "english");
  }, [attempts]);

  const hasWork = dueQuestions.length > 0 || weakTopics.length > 0;

  async function handleStart() {
    setLoadingReinforcement(true);

    const weakTopicsWithBodies: WeakTopicWithBodies[] = weakTopics.map((t) => {
      const bodiesForTopic = attempts
        .map((a) => getQuestion(a.questionId))
        .filter((q): q is Question => q !== undefined && q.section === t.section && q.topic === t.topic && q.subtopic === t.subtopic)
        .map((q) => q.body)
        .slice(0, 8);
      return { ...t, recentBodies: bodiesForTopic };
    });

    const reinforcementResults = await Promise.all(weakTopicsWithBodies.map(fetchReinforcementQuestion));
    const reinforcementQuestions = reinforcementResults.filter((q): q is Question => q !== null);

    if (reinforcementQuestions.length > 0) cacheQuestions(reinforcementQuestions);

    setSessionQuestions([...dueQuestions, ...reinforcementQuestions]);
    setLoadingReinforcement(false);
    setStarted(true);
  }

  if (started && sessionQuestions && sessionQuestions.length > 0) {
    return (
      <PracticeSession
        key={sessionQuestions.map((q) => q.id).join(",")}
        questions={sessionQuestions}
        sectionLabel="תרגול אדפטיבי"
        onFinish={() => {
          setStarted(false);
          setSessionQuestions(null);
        }}
      />
    );
  }

  return (
    <>
      <NavBar />
      <main className="mx-auto flex w-full max-w-2xl flex-col gap-8 px-6 py-10">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">תרגול אדפטיבי</h1>
          <p className="mt-1 text-muted-foreground">
            שילוב של שאלות שממתינות לחזרה מרווחת עם שאלות AI טריות ברמת קושי מותאמת, שנוצרות במיוחד
            עבור הנושאים שבהם הדיוק שלכם נמוך מ-60%.
          </p>
        </div>

        {!hasWork ? (
          <div className="flex flex-col items-center gap-3 rounded-xl border border-dashed border-border p-10 text-center">
            <PartyPopper className="size-8 text-primary" />
            <p className="text-base font-medium text-foreground">אין כרגע שאלות לחזרה או נושאים חלשים</p>
            <p className="max-w-sm text-sm text-muted-foreground">
              המשיכו לתרגל — ברגע שתטעו בשאלה או שהדיוק בנושא מסוים ירד מתחת ל-60%, התרגול האדפטיבי
              יתמלא אוטומטית.
            </p>
            <Link href="/dashboard" className={buttonVariants({ variant: "outline" })}>
              ללוח הבקרה
            </Link>
          </div>
        ) : (
          <div className="flex flex-col gap-4 rounded-xl border border-primary/30 bg-primary/5 p-6 shadow-sm">
            <div className="flex items-center gap-3">
              <Sparkles className="size-6 text-primary" />
              <div className="flex flex-1 items-center justify-between">
                <span className="text-sm font-medium">שאלות לחזרה מרווחת היום</span>
                <span className="text-2xl font-bold tabular-nums">{dueQuestions.length}</span>
              </div>
            </div>

            {weakTopics.length > 0 && (
              <div className="flex flex-col gap-2 border-t border-border pt-4">
                <div className="flex items-center gap-1.5 text-sm font-medium text-amber-700 dark:text-amber-400">
                  <TrendingDown className="size-4" />
                  נושאים לחיזוק (דיוק מתחת ל-60%)
                </div>
                <div className="flex flex-wrap gap-2">
                  {weakTopics.map((t) => (
                    <span
                      key={`${t.section}-${t.subtopic}`}
                      className="rounded-full bg-amber-500/10 px-3 py-1 text-xs text-amber-700 dark:text-amber-400"
                    >
                      {SECTION_LABELS[t.section]} · {t.subtopic} ({t.accuracy}%)
                    </span>
                  ))}
                </div>
              </div>
            )}

            <Button size="lg" onClick={handleStart} disabled={loadingReinforcement} className="gap-2">
              {loadingReinforcement ? <Loader2 className="size-4 animate-spin" /> : <Sparkles className="size-4" />}
              {loadingReinforcement ? "מכינים שאלות מותאמות..." : "התחילו תרגול אדפטיבי"}
            </Button>
          </div>
        )}
      </main>
    </>
  );
}
