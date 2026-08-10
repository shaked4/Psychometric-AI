import type { Section } from "@/types";

const EXAM_HISTORY_KEY = "psychometric-ai:exam-history";

export interface ExamHistoryEntry {
  sessionId: string;
  section: Section;
  score: number;
  accuracyPct: number;
  totalTimeSeconds: number;
  questionCount: number;
  completedAt: string;
}

/** Simplified, transparently-labeled linear approximation onto the real
 * exam's published 50-150 per-section scale. This is NOT the real NITE
 * equating algorithm (item-difficulty calibration, norming against other
 * test-takers) — that data doesn't exist for a simulated bank, which is why
 * the results screen explicitly disclaims it as an estimate. */
export function scaleScore(accuracyFraction: number): number {
  const raw = 50 + accuracyFraction * 100;
  return Math.max(50, Math.min(150, Math.round(raw / 5) * 5));
}

function isBrowser() {
  return typeof window !== "undefined";
}

export const EMPTY_EXAM_HISTORY: ExamHistoryEntry[] = [];

// Cached raw string, same reasoning as lib/storage.ts: useSyncExternalStore
// needs getSnapshot() to return a stable reference when nothing changed.
let cachedRaw: string | null = null;
let cachedHistory: ExamHistoryEntry[] = EMPTY_EXAM_HISTORY;

export function getExamHistory(): ExamHistoryEntry[] {
  if (!isBrowser()) return EMPTY_EXAM_HISTORY;

  const raw = localStorage.getItem(EXAM_HISTORY_KEY);
  if (raw === cachedRaw) return cachedHistory;

  cachedRaw = raw;
  try {
    cachedHistory = raw ? (JSON.parse(raw) as ExamHistoryEntry[]) : EMPTY_EXAM_HISTORY;
  } catch {
    cachedHistory = EMPTY_EXAM_HISTORY;
  }
  return cachedHistory;
}

const listeners = new Set<() => void>();

export function subscribeExamHistory(onChange: () => void): () => void {
  listeners.add(onChange);
  return () => listeners.delete(onChange);
}

/** Permanent, lightweight score record for the dashboard's progression
 * chart — separate from the ephemeral, per-question ExamResultPayload in
 * lib/exam-result.ts (sessionStorage, overwritten every exam, used only for
 * the just-finished results screen's detailed review). */
export function recordExamHistory(entry: ExamHistoryEntry): void {
  if (!isBrowser()) return;
  const history = [...getExamHistory(), entry];
  localStorage.setItem(EXAM_HISTORY_KEY, JSON.stringify(history));
  for (const listener of listeners) listener();
}
