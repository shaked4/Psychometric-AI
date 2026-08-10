import type { Question } from "@/types";

const QUESTION_CACHE_KEY = "psychometric-ai:question-cache";

function isBrowser() {
  return typeof window !== "undefined";
}

function readCache(): Record<string, Question> {
  if (!isBrowser()) return {};
  try {
    const raw = localStorage.getItem(QUESTION_CACHE_KEY);
    return raw ? (JSON.parse(raw) as Record<string, Question>) : {};
  } catch {
    return {};
  }
}

/**
 * AI-generated questions (custom practice, exam mode) only ever exist in
 * memory for the component that fetched them — unlike the static mock bank,
 * nothing else can resolve their id back to a full Question later. That
 * breaks anything that looks a question up by id after the fact: topic
 * stats for exam/custom attempts, and the spaced-repetition review queue.
 * Caching every generated batch here (keyed by id) closes that gap — see
 * getQuestion() in lib/stats.ts, which checks this cache as a fallback.
 */
export function cacheQuestions(questions: Question[]): void {
  if (!isBrowser() || questions.length === 0) return;
  const existing = readCache();
  for (const q of questions) existing[q.id] = q;
  localStorage.setItem(QUESTION_CACHE_KEY, JSON.stringify(existing));
}

export function getCachedQuestion(questionId: string): Question | undefined {
  return readCache()[questionId];
}
