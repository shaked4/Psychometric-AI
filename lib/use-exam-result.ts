"use client";

import { useSyncExternalStore } from "react";
import { loadExamResult, type ExamResultPayload } from "@/lib/exam-result";

// No live updates within a single page view — this subscription exists only
// to make the sessionStorage read hydration-safe and lint-clean (see
// lib/use-attempts.ts for the identical pattern applied to localStorage).
function subscribe() {
  return () => {};
}

function getServerSnapshot(): ExamResultPayload | null {
  return null;
}

export function useExamResult(): ExamResultPayload | null {
  return useSyncExternalStore(subscribe, loadExamResult, getServerSnapshot);
}
