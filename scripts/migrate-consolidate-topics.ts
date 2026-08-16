/**
 * One-time (but safely re-runnable) migration: retags existing rows in the
 * `questions` table onto the canonical topic taxonomy (lib/topics.ts).
 *
 * The bank accumulated fragmented/overlapping topic names across several
 * seed scripts written at different times: quant's "בעיות תנועה ועבודה",
 * "אחוזים", and "יחס ופרופורציה" are all "word problems" under three
 * different names; verbal's "חשיבה לוגית" and "הבנה והסקה לוגית" are the
 * same critical-reasoning category under two names. This is what made the
 * practice sidebar (components/practice/study-sidebar.tsx) feel shallow and
 * scattered — clicking one topic name silently missed questions seeded
 * under its synonym. This migration doesn't touch `subtopic` or any other
 * column, just consolidates `topic` onto one canonical string per group so
 * a sidebar click surfaces everything that actually belongs to it.
 *
 * Deliberately does NOT touch topics that don't map onto the canonical list
 * at all (quant's "הסתברות וקומבינטוריקה"/"קריפטואריתמטיקה", English's
 * "Vocabulary") — those aren't force-fitted into a category they don't
 * belong in; they simply aren't their own sidebar entry, though their
 * questions still count toward whole-section pools (exam mode, quick
 * practice, topic-less /practice/[section]).
 *
 * Idempotent: after the first run, no rows match the old topic names, so
 * re-running just reports zero rows updated for every group.
 *
 * Usage:
 *   npx tsx --env-file=.env.local scripts/migrate-consolidate-topics.ts
 *
 * Requires NEXT_PUBLIC_SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY (see
 * .env.local.example).
 */

import { createClient, type SupabaseClient } from "@supabase/supabase-js";
import WS from "ws";

// See scripts/seed-question-bank.ts for why this polyfill is needed: Node
// versions below 22 have no native global WebSocket, and
// @supabase/supabase-js's client constructor throws without one even
// though this script only ever does plain REST update calls.
if (typeof globalThis.WebSocket === "undefined") {
  (globalThis as { WebSocket?: unknown }).WebSocket = WS;
}

function getSupabaseAdminClient(): SupabaseClient | null {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!url || !serviceRoleKey) return null;
  return createClient(url, serviceRoleKey, { auth: { persistSession: false } });
}

interface RetagGroup {
  section: "quant" | "verbal" | "english";
  fromTopics: string[];
  toTopic: string;
}

const RETAG_GROUPS: RetagGroup[] = [
  { section: "quant", fromTopics: ["בעיות תנועה ועבודה", "אחוזים", "יחס ופרופורציה"], toTopic: "בעיות מילוליות" },
  { section: "verbal", fromTopics: ["הבנה והבעה"], toTopic: "השלמת משפטים" },
  { section: "verbal", fromTopics: ["חשיבה לוגית"], toTopic: "הבנה והסקה לוגית" },
];

async function main() {
  const supabase = getSupabaseAdminClient();
  if (!supabase) {
    console.error("NEXT_PUBLIC_SUPABASE_URL / SUPABASE_SERVICE_ROLE_KEY are not set — aborting.");
    process.exitCode = 1;
    return;
  }

  for (const group of RETAG_GROUPS) {
    const { data: matching, error: selectError } = await supabase
      .from("questions")
      .select("id")
      .eq("section", group.section)
      .in("topic", group.fromTopics);

    if (selectError) {
      console.error(`Select failed for ${group.section} [${group.fromTopics.join(", ")}]:`, selectError.message);
      process.exitCode = 1;
      continue;
    }

    const ids = (matching ?? []).map((r) => r.id);
    if (ids.length === 0) {
      console.log(`${group.section}: no rows under [${group.fromTopics.join(", ")}] — already consolidated.`);
      continue;
    }

    const { error: updateError } = await supabase.from("questions").update({ topic: group.toTopic }).in("id", ids);

    if (updateError) {
      console.error(`Update failed for ${group.section} -> "${group.toTopic}":`, updateError.message);
      process.exitCode = 1;
      continue;
    }

    console.log(
      `${group.section}: retagged ${ids.length} row(s) from [${group.fromTopics.join(", ")}] to "${group.toTopic}".`
    );
  }
}

main();
