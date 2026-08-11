"use client";

import { useSyncExternalStore } from "react";
import { EMPTY_ESSAY_ATTEMPTS, getEssayAttempts, subscribeEssayAttempts } from "@/lib/essay-storage";
import type { EssayAttempt } from "@/lib/essay-storage";

/** Reactive read of the essay attempt log — same useSyncExternalStore
 * pattern as lib/use-attempts.ts, so the history list re-renders the
 * moment a new essay is saved or a cloud pull merges in past essays. */
export function useEssayAttempts(): EssayAttempt[] {
  return useSyncExternalStore(subscribeEssayAttempts, getEssayAttempts, () => EMPTY_ESSAY_ATTEMPTS);
}
