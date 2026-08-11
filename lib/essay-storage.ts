const ESSAY_ATTEMPTS_KEY = "psychometric-ai:essay-attempts";
const DRAFT_KEY_PREFIX = "psychometric-ai:essay-draft:";

export interface EssaySentenceFeedback {
  original: string;
  suggestion: string;
  comment: string;
}

export interface EssayEvaluation {
  contentScore: number;
  languageScore: number;
  /** Simplified 50-150 estimate, same linear approximation lib/exam-history.ts's
   * scaleScore() uses for the MCQ sections — computed deterministically from
   * contentScore/languageScore, never asked of the model directly (see
   * app/api/evaluate-essay/route.ts). */
  estimatedPsychometricScore: number;
  strengths: string[];
  improvements: string[];
  reminiscentExamples: EssaySentenceFeedback[];
}

export interface EssayAttempt extends EssayEvaluation {
  id: string;
  promptId: string;
  promptTitle: string;
  essayText: string;
  wordCount: number;
  timeTakenSeconds: number;
  /** True if this evaluation came from the offline heuristic fallback
   * (no ANTHROPIC_API_KEY, or the model call failed) rather than Claude. */
  offline: boolean;
  createdAt: string;
}

function isBrowser() {
  return typeof window !== "undefined";
}

export const EMPTY_ESSAY_ATTEMPTS: EssayAttempt[] = [];

// Same caching reasoning as lib/storage.ts: useSyncExternalStore needs
// getSnapshot() to return a stable reference when nothing changed.
let cachedRaw: string | null = null;
let cachedAttempts: EssayAttempt[] = EMPTY_ESSAY_ATTEMPTS;

export function getEssayAttempts(): EssayAttempt[] {
  if (!isBrowser()) return EMPTY_ESSAY_ATTEMPTS;

  const raw = localStorage.getItem(ESSAY_ATTEMPTS_KEY);
  if (raw === cachedRaw) return cachedAttempts;

  cachedRaw = raw;
  try {
    cachedAttempts = raw ? (JSON.parse(raw) as EssayAttempt[]) : EMPTY_ESSAY_ATTEMPTS;
  } catch {
    cachedAttempts = EMPTY_ESSAY_ATTEMPTS;
  }
  return cachedAttempts;
}

const listeners = new Set<() => void>();

export function subscribeEssayAttempts(onChange: () => void): () => void {
  listeners.add(onChange);
  return () => listeners.delete(onChange);
}

export function saveEssayAttempt(attempt: EssayAttempt): void {
  if (!isBrowser()) return;
  const attempts = [attempt, ...getEssayAttempts()];
  localStorage.setItem(ESSAY_ATTEMPTS_KEY, JSON.stringify(attempts));
  for (const listener of listeners) listener();
}

/** Merges essay attempts pulled from Supabase (see lib/essay-cloud.ts) into
 * the local log, skipping any id already present — restores essay history
 * on a new device after signing in, same pattern as mergeRemoteAttempts(). */
export function mergeRemoteEssayAttempts(remote: EssayAttempt[]): void {
  if (!isBrowser() || remote.length === 0) return;

  const local = getEssayAttempts();
  const existingIds = new Set(local.map((a) => a.id));
  const toAdd = remote.filter((a) => !existingIds.has(a.id));
  if (toAdd.length === 0) return;

  const merged = [...local, ...toAdd].sort((a, b) => b.createdAt.localeCompare(a.createdAt));
  localStorage.setItem(ESSAY_ATTEMPTS_KEY, JSON.stringify(merged));
  for (const listener of listeners) listener();
}

/** Draft autosave, keyed per prompt — lets a student navigate away mid-essay
 * (or lose the tab) without losing their work, and resume exactly where
 * they left off next time they open the same prompt. Cleared once that
 * prompt is actually submitted for evaluation. */
export function saveEssayDraft(promptId: string, text: string): void {
  if (!isBrowser()) return;
  localStorage.setItem(DRAFT_KEY_PREFIX + promptId, text);
}

export function getEssayDraft(promptId: string): string {
  if (!isBrowser()) return "";
  return localStorage.getItem(DRAFT_KEY_PREFIX + promptId) ?? "";
}

export function clearEssayDraft(promptId: string): void {
  if (!isBrowser()) return;
  localStorage.removeItem(DRAFT_KEY_PREFIX + promptId);
}
