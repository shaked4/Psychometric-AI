import type { Attempt } from "@/types";
import { computeOverallStats } from "@/lib/stats";
import { computeReviewQueue } from "@/lib/spaced-repetition";

/** Matches the exam simulation's own pacing (20 questions / 20 minutes —
 * see EXAM_DURATION_SECONDS / EXAM_QUESTION_COUNT in app/exam/[section]),
 * so "on pace" here means "on pace for the real test format." */
const TARGET_SECONDS_PER_QUESTION = 60;

export interface ReadinessBreakdown {
  /** 0-100 synthesis of the four components below. */
  index: number;
  accuracyScore: number;
  paceScore: number;
  streakScore: number;
  reviewMasteryScore: number;
}

const WEIGHTS = {
  accuracy: 0.4,
  pace: 0.2,
  streak: 0.15,
  reviewMastery: 0.25,
};

/**
 * A single 0-100 "exam readiness" number synthesizing four stats-layer
 * signals — never an LLM guess, always a deterministic function of the
 * attempt log (same principle as lib/stats.ts):
 * - accuracy (40%): overall correct-answer rate.
 * - pace (20%): average time per question against the real exam's pacing.
 * - streak (15%): consecutive practice days, capped at a 7-day streak.
 * - review mastery (25%): of every question ever gotten wrong or flagged,
 *   the fraction since graduated out of the spaced-repetition queue (see
 *   lib/spaced-repetition.ts) — rewards actually fixing past mistakes, not
 *   just accumulating new correct answers elsewhere.
 */
export function computeReadinessIndex(attempts: Attempt[]): ReadinessBreakdown {
  if (attempts.length === 0) {
    return { index: 0, accuracyScore: 0, paceScore: 0, streakScore: 0, reviewMasteryScore: 0 };
  }

  const overall = computeOverallStats(attempts);

  const avgTime = attempts.reduce((sum, a) => sum + a.timeTakenSeconds, 0) / attempts.length;
  const paceScore = Math.max(
    0,
    Math.min(100, Math.round(100 - ((avgTime - TARGET_SECONDS_PER_QUESTION) / TARGET_SECONDS_PER_QUESTION) * 100))
  );

  const streakScore = Math.min(100, Math.round((overall.streakDays / 7) * 100));

  const { masteredQuestionIds, everEnteredQuestionIds } = computeReviewQueue(attempts);
  const reviewMasteryScore =
    everEnteredQuestionIds.length === 0
      ? 100
      : Math.round((masteredQuestionIds.length / everEnteredQuestionIds.length) * 100);

  const index = Math.round(
    overall.accuracyPct * WEIGHTS.accuracy +
      paceScore * WEIGHTS.pace +
      streakScore * WEIGHTS.streak +
      reviewMasteryScore * WEIGHTS.reviewMastery
  );

  return {
    index: Math.max(0, Math.min(100, index)),
    accuracyScore: overall.accuracyPct,
    paceScore,
    streakScore,
    reviewMasteryScore,
  };
}
