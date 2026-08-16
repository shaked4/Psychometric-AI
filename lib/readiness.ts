import type { Attempt } from "@/types";
import { computeOverallStats } from "@/lib/stats";

/** Matches the exam simulation's own pacing (20 questions / 20 minutes —
 * see EXAM_DURATION_SECONDS / EXAM_QUESTION_COUNT in app/exam/[section]),
 * so "on pace" here means "on pace for the real test format." */
const TARGET_SECONDS_PER_QUESTION = 60;

export interface ReadinessBreakdown {
  /** 0-100 synthesis of the three components below. */
  index: number;
  accuracyScore: number;
  paceScore: number;
  streakScore: number;
}

const WEIGHTS = {
  accuracy: 0.5,
  pace: 0.3,
  streak: 0.2,
};

/**
 * A single 0-100 "exam readiness" number synthesizing three stats-layer
 * signals — never an LLM guess, always a deterministic function of the
 * attempt log (same principle as lib/stats.ts):
 * - accuracy (50%): overall correct-answer rate.
 * - pace (30%): average time per question against the real exam's pacing.
 * - streak / practice consistency (20%): consecutive practice days, capped
 *   at a 7-day streak.
 */
export function computeReadinessIndex(attempts: Attempt[]): ReadinessBreakdown {
  if (attempts.length === 0) {
    return { index: 0, accuracyScore: 0, paceScore: 0, streakScore: 0 };
  }

  const overall = computeOverallStats(attempts);

  const avgTime = attempts.reduce((sum, a) => sum + a.timeTakenSeconds, 0) / attempts.length;
  const paceScore = Math.max(
    0,
    Math.min(100, Math.round(100 - ((avgTime - TARGET_SECONDS_PER_QUESTION) / TARGET_SECONDS_PER_QUESTION) * 100))
  );

  const streakScore = Math.min(100, Math.round((overall.streakDays / 7) * 100));

  const index = Math.round(
    overall.accuracyPct * WEIGHTS.accuracy + paceScore * WEIGHTS.pace + streakScore * WEIGHTS.streak
  );

  return {
    index: Math.max(0, Math.min(100, index)),
    accuracyScore: overall.accuracyPct,
    paceScore,
    streakScore,
  };
}
