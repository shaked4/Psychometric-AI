import type { Attempt } from "@/types";
import { computeTopicStatsWithGaps, getQuestion, type TopicStatsWithSection } from "@/lib/stats";
import { computeReviewQueue } from "@/lib/spaced-repetition";

/** Below this accuracy, a topic is flagged for reinforcement — matches the
 * threshold the adaptive practice mode (/practice/adaptive) uses to decide
 * whether to inject easier questions for a subtopic. */
export const WEAK_TOPIC_ACCURACY_THRESHOLD = 60;
/** Never flag a topic as "weak" off a couple of unlucky answers — same
 * evidence-required philosophy as lib/stats.ts's getRecommendedTopic(). */
export const MIN_ATTEMPTS_FOR_WEAK_FLAG = 3;

export interface TopicMasteryEntry extends TopicStatsWithSection {
  /** How many questions from this subtopic are currently due (or overdue)
   * in the spaced-repetition queue — see lib/spaced-repetition.ts. */
  dueReviewCount: number;
  /** accuracy < WEAK_TOPIC_ACCURACY_THRESHOLD with enough attempts to trust
   * the number — the signal /practice/adaptive uses to pick reinforcement
   * topics. */
  needsReinforcement: boolean;
}

/**
 * The one place that joins "how am I doing per subtopic" (lib/stats.ts)
 * with "what's due for review per subtopic" (lib/spaced-repetition.ts) —
 * both dashboard's topic mastery cards and /practice/adaptive read this so
 * the two views can never disagree about what counts as due or weak.
 * Everything here is derived fresh from the attempt log, same as its two
 * inputs — no separate stored "mastery" record to drift from what actually
 * happened.
 */
export function computeTopicMasteryMatrix(attempts: Attempt[], now: Date = new Date()): TopicMasteryEntry[] {
  const topicStats = computeTopicStatsWithGaps(attempts);
  const { active } = computeReviewQueue(attempts, now);

  const dueCountByKey = new Map<string, number>();
  for (const item of active) {
    const question = getQuestion(item.questionId);
    if (!question) continue;
    const key = `${question.section}::${question.topic}::${question.subtopic}`;
    dueCountByKey.set(key, (dueCountByKey.get(key) ?? 0) + 1);
  }

  return topicStats.map((topic) => {
    const key = `${topic.section}::${topic.topic}::${topic.subtopic}`;
    return {
      ...topic,
      dueReviewCount: dueCountByKey.get(key) ?? 0,
      needsReinforcement:
        topic.attemptCount >= MIN_ATTEMPTS_FOR_WEAK_FLAG && topic.accuracy < WEAK_TOPIC_ACCURACY_THRESHOLD,
    };
  });
}
