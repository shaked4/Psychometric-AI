import type { Attempt } from "@/types";

/** First review is 1 day after a mistake; each correct, unflagged retry
 * advances to the next interval; passing the last interval correctly
 * graduates the question out of the queue entirely. */
export const REVIEW_INTERVALS_DAYS = [1, 3, 7];

const DAY_MS = 24 * 60 * 60 * 1000;

export interface ReviewQueueItem {
  questionId: string;
  /** Index into REVIEW_INTERVALS_DAYS — which interval this question is
   * currently waiting out. */
  stage: number;
  dueAt: string;
  lastAttemptAt: string;
  lastCorrect: boolean;
}

export interface ReviewQueueResult {
  /** Every question still cycling through the intervals (not yet mastered). */
  active: ReviewQueueItem[];
  /** Subset of `active` whose dueAt has already passed — what "חזרה מרווחת"
   * surfaces today. */
  dueToday: ReviewQueueItem[];
  /** Questions that graduated past the last interval by answering correctly
   * without a fresh mistake resetting them first. */
  masteredQuestionIds: string[];
  /** Every question that was ever wrong or flagged at least once
   * (active ∪ mastered) — the denominator for "review mastery" metrics. */
  everEnteredQuestionIds: string[];
}

/**
 * Derives the full spaced-repetition state purely from the attempt log —
 * there is no separate mutable schedule store, so this can never drift from
 * what the student actually did (same stats-layer principle as
 * lib/stats.ts). For each question, its attempts are replayed in
 * chronological order: a wrong answer or a flagged attempt resets it to the
 * first interval ("retry history" starts over), while a correct, unflagged
 * answer while already in the queue advances it one interval.
 */
export function computeReviewQueue(attempts: Attempt[], now: Date = new Date()): ReviewQueueResult {
  const byQuestion = new Map<string, Attempt[]>();
  for (const attempt of attempts) {
    const list = byQuestion.get(attempt.questionId) ?? [];
    list.push(attempt);
    byQuestion.set(attempt.questionId, list);
  }

  const active: ReviewQueueItem[] = [];
  const masteredQuestionIds: string[] = [];
  const everEnteredQuestionIds: string[] = [];

  for (const [questionId, list] of byQuestion) {
    const sorted = [...list].sort(
      (a, b) => new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime()
    );

    let stage: number | null = null;
    let everEntered = false;
    let mastered = false;
    let lastAttemptAt = sorted[0].createdAt;
    let lastCorrect = false;

    for (const attempt of sorted) {
      lastAttemptAt = attempt.createdAt;
      lastCorrect = attempt.isCorrect;
      const needsReview = !attempt.isCorrect || attempt.flagged === true;

      if (needsReview) {
        stage = 0;
        everEntered = true;
        mastered = false;
      } else if (stage !== null) {
        if (stage >= REVIEW_INTERVALS_DAYS.length - 1) {
          stage = null;
          mastered = true;
        } else {
          stage += 1;
        }
      }
    }

    if (everEntered) everEnteredQuestionIds.push(questionId);
    if (mastered) masteredQuestionIds.push(questionId);

    if (stage !== null) {
      const dueAt = new Date(new Date(lastAttemptAt).getTime() + REVIEW_INTERVALS_DAYS[stage] * DAY_MS);
      active.push({ questionId, stage, dueAt: dueAt.toISOString(), lastAttemptAt, lastCorrect });
    }
  }

  const dueToday = active.filter((item) => new Date(item.dueAt).getTime() <= now.getTime());

  return { active, dueToday, masteredQuestionIds, everEnteredQuestionIds };
}
