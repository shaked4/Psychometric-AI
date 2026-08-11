import type { Attempt, Question, Section, SelfReportedError } from "@/types";
import { getQuestion } from "@/lib/stats";

/** Above this, an answer counts as "slow" for post-mortem purposes, even if
 * correct — matches the dashboard's time-sink notion (see
 * TIME_SINK_THRESHOLD_SECONDS in components/dashboard/topic-breakdown-table.tsx
 * and TARGET_SECONDS_PER_QUESTION in lib/readiness.ts), kept as its own
 * constant since "worth a post-mortem look" is a related but distinct
 * question from "is this topic a time-sink on average." */
export const SLOW_ANSWER_THRESHOLD_SECONDS = 90;

export interface QualifyingAttempt {
  attempt: Attempt;
  question: Question;
  /** True when timeTakenSeconds exceeds the threshold, regardless of
   * correctness — a slow correct answer still qualifies for review. */
  isSlow: boolean;
}

/**
 * Every attempt worth a post-mortem look: wrong, or slow even if correct.
 * Pure and derived straight from the attempt log — same stats-layer
 * principle as lib/stats.ts and lib/spaced-repetition.ts, no separate
 * mutable "needs review" store to drift out of sync.
 */
export function getQualifyingAttempts(attempts: Attempt[]): QualifyingAttempt[] {
  return attempts.flatMap((attempt) => {
    const question = getQuestion(attempt.questionId);
    if (!question) return [];

    const isSlow = attempt.timeTakenSeconds > SLOW_ANSWER_THRESHOLD_SECONDS;
    if (attempt.isCorrect && !isSlow) return [];

    return [{ attempt, question, isSlow }];
  });
}

export interface TagBreakdownEntry {
  tag: SelfReportedError;
  count: number;
  pct: number;
}

export interface TopicErrorProfile {
  section: Section;
  topic: string;
  incorrectCount: number;
  taggedCount: number;
  avgTimeOnIncorrectSeconds: number;
  dominantTag: SelfReportedError | null;
  dominantPct: number;
  tagBreakdown: TagBreakdownEntry[];
}

export interface TimeLossWarning {
  section: Section;
  topic: string;
  avgTimeSeconds: number;
  slowCount: number;
}

export interface PostMortemStats {
  totalQualifying: number;
  totalIncorrect: number;
  totalTagged: number;
  topicProfiles: TopicErrorProfile[];
  timeLossWarnings: TimeLossWarning[];
  overallTagBreakdown: TagBreakdownEntry[];
}

export interface MistakeAnalysis {
  summary: string;
  recurringPatterns: { topic: string; insight: string }[];
  timeLossWarnings: string[];
  actionItems: string[];
}

/** Below this many tagged mistakes, there isn't enough signal for a
 * meaningful analysis (AI or template) — see app/api/analyze-mistakes. */
export const MIN_TAGGED_FOR_ANALYSIS = 3;

const MIN_TOPIC_SAMPLE = 2;

function buildTagBreakdown(items: QualifyingAttempt[]): TagBreakdownEntry[] {
  const counts = new Map<SelfReportedError, number>();
  for (const item of items) {
    if (!item.attempt.selfReportedError) continue;
    const tag = item.attempt.selfReportedError;
    counts.set(tag, (counts.get(tag) ?? 0) + 1);
  }
  const taggedCount = [...counts.values()].reduce((sum, c) => sum + c, 0);
  return [...counts.entries()]
    .map(([tag, count]) => ({ tag, count, pct: taggedCount ? Math.round((count / taggedCount) * 100) : 0 }))
    .sort((a, b) => b.count - a.count);
}

/** Deterministic error-pattern stats over the full attempt log — the sole
 * grounding data passed to /api/analyze-mistakes (see lib/post-mortem.ts's
 * MistakeAnalysis and the CLAUDE.md stats/narrative-layer principle: the
 * numbers here are truth, the AI only narrates them). */
export function computePostMortemStats(attempts: Attempt[]): PostMortemStats {
  const qualifying = getQualifyingAttempts(attempts);
  const incorrect = qualifying.filter((q) => !q.attempt.isCorrect);
  const tagged = incorrect.filter((q) => q.attempt.selfReportedError !== null);

  const incorrectByTopic = new Map<string, QualifyingAttempt[]>();
  for (const item of incorrect) {
    const key = `${item.question.section}::${item.question.topic}`;
    const list = incorrectByTopic.get(key) ?? [];
    list.push(item);
    incorrectByTopic.set(key, list);
  }

  const topicProfiles: TopicErrorProfile[] = [];
  for (const [key, list] of incorrectByTopic) {
    if (list.length < MIN_TOPIC_SAMPLE) continue;
    const [section, topic] = key.split("::") as [Section, string];
    const tagBreakdown = buildTagBreakdown(list);
    const avgTime = list.reduce((sum, q) => sum + q.attempt.timeTakenSeconds, 0) / list.length;

    topicProfiles.push({
      section,
      topic,
      incorrectCount: list.length,
      taggedCount: list.filter((q) => q.attempt.selfReportedError !== null).length,
      avgTimeOnIncorrectSeconds: Math.round(avgTime),
      dominantTag: tagBreakdown[0]?.tag ?? null,
      dominantPct: tagBreakdown[0]?.pct ?? 0,
      tagBreakdown,
    });
  }
  topicProfiles.sort((a, b) => b.incorrectCount - a.incorrectCount);

  const byTopicAll = new Map<string, QualifyingAttempt[]>();
  for (const item of qualifying) {
    const key = `${item.question.section}::${item.question.topic}`;
    const list = byTopicAll.get(key) ?? [];
    list.push(item);
    byTopicAll.set(key, list);
  }

  const timeLossWarnings: TimeLossWarning[] = [];
  for (const [key, list] of byTopicAll) {
    if (list.length < MIN_TOPIC_SAMPLE) continue;
    const [section, topic] = key.split("::") as [Section, string];
    const avgTime = list.reduce((sum, q) => sum + q.attempt.timeTakenSeconds, 0) / list.length;
    if (avgTime > SLOW_ANSWER_THRESHOLD_SECONDS) {
      timeLossWarnings.push({ section, topic, avgTimeSeconds: Math.round(avgTime), slowCount: list.length });
    }
  }
  timeLossWarnings.sort((a, b) => b.avgTimeSeconds - a.avgTimeSeconds);

  return {
    totalQualifying: qualifying.length,
    totalIncorrect: incorrect.length,
    totalTagged: tagged.length,
    topicProfiles,
    timeLossWarnings,
    overallTagBreakdown: buildTagBreakdown(incorrect),
  };
}
