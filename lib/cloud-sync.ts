import type { Attempt } from "@/types";

const SYNCED_IDS_KEY = "psychometric-ai:synced-attempt-ids";

function isBrowser() {
  return typeof window !== "undefined";
}

function getSyncedIds(): Set<string> {
  if (!isBrowser()) return new Set();
  try {
    const raw = localStorage.getItem(SYNCED_IDS_KEY);
    return new Set(raw ? (JSON.parse(raw) as string[]) : []);
  } catch {
    return new Set();
  }
}

function markSynced(ids: string[]) {
  if (!isBrowser() || ids.length === 0) return;
  const merged = getSyncedIds();
  for (const id of ids) merged.add(id);
  localStorage.setItem(SYNCED_IDS_KEY, JSON.stringify([...merged]));
}

/**
 * Pushes every attempt not yet marked as synced to Supabase via
 * /api/sync/push. Called both on every new attempt and right after login —
 * that single mechanism doubles as the one-time local -> cloud migration,
 * since a freshly signed-in user's synced-ids set starts empty and every
 * attempt accumulated while offline gets pushed on the first call.
 */
export async function syncUnsyncedAttempts(attempts: Attempt[]): Promise<{ synced: boolean }> {
  const syncedIds = getSyncedIds();
  const pending = attempts.filter((a) => !syncedIds.has(a.id));
  if (pending.length === 0) return { synced: true };

  try {
    const res = await fetch("/api/sync/push", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ attempts: pending }),
    });
    const data = (await res.json()) as { synced: boolean };
    if (data.synced) {
      markSynced(pending.map((a) => a.id));
      return { synced: true };
    }
    return { synced: false };
  } catch {
    return { synced: false };
  }
}
