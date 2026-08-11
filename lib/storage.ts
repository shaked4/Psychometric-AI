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
