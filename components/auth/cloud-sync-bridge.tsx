"use client";

import { useEffect, useRef } from "react";
import { useAuth } from "@clerk/nextjs";
import { useAttempts } from "@/lib/use-attempts";
import { useExamHistory } from "@/lib/use-exam-history";
import { getAttempts } from "@/lib/storage";
import { getExamHistory } from "@/lib/exam-history";
import { pullRemoteData, pushUnsyncedData } from "@/lib/cloud-sync";

/**
 * Mounted once near the root, only when Clerk is configured (see
 * app/layout.tsx). On sign-in, pulls this user's history from Supabase
 * once (restoring the dashboard/review queue on a new device), then keeps
 * pushing local changes forward for as long as the user stays signed in.
 * Renders nothing.
 */
export function CloudSyncBridge() {
  const { isLoaded, isSignedIn } = useAuth();
  const attempts = useAttempts();
  const examHistory = useExamHistory();
  const pulledRef = useRef(false);
  const syncInFlight = useRef(false);

  // One-time pull on sign-in, chained directly into a push of anything
  // local that the pull didn't already cover (e.g. accumulated on this
  // device while signed out). Chaining explicitly — rather than leaving the
  // push to the effect below re-firing off a re-render — avoids racing
  // React's render timing after the merge functions notify their listeners.
  useEffect(() => {
    if (!isLoaded || !isSignedIn || pulledRef.current) return;
    pulledRef.current = true;
    syncInFlight.current = true;

    pullRemoteData()
      .then(() => pushUnsyncedData(getAttempts(), getExamHistory()))
      .finally(() => {
        syncInFlight.current = false;
      });
  }, [isLoaded, isSignedIn]);

  // Ongoing sync: pushes any attempt or exam-history change recorded after
  // the initial pull (new practice, new exam, new review answered).
  useEffect(() => {
    if (!isLoaded || !isSignedIn || !pulledRef.current) return;
    if (attempts.length === 0 && examHistory.length === 0) return;
    if (syncInFlight.current) return;

    syncInFlight.current = true;
    pushUnsyncedData(attempts, examHistory).finally(() => {
      syncInFlight.current = false;
    });
  }, [isLoaded, isSignedIn, attempts, examHistory]);

  useEffect(() => {
    if (!isSignedIn) pulledRef.current = false;
  }, [isSignedIn]);

  return null;
}
