import { MOCK_QUESTIONS } from "@/lib/mock-data";
import type { Attempt, Section, SelfReportedError, TopicStats } from "@/types";

const QUESTIONS_BY_ID = new Map(MOCK_QUESTIONS.map((q) => [q.id, q]));

export const ERROR_REASON_LABELS: Record<SelfReportedError, string> = {
  careless: "שגיאות תשומת לב",
  didnt_know: "חוסר ידע בחומר",
  ran_out_of_time: "לחץ זמן",
};

export const SECTION_LABELS: Record<Section, string> = {
  quant: "כמותי",
  verbal: "מילולי",
  english: "אנגלית",
};

export interface TopicStatsWithSection extends TopicStats {
  section: Section;
}

export type StrengthLevel = "high" | "medium" | "low" | "none";

export function getStrengthLevel(accuracy: number, attemptCount: number): StrengthLevel {
  if (attemptCount === 0) return "none";
  if (accuracy >= 80) return "high";
  if (accuracy >= 50) return "medium";
  return "low";
}

/** Every (section, topic, subtopic) that exists in the question bank, so the
 * dashboard can show "not practiced yet" instead of silently omitting topics
 * with zero attempts. */
export function getAllTopics(): { section: Section; topic: string; subtopic: string }[] {
  const seen = new Set<string>();
  const result: { section: Section; topic: string; subtopic: string }[] = [];
  for (const q of MOCK_QUESTIONS) {
    const key = `${q.section}::${q.topic}::${q.subtopic}`;
    if (seen.has(key)) continue;
    seen.add(key);
    result.push({ section: q.section, topic: q.topic, subtopic: q.subtopic });
  }
  return result;
}

/** Per-(topic, subtopic) accuracy/time, derived fresh from the attempt log
 * every time — never cached, so it can never drift from what actually
 * happened (see the stats-layer note in lib/storage.ts). */
export function computeTopicStats(attempts: Attempt[]): TopicStatsWithSection[] {
  const groups = new Map<string, Attempt[]>();

  for (const attempt of attempts) {
    const question = QUESTIONS_BY_ID.get(attempt.questionId);
    if (!question) continue;
    const key = `${question.section}::${question.topic}::${question.subtopic}`;
    const list = groups.get(key) ?? [];
    list.push(attempt);
    groups.set(key, list);
  }

  const stats: TopicStatsWithSection[] = [];
  for (const [key, list] of groups) {
    const [section, topic, subtopic] = key.split("::") as [Section, string, string];
    const correct = list.filter((a) => a.isCorrect).length;
    const avgTime = list.reduce((sum, a) => sum + a.timeTakenSeconds, 0) / list.length;
    stats.push({
      section,
      topic,
      subtopic,
      accuracy: Math.round((correct / list.length) * 100),
      avgTimeSeconds: Math.round(avgTime),
      timedVsUntimedDelta: null,
      attemptCount: list.length,
    });
  }
  return stats;
}

/** Merges real stats onto the full topic taxonomy so untouched topics show
 * up as "not practiced yet" rather than being omitted entirely. */
export function computeTopicStatsWithGaps(attempts: Attempt[]): TopicStatsWithSection[] {
  const real = computeTopicStats(attempts);
  const byKey = new Map(real.map((s) => [`${s.section}::${s.topic}::${s.subtopic}`, s]));

  return getAllTopics().map(({ section, topic, subtopic }) => {
    const key = `${section}::${topic}::${subtopic}`;
    return (
      byKey.get(key) ?? {
        section,
        topic,
        subtopic,
        accuracy: 0,
        avgTimeSeconds: 0,
        timedVsUntimedDelta: null,
        attemptCount: 0,
      }
    );
  });
}

export interface OverallStats {
  totalAnswered: number;
  accuracyPct: number;
  streakDays: number;
}

function toDateKey(iso: string) {
  const d = new Date(iso);
  return `${d.getFullYear()}-${d.getMonth()}-${d.getDate()}`;
}

/** Consecutive days (ending today or yesterday) with at least one attempt. */
export function computeStreak(attempts: Attempt[]): number {
  if (attempts.length === 0) return 0;

  const days = new Set(attempts.map((a) => toDateKey(a.createdAt)));
  const cursor = new Date();
  let streak = 0;

  while (days.has(toDateKey(cursor.toISOString()))) {
    streak += 1;
    cursor.setDate(cursor.getDate() - 1);
  }

  return streak;
}

export function computeOverallStats(attempts: Attempt[]): OverallStats {
  const totalAnswered = attempts.length;
  const correct = attempts.filter((a) => a.isCorrect).length;
  return {
    totalAnswered,
    accuracyPct: totalAnswered === 0 ? 0 : Math.round((correct / totalAnswered) * 100),
    streakDays: computeStreak(attempts),
  };
}

export interface ErrorInsight {
  section: Section;
  topic: string;
  dominantReason: SelfReportedError;
  pct: number;
  sampleSize: number;
}

const MIN_INSIGHT_SAMPLE = 2;

/** Finds, per topic, the most common self-reported reason behind wrong
 * answers — but only once there's enough data to say something meaningful.
 * This is template text over real numbers, not an LLM call; it's the
 * narrative layer's job (once wired to the Claude API) to phrase this more
 * naturally, never to invent the underlying claim. */
export function computeErrorInsights(attempts: Attempt[]): ErrorInsight[] {
  const incorrectByTopic = new Map<string, Attempt[]>();

  for (const attempt of attempts) {
    if (attempt.isCorrect || !attempt.selfReportedError) continue;
    const question = QUESTIONS_BY_ID.get(attempt.questionId);
    if (!question) continue;
    const key = `${question.section}::${question.topic}`;
    const list = incorrectByTopic.get(key) ?? [];
    list.push(attempt);
    incorrectByTopic.set(key, list);
  }

  const insights: ErrorInsight[] = [];
  for (const [key, list] of incorrectByTopic) {
    if (list.length < MIN_INSIGHT_SAMPLE) continue;
    const [section, topic] = key.split("::") as [Section, string];

    const counts = new Map<SelfReportedError, number>();
    for (const a of list) {
      const reason = a.selfReportedError as SelfReportedError;
      counts.set(reason, (counts.get(reason) ?? 0) + 1);
    }

    let dominantReason: SelfReportedError = "careless";
    let max = 0;
    for (const [reason, count] of counts) {
      if (count > max) {
        max = count;
        dominantReason = reason;
      }
    }

    insights.push({ section, topic, dominantReason, pct: Math.round((max / list.length) * 100), sampleSize: list.length });
  }

  return insights.sort((a, b) => b.pct - a.pct);
}

/** The weakest topic among ones the student has actually attempted — never
 * a topic with zero data, since "weak" is a claim that requires evidence. */
export function getRecommendedTopic(topicStats: TopicStatsWithSection[]): TopicStatsWithSection | null {
  const attempted = topicStats.filter((t) => t.attemptCount > 0);
  if (attempted.length === 0) return null;
  return [...attempted].sort((a, b) => a.accuracy - b.accuracy)[0];
}
