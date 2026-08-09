"use client";

import { useAttempts } from "@/lib/use-attempts";
import {
  computeErrorInsights,
  computeOverallStats,
  computeTopicStatsWithGaps,
  getRecommendedTopic,
} from "@/lib/stats";
import { OverviewHeader } from "@/components/dashboard/overview-header";
import { TopicMasteryCard } from "@/components/dashboard/topic-mastery-card";
import { InsightsCard } from "@/components/dashboard/insights-card";
import { RecommendedPracticeCard } from "@/components/dashboard/recommended-practice-card";
import type { Section } from "@/types";

const SECTIONS: Section[] = ["quant", "verbal", "english"];

export default function DashboardPage() {
  // useSyncExternalStore matches server-rendered output (empty) on the
  // first client render, then reacts whenever recordAttempt() writes.
  const attempts = useAttempts();

  const overall = computeOverallStats(attempts);
  const topicStats = computeTopicStatsWithGaps(attempts);
  const insights = computeErrorInsights(attempts);
  const recommended = getRecommendedTopic(topicStats);

  return (
    <main className="mx-auto flex w-full max-w-5xl flex-col gap-6 px-6 py-10">
      <div>
        <h1 className="text-2xl font-bold tracking-tight">לוח הבקרה שלי</h1>
        <p className="mt-1 text-muted-foreground">
          התקדמות, נקודות חוזק וההמלצה הבאה שלכם.
        </p>
      </div>

      <OverviewHeader
        totalAnswered={overall.totalAnswered}
        accuracyPct={overall.accuracyPct}
        streakDays={overall.streakDays}
      />

      <RecommendedPracticeCard
        section={recommended?.section ?? null}
        topic={recommended?.topic ?? null}
        accuracy={recommended?.accuracy ?? null}
      />

      <div>
        <h2 className="mb-3 text-lg font-semibold">מיפוי שליטה בנושאים</h2>
        <div className="grid grid-cols-1 gap-4 md:grid-cols-3">
          {SECTIONS.map((section) => (
            <TopicMasteryCard
              key={section}
              section={section}
              topics={topicStats.filter((t) => t.section === section)}
            />
          ))}
        </div>
      </div>

      <InsightsCard insights={insights} />
    </main>
  );
}
