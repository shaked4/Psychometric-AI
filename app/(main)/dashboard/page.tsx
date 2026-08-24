"use client";

import { useAttempts } from "@/lib/use-attempts";
import { useExamHistory } from "@/lib/use-exam-history";
import { useEssayAttempts } from "@/lib/use-essay-attempts";
import { computeErrorInsights, computeOverallStats, getRecommendedTopic } from "@/lib/stats";
import { computeReviewQueue } from "@/lib/spaced-repetition";
import { computeTopicMasteryMatrix } from "@/lib/mastery";
import { computeReadinessIndex } from "@/lib/readiness";
import { computePostMortemStats } from "@/lib/post-mortem";
import { computeTodayProgress } from "@/lib/daily-goal";
import { OverviewHeader } from "@/components/dashboard/overview-header";
import { DailyGoalCard } from "@/components/dashboard/daily-goal-card";
import { TopicMasteryCard } from "@/components/dashboard/topic-mastery-card";
import { InsightsCard } from "@/components/dashboard/insights-card";
import { RecommendedPracticeCard } from "@/components/dashboard/recommended-practice-card";
import { ReadinessIndexCard } from "@/components/dashboard/readiness-index-card";
import { ReviewQueueCard } from "@/components/dashboard/review-queue-card";
import { AdaptivePracticeCard } from "@/components/dashboard/adaptive-practice-card";
import { PostMortemCard } from "@/components/dashboard/post-mortem-card";
import { ScoreProgressionChart } from "@/components/dashboard/score-progression-chart";
import { TopicBreakdownTable } from "@/components/dashboard/topic-breakdown-table";
import type { Section } from "@/types";

const SECTIONS: Section[] = ["quant", "verbal", "english"];

export default function DashboardPage() {
  // useSyncExternalStore matches server-rendered output (empty) on the
  // first client render, then reacts whenever recordAttempt() writes.
  const attempts = useAttempts();
  const examHistory = useExamHistory();
  const essayAttempts = useEssayAttempts();

  const overall = computeOverallStats(attempts);
  const todayProgress = computeTodayProgress(attempts, essayAttempts);
  const masteryMatrix = computeTopicMasteryMatrix(attempts);
  const insights = computeErrorInsights(attempts);
  const recommended = getRecommendedTopic(masteryMatrix);
  const readiness = computeReadinessIndex(attempts);
  const reviewQueue = computeReviewQueue(attempts);
  const postMortem = computePostMortemStats(attempts);
  const weakTopicCount = masteryMatrix.filter((t) => t.needsReinforcement).length;

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
        avgTimeSeconds={overall.avgTimeSeconds}
      />

      <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
        <DailyGoalCard
          questionsToday={todayProgress.questionsToday}
          essaysToday={todayProgress.essaysToday}
          streakDays={overall.streakDays}
        />

        <ReadinessIndexCard breakdown={readiness} hasAttempts={overall.totalAnswered > 0} />
      </div>

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
        <RecommendedPracticeCard
          section={recommended?.section ?? null}
          topic={recommended?.topic ?? null}
          accuracy={recommended?.accuracy ?? null}
        />

        <ReviewQueueCard dueCount={reviewQueue.dueToday.length} />

        <AdaptivePracticeCard weakTopicCount={weakTopicCount} dueReviewCount={reviewQueue.dueToday.length} />

        <PostMortemCard totalIncorrect={postMortem.totalIncorrect} totalTagged={postMortem.totalTagged} />
      </div>

      <div>
        <h2 className="mb-3 text-lg font-semibold">מגמת ציונים בסימולציות</h2>
        <ScoreProgressionChart entries={examHistory} />
      </div>

      <div>
        <h2 className="mb-3 text-lg font-semibold">פירוט ביצועים לפי נושא</h2>
        <TopicBreakdownTable topics={masteryMatrix} />
      </div>

      <div>
        <h2 className="mb-3 text-lg font-semibold">מיפוי שליטה בנושאים</h2>
        <div className="grid grid-cols-1 gap-4 md:grid-cols-3">
          {SECTIONS.map((section) => (
            <TopicMasteryCard
              key={section}
              section={section}
              topics={masteryMatrix.filter((t) => t.section === section)}
            />
          ))}
        </div>
      </div>

      <InsightsCard insights={insights} />
    </main>
  );
}
