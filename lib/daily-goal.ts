import type { Attempt } from "@/types";
import type { EssayAttempt } from "@/lib/essay-storage";

const TARGETS_KEY = "psychometric-ai:daily-goal-targets";

export interface DailyGoalTargets {
  questions: number;
  essays: number;
}

export const DEFAULT_DAILY_GOAL_TARGETS: DailyGoalTargets = { questions: 15, essays: 1 };

const MIN_QUESTIONS = 5;
const MAX_QUESTIONS = 50;
const MIN_ESSAYS = 0;
const MAX_ESSAYS = 3;

function isBrowser() {
  return typeof window !== "undefined";
}

// Same cachedRaw/cachedValue pattern as lib/storage.ts's getAttempts() —
// required for useSyncExternalStore (lib/use-daily-goal.ts) to get a stable
// reference when the underlying storage hasn't changed.
let cachedRaw: string | null = null;
let cachedTargets: DailyGoalTargets = DEFAULT_DAILY_GOAL_TARGETS;

/** Only the target numbers are a stored preference — how many questions/
 * essays were actually done today is always derived fresh from the attempt
 * logs (see computeTodayProgress below), same stats-layer split as
 * everywhere else in this app. */
export function getDailyGoalTargets(): DailyGoalTargets {
  if (!isBrowser()) return DEFAULT_DAILY_GOAL_TARGETS;

  const raw = localStorage.getItem(TARGETS_KEY);
  if (raw === cachedRaw) return cachedTargets;

  cachedRaw = raw;
  try {
    if (!raw) {
      cachedTargets = DEFAULT_DAILY_GOAL_TARGETS;
    } else {
      const parsed = JSON.parse(raw);
      cachedTargets = {
        questions: typeof parsed.questions === "number" ? parsed.questions : DEFAULT_DAILY_GOAL_TARGETS.questions,
        essays: typeof parsed.essays === "number" ? parsed.essays : DEFAULT_DAILY_GOAL_TARGETS.essays,
      };
    }
  } catch {
    cachedTargets = DEFAULT_DAILY_GOAL_TARGETS;
  }
  return cachedTargets;
}

const listeners = new Set<() => void>();

export function subscribeDailyGoalTargets(onChange: () => void): () => void {
  listeners.add(onChange);
  return () => listeners.delete(onChange);
}

export function setDailyGoalTargets(next: DailyGoalTargets): void {
  if (!isBrowser()) return;
  const clamped: DailyGoalTargets = {
    questions: Math.min(MAX_QUESTIONS, Math.max(MIN_QUESTIONS, Math.round(next.questions))),
    essays: Math.min(MAX_ESSAYS, Math.max(MIN_ESSAYS, Math.round(next.essays))),
  };
  localStorage.setItem(TARGETS_KEY, JSON.stringify(clamped));
  for (const listener of listeners) listener();
}

function toDateKey(iso: string) {
  const d = new Date(iso);
  return `${d.getFullYear()}-${d.getMonth()}-${d.getDate()}`;
}

export interface TodayProgress {
  questionsToday: number;
  essaysToday: number;
}

/** Derived fresh from the attempt/essay logs on every call — never cached,
 * so "today" is always actually today and never drifts from what happened
 * (same principle as lib/stats.ts's computeOverallStats). */
export function computeTodayProgress(
  attempts: Attempt[],
  essayAttempts: EssayAttempt[],
  now: Date = new Date()
): TodayProgress {
  const todayKey = toDateKey(now.toISOString());
  return {
    questionsToday: attempts.filter((a) => toDateKey(a.createdAt) === todayKey).length,
    essaysToday: essayAttempts.filter((e) => toDateKey(e.createdAt) === todayKey).length,
  };
}
