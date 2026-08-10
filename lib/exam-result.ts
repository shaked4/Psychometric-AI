import type { Question, Section } from "@/types";

const EXAM_RESULT_KEY = "psychometric-ai:last-exam-result";

export interface ExamResultPayload {
  section: Section;
  sessionId: string;
  totalTimeSeconds: number;
  questions: Question[];
  answers: (number | null)[];
  flaggedIndices: number[];
  completedAt: string;
}

function isBrowser() {
  return typeof window !== "undefined";
}

export function saveExamResult(result: ExamResultPayload): void {
  if (!isBrowser()) return;
  sessionStorage.setItem(EXAM_RESULT_KEY, JSON.stringify(result));
}

// Cached so repeated reads return the same reference when nothing changed —
// required for useSyncExternalStore (see lib/use-exam-result.ts), same
// reasoning as the attempts cache in lib/storage.ts.
let cachedRaw: string | null = null;
let cachedResult: ExamResultPayload | null = null;

export function loadExamResult(): ExamResultPayload | null {
  if (!isBrowser()) return null;

  const raw = sessionStorage.getItem(EXAM_RESULT_KEY);
  if (raw === cachedRaw) return cachedResult;

  cachedRaw = raw;
  try {
    cachedResult = raw ? (JSON.parse(raw) as ExamResultPayload) : null;
  } catch {
    cachedResult = null;
  }
  return cachedResult;
}
