import type { Attempt, SelfReportedError } from "@/types";

const ATTEMPTS_KEY = "psychometric-ai:attempts";
const USER_ID_KEY = "psychometric-ai:user-id";

function isBrowser() {
  return typeof window !== "undefined";
}

export function getUserId(): string {
  if (!isBrowser()) return "server";
  let id = localStorage.getItem(USER_ID_KEY);
  if (!id) {
    id = crypto.randomUUID();
    localStorage.setItem(USER_ID_KEY, id);
  }
  return id;
}

export const EMPTY_ATTEMPTS: Attempt[] = [];

// Cached so repeated reads return the same array reference when the
// underlying storage hasn't changed — required for useSyncExternalStore
// (see lib/use-attempts.ts), which otherwise treats every new reference as
// a change and re-renders forever.
let cachedRaw: string | null = null;
let cachedAttempts: Attempt[] = EMPTY_ATTEMPTS;

export function getAttempts(): Attempt[] {
  if (!isBrowser()) return EMPTY_ATTEMPTS;

  const raw = localStorage.getItem(ATTEMPTS_KEY);
  if (raw === cachedRaw) return cachedAttempts;

  cachedRaw = raw;
  try {
    cachedAttempts = raw ? (JSON.parse(raw) as Attempt[]) : EMPTY_ATTEMPTS;
  } catch {
    cachedAttempts = EMPTY_ATTEMPTS;
  }
  return cachedAttempts;
}

const listeners = new Set<() => void>();

export function subscribeAttempts(onChange: () => void): () => void {
  listeners.add(onChange);
  return () => listeners.delete(onChange);
}

export interface RecordAttemptInput {
  sessionId: string;
  questionId: string;
  chosenAnswer: number;
  isCorrect: boolean;
  timeTakenSeconds: number;
  selfReportedError: SelfReportedError | null;
  flagged?: boolean;
}

/**
 * Persists one completed attempt. This is the only write path into the
 * stats layer — topic stats, streaks, and error insights are always
 * derived from the attempt log on read (see lib/stats.ts), never cached,
 * so there is a single source of truth for what actually happened.
 */
export function recordAttempt(input: RecordAttemptInput): Attempt {
  const attempt: Attempt = {
    id: crypto.randomUUID(),
    userId: getUserId(),
    createdAt: new Date().toISOString(),
    ...input,
  };

  if (isBrowser()) {
    const attempts = [...getAttempts(), attempt];
    localStorage.setItem(ATTEMPTS_KEY, JSON.stringify(attempts));
    for (const listener of listeners) listener();
  }

  return attempt;
}

/** Updates the root-cause tag on an already-recorded attempt — used by the
 * deep post-mortem review (app/(main)/post-mortem/page.tsx) to tag mistakes
 * that weren't tagged inline during the session (the only tagging path
 * exam mode has, and an optional catch-up path for practice mode). Callers
 * should also call markAttemptsDirty() from lib/cloud-sync.ts afterward so
 * the change reaches Supabase — this file stays cloud-agnostic on purpose. */
export function updateAttemptTag(attemptId: string, tag: SelfReportedError): void {
  if (!isBrowser()) return;

  const attempts = getAttempts().map((a) => (a.id === attemptId ? { ...a, selfReportedError: tag } : a));
  localStorage.setItem(ATTEMPTS_KEY, JSON.stringify(attempts));
  for (const listener of listeners) listener();
}

export interface UpdateAttemptAnswerInput {
  chosenAnswer: number;
  isCorrect: boolean;
  timeTakenSeconds: number;
}

/** Overwrites an already-recorded attempt's answer in place — used when a
 * student navigates back to a previous question in a practice session and
 * changes their answer. Keeps exactly one attempt per question per session
 * (rather than accumulating a new attempt on every revisit), so accuracy,
 * spaced-repetition scheduling, and topic mastery aren't skewed by
 * navigation. Callers should also call markAttemptsDirty() from
 * lib/cloud-sync.ts afterward, same as updateAttemptTag(). */
export function updateAttemptAnswer(attemptId: string, input: UpdateAttemptAnswerInput): Attempt | null {
  if (!isBrowser()) return null;

  let updated: Attempt | null = null;
  const attempts = getAttempts().map((a) => {
    if (a.id !== attemptId) return a;
    updated = { ...a, ...input };
    return updated;
  });
  localStorage.setItem(ATTEMPTS_KEY, JSON.stringify(attempts));
  for (const listener of listeners) listener();
  return updated;
}

/** Merges attempts pulled from Supabase (see lib/cloud-sync.ts) into the
 * local log, skipping any id already present — this is what restores a
 * user's history on a new device after signing in. */
export function mergeRemoteAttempts(remote: Attempt[]): void {
  if (!isBrowser() || remote.length === 0) return;

  const local = getAttempts();
  const existingIds = new Set(local.map((a) => a.id));
  const toAdd = remote.filter((a) => !existingIds.has(a.id));
  if (toAdd.length === 0) return;

  localStorage.setItem(ATTEMPTS_KEY, JSON.stringify([...local, ...toAdd]));
  for (const listener of listeners) listener();
}
