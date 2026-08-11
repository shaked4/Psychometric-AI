import type { Attempt, Question } from "@/types";
import { MOCK_QUESTIONS } from "@/lib/mock-data";
import { getQuestion } from "@/lib/stats";
import { mergeRemoteAttempts } from "@/lib/storage";
import { mergeRemoteExamHistory, type ExamHistoryEntry } from "@/lib/exam-history";
import { cacheQuestions } from "@/lib/question-cache";

const SYNCED_ATTEMPT_IDS_KEY = "psychometric-ai:synced-attempt-ids";
const SYNCED_EXAM_SESSION_IDS_KEY = "psychometric-ai:synced-exam-session-ids";
const SYNCED_QUESTION_IDS_KEY = "psychometric-ai:synced-question-ids";

const MOCK_QUESTION_IDS = new Set(MOCK_QUESTIONS.map((q) => q.id));

function isBrowser() {
  return typeof window !== "undefined";
}

function getIdSet(key: string): Set<string> {
  if (!isBrowser()) return new Set();
  try {
    const raw = localStorage.getItem(key);
    return new Set(raw ? (JSON.parse(raw) as string[]) : []);
  } catch {
    return new Set();
  }
}

function markIds(key: string, ids: string[]) {
  if (!isBrowser() || ids.length === 0) return;
  const merged = getIdSet(key);
  for (const id of ids) merged.add(id);
  localStorage.setItem(key, JSON.stringify([...merged]));
}

/** Un-marks an attempt as synced so the next pushUnsyncedData() call sends
 * it again — needed because attempts aren't fully immutable: post-mortem
 * re-tagging (lib/storage.ts's updateAttemptTag()) can change one after it
 * already synced. Supabase's upsert-by-id means re-sending it is enough to
 * overwrite the stale row, no separate "update" endpoint required. */
export function markAttemptsDirty(ids: string[]): void {
  if (!isBrowser() || ids.length === 0) return;
  const synced = getIdSet(SYNCED_ATTEMPT_IDS_KEY);
  for (const id of ids) synced.delete(id);
  localStorage.setItem(SYNCED_ATTEMPT_IDS_KEY, JSON.stringify([...synced]));
}

/**
 * Pushes every attempt, exam history entry, and AI-generated question not
 * yet marked as synced to Supabase via /api/sync/push, scoped server-side
 * to the signed-in Clerk user. Mock-bank questions are skipped — every
 * device already has them built in (lib/mock-data.ts), so syncing their
 * content would be redundant. Called on every local change and once right
 * after a cloud pull (see pullRemoteData) — that pairing is what fully
 * round-trips: pull restores history from other devices, push sends up
 * whatever originated locally, including anything accumulated offline.
 */
export async function pushUnsyncedData(
  attempts: Attempt[],
  examHistory: ExamHistoryEntry[]
): Promise<{ synced: boolean }> {
  const syncedAttemptIds = getIdSet(SYNCED_ATTEMPT_IDS_KEY);
  const syncedExamIds = getIdSet(SYNCED_EXAM_SESSION_IDS_KEY);
  const syncedQuestionIds = getIdSet(SYNCED_QUESTION_IDS_KEY);

  const pendingAttempts = attempts.filter((a) => !syncedAttemptIds.has(a.id));
  const pendingExamHistory = examHistory.filter((e) => !syncedExamIds.has(e.sessionId));

  const questionIdsNeeded = new Set(pendingAttempts.map((a) => a.questionId));
  const pendingQuestions: Question[] = [];
  for (const id of questionIdsNeeded) {
    if (MOCK_QUESTION_IDS.has(id) || syncedQuestionIds.has(id)) continue;
    const question = getQuestion(id);
    if (question) pendingQuestions.push(question);
  }

  if (pendingAttempts.length === 0 && pendingExamHistory.length === 0 && pendingQuestions.length === 0) {
    return { synced: true };
  }

  try {
    const res = await fetch("/api/sync/push", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        attempts: pendingAttempts,
        examHistory: pendingExamHistory,
        questions: pendingQuestions,
      }),
    });
    const data = (await res.json()) as { synced: boolean };
    if (!data.synced) return { synced: false };

    markIds(SYNCED_ATTEMPT_IDS_KEY, pendingAttempts.map((a) => a.id));
    markIds(SYNCED_EXAM_SESSION_IDS_KEY, pendingExamHistory.map((e) => e.sessionId));
    markIds(SYNCED_QUESTION_IDS_KEY, pendingQuestions.map((q) => q.id));
    return { synced: true };
  } catch {
    return { synced: false };
  }
}

/**
 * One-time-per-sign-in pull of this user's history from Supabase, merged
 * into local storage — this is what restores the dashboard and
 * spaced-repetition review queue on a new device. Pulled attempts/exam
 * entries/questions are immediately marked as synced so the next
 * pushUnsyncedData() call doesn't waste a round-trip re-uploading what was
 * just downloaded.
 */
export async function pullRemoteData(): Promise<{ pulled: boolean }> {
  try {
    const res = await fetch("/api/sync/pull");
    const data = (await res.json()) as {
      pulled: boolean;
      attempts?: Attempt[];
      examHistory?: ExamHistoryEntry[];
      questions?: Question[];
    };
    if (!data.pulled) return { pulled: false };

    const attempts = data.attempts ?? [];
    const examHistory = data.examHistory ?? [];
    const questions = data.questions ?? [];

    // Cache question content before merging attempts, so anything that
    // reads the attempt log right after this (dashboard, review queue) can
    // already resolve every questionId via getQuestion().
    cacheQuestions(questions);
    mergeRemoteAttempts(attempts);
    mergeRemoteExamHistory(examHistory);

    markIds(SYNCED_ATTEMPT_IDS_KEY, attempts.map((a) => a.id));
    markIds(SYNCED_EXAM_SESSION_IDS_KEY, examHistory.map((e) => e.sessionId));
    markIds(SYNCED_QUESTION_IDS_KEY, questions.map((q) => q.id));

    return { pulled: true };
  } catch {
    return { pulled: false };
  }
}
