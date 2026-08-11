import type { EssayAttempt } from "@/lib/essay-storage";
import { mergeRemoteEssayAttempts } from "@/lib/essay-storage";

/** Best-effort push of one finished essay right after it's saved locally.
 * The route degrades gracefully (synced: false) when Clerk/Supabase aren't
 * configured or the user isn't signed in, so this never needs to check
 * CLERK_ENABLED itself — same resilience-first shape as the rest of the
 * cloud-sync layer (lib/cloud-sync.ts). */
export async function pushEssayAttempt(attempt: EssayAttempt): Promise<{ synced: boolean }> {
  try {
    const res = await fetch("/api/essays", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(attempt),
    });
    const data = (await res.json()) as { synced: boolean };
    return { synced: data.synced === true };
  } catch {
    return { synced: false };
  }
}

/** Pulls this user's essay history from Supabase and merges it into local
 * storage — called once when the essay hub's history view mounts, so past
 * essays written on another device show up here too. */
export async function pullEssayAttempts(): Promise<{ pulled: boolean }> {
  try {
    const res = await fetch("/api/essays");
    const data = (await res.json()) as { pulled: boolean; essays?: EssayAttempt[] };
    if (!data.pulled) return { pulled: false };

    mergeRemoteEssayAttempts(data.essays ?? []);
    return { pulled: true };
  } catch {
    return { pulled: false };
  }
}
