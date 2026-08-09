"use client";

import { useSyncExternalStore } from "react";
import { EMPTY_ATTEMPTS, getAttempts, subscribeAttempts } from "@/lib/storage";
import type { Attempt } from "@/types";

/** Reactive read of the attempt log: re-renders when recordAttempt() writes,
 * and matches server-rendered output (empty) on the first client render. */
export function useAttempts(): Attempt[] {
  return useSyncExternalStore(subscribeAttempts, getAttempts, () => EMPTY_ATTEMPTS);
}
