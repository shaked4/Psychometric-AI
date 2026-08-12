"use client";

import { useSyncExternalStore } from "react";
import {
  DEFAULT_DAILY_GOAL_TARGETS,
  getDailyGoalTargets,
  subscribeDailyGoalTargets,
  type DailyGoalTargets,
} from "@/lib/daily-goal";

/** Reactive read of the daily goal targets, mirroring lib/use-attempts.ts. */
export function useDailyGoalTargets(): DailyGoalTargets {
  return useSyncExternalStore(subscribeDailyGoalTargets, getDailyGoalTargets, () => DEFAULT_DAILY_GOAL_TARGETS);
}
