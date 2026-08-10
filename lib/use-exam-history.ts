"use client";

import { useSyncExternalStore } from "react";
import { EMPTY_EXAM_HISTORY, getExamHistory, subscribeExamHistory } from "@/lib/exam-history";
import type { ExamHistoryEntry } from "@/lib/exam-history";

/** Reactive read of persisted exam scores, mirroring lib/use-attempts.ts. */
export function useExamHistory(): ExamHistoryEntry[] {
  return useSyncExternalStore(subscribeExamHistory, getExamHistory, () => EMPTY_EXAM_HISTORY);
}
