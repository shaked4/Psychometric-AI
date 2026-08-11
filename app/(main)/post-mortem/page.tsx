"use client";

import { useMemo, useState } from "react";
import { useAttempts } from "@/lib/use-attempts";
import { computePostMortemStats, getQualifyingAttempts } from "@/lib/post-mortem";
import { ErrorBreakdownCard } from "@/components/post-mortem/error-breakdown-card";
import { TimeLossWarningsCard } from "@/components/post-mortem/time-loss-warnings-card";
import { AnalysisPanel, type AnalysisState } from "@/components/post-mortem/analysis-panel";
import { MistakeReviewList } from "@/components/post-mortem/mistake-review-list";

function StatBox({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-xl border border-border bg-card p-5 text-center shadow-sm">
      <p className="text-3xl font-bold tracking-tight text-card-foreground">{value}</p>
      <p className="mt-1 text-sm text-muted-foreground">{label}</p>
    </div>
  );
}

export default function PostMortemPage() {
  const attempts = useAttempts();
  const stats = useMemo(() => computePostMortemStats(attempts), [attempts]);
  const qualifying = useMemo(
    () =>
      [...getQualifyingAttempts(attempts)].sort(
        (a, b) => new Date(b.attempt.createdAt).getTime() - new Date(a.attempt.createdAt).getTime()
      ),
    [attempts]
  );

  const [analysisState, setAnalysisState] = useState<AnalysisState>({ kind: "idle" });

  async function runAnalysis() {
    setAnalysisState({ kind: "loading" });
    try {
      const res = await fetch("/api/analyze-mistakes", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ stats }),
      });
      const data = await res.json();
      if (data.insufficientData) {
        setAnalysisState({ kind: "insufficient" });
        return;
      }
      if (!data.analysis) {
        setAnalysisState({ kind: "error" });
        return;
      }
      setAnalysisState({ kind: "ready", analysis: data.analysis, offline: data.offline === true });
    } catch {
      setAnalysisState({ kind: "error" });
    }
  }

  return (
    <main className="mx-auto flex w-full max-w-3xl flex-col gap-6 px-6 py-10">
      <div>
        <h1 className="text-2xl font-bold tracking-tight">תחקור מעמיק</h1>
        <p className="mt-1 text-muted-foreground">
          כל שאלה שטעיתם בה, או שלקחה לכם זמן — עם תיוג סיבת הטעות ותובנות AI על הדפוסים שלכם.
        </p>
      </div>

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
        <StatBox label="טעויות" value={String(stats.totalIncorrect)} />
        <StatBox label="מתויגות" value={String(stats.totalTagged)} />
        <StatBox label="שאלות איטיות" value={String(stats.totalQualifying - stats.totalIncorrect)} />
      </div>

      <ErrorBreakdownCard breakdown={stats.overallTagBreakdown} totalTagged={stats.totalTagged} />
      <TimeLossWarningsCard warnings={stats.timeLossWarnings} />
      <AnalysisPanel state={analysisState} onRun={runAnalysis} />

      <div>
        <h2 className="mb-3 text-lg font-semibold">שאלות לתחקור</h2>
        <MistakeReviewList items={qualifying} />
      </div>
    </main>
  );
}
