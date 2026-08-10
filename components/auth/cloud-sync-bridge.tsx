"use client";

import { useEffect, useRef } from "react";
import { useAuth } from "@clerk/nextjs";
import { useAttempts } from "@/lib/use-attempts";
import { syncUnsyncedAttempts } from "@/lib/cloud-sync";

/**
 * Mounted once near the root, only when Clerk is configured (see
 * app/layout.tsx). Watches sign-in state and the local attempt log, and
 * pushes anything unsynced to Supabase. Renders nothing.
 */
export function CloudSyncBridge() {
  const { isLoaded, isSignedIn } = useAuth();
  const attempts = useAttempts();
  const syncInFlight = useRef(false);

  useEffect(() => {
    if (!isLoaded || !isSignedIn || attempts.length === 0) return;
    if (syncInFlight.current) return;

    syncInFlight.current = true;
    syncUnsyncedAttempts(attempts).finally(() => {
      syncInFlight.current = false;
    });
  }, [isLoaded, isSignedIn, attempts]);

  return null;
}
