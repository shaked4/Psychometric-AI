/**
 * One-off migration: patches the 10 verbal-analogy rows originally inserted
 * by scripts/seed-verbal-questions.ts (4) and
 * scripts/seed-verbal-analogies-sentences-logic.ts (6) — those scripts
 * baked "(משפט מגדיר את היחס...)" and "איזה זוג מילים מבטא את אותו יחס?"
 * meta-text directly into `body`. Both source files were fixed to the bare
 * "מילה1 : מילה2 –" format going forward, but that only affects future
 * seeding — this script patches the rows that are already live in Supabase.
 *
 * The `questions` table has no `type`/`topic`-only unique key, so matching
 * is by exact old `body` text (the only thing guaranteed unique per row).
 * Every relation-defining sentence these old bodies carried was already
 * duplicated at the start of that row's `explanation`, so this migration
 * only ever touches `body` — `explanation` is untouched and needs no
 * backfill.
 *
 * Usage:
 *   npx tsx --env-file=.env.local scripts/fix-analogy-question-bodies.ts
 *
 * Requires NEXT_PUBLIC_SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY (see
 * .env.local.example). No ANTHROPIC_API_KEY needed.
 */

import { createClient, type SupabaseClient } from "@supabase/supabase-js";
import WS from "ws";

if (typeof globalThis.WebSocket === "undefined") {
  (globalThis as { WebSocket?: unknown }).WebSocket = WS;
}

function getSupabaseAdminClient(): SupabaseClient | null {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!url || !serviceRoleKey) return null;
  return createClient(url, serviceRoleKey, { auth: { persistSession: false } });
}

// oldBody -> newBody. Old values copied verbatim from the pre-fix source of
// scripts/seed-verbal-questions.ts and
// scripts/seed-verbal-analogies-sentences-logic.ts.
const BODY_FIXES: { oldBody: string; newBody: string }[] = [
  {
    oldBody: 'מסור : עצים\n\n(משפט מגדיר את היחס: "מסור הוא כלי המשמש לחיתוך עצים.")\n\nאיזה זוג מילים מבטא את אותו יחס?',
    newBody: "מסור : עצים –",
  },
  {
    oldBody:
      'טבח : מסעדה\n\n(משפט מגדיר את היחס: "טבח הוא בעל מקצוע שמקום עבודתו האופייני הוא מסעדה.")\n\nאיזה זוג מילים מבטא את אותו יחס?',
    newBody: "טבח : מסעדה –",
  },
  {
    oldBody:
      'קר : קפוא\n\n(משפט מגדיר את היחס: "קפוא מתאר עוצמה קיצונית ומודגשת יותר של התכונה \'קר\'.")\n\nאיזה זוג מילים מבטא את אותו יחס?',
    newBody: "קר : קפוא –",
  },
  {
    oldBody: 'ספר : פרק\n\n(משפט מגדיר את היחס: "ספר מורכב מפרקים המסודרים ברצף קבוע.")\n\nאיזה זוג מילים מבטא את אותו יחס?',
    newBody: "ספר : פרק –",
  },
  {
    oldBody:
      'בצורת : רעב\n\n(משפט מגדיר את היחס: "המילה הראשונה היא תופעה הגורמת להתרחשות המילה השנייה")\n\nאיזה זוג מילים מבטא את אותו יחס?',
    newBody: "בצורת : רעב –",
  },
  {
    oldBody:
      'מצפן : ניווט\n\n(משפט מגדיר את היחס: "המילה הראשונה היא כלי שתכליתו וייעודו לשמש לביצוע הפעולה המצוינת במילה השנייה")\n\nאיזה זוג מילים מבטא את אותו יחס?',
    newBody: "מצפן : ניווט –",
  },
  {
    oldBody:
      'מכשיר חשמלי : מקרר\n\n(משפט מגדיר את היחס: "המילה הראשונה היא קטגוריה כללית, והמילה השנייה היא דוגמה ספציפית השייכת לאותה קטגוריה")\n\nאיזה זוג מילים מבטא את אותו יחס?',
    newBody: "מכשיר חשמלי : מקרר –",
  },
  {
    oldBody:
      'אימון : כושר גופני\n\n(משפט מגדיר את היחס: "המילה הראשונה היא פעילות שיטתית ומתמשכת, שתוצאתה המצטברת היא המילה השנייה")\n\nאיזה זוג מילים מבטא את אותו יחס?',
    newBody: "אימון : כושר גופני –",
  },
  {
    oldBody:
      'יהלום : קשיות\n\n(משפט מגדיר את היחס: "המילה הראשונה היא חומר, והמילה השנייה מציינת את התכונה הפיזית המובהקת ביותר שלו")\n\nאיזה זוג מילים מבטא את אותו יחס?',
    newBody: "יהלום : קשיות –",
  },
  {
    oldBody:
      'נדיבות : קמצנות\n\n(משפט מגדיר את היחס: "שתי המילים הן תכונות אופי המנוגדות זו לזו באופן מוחלט - אנטונימים")\n\nאיזה זוג מילים מבטא את אותו יחס?',
    newBody: "נדיבות : קמצנות –",
  },
];

async function main() {
  const supabase = getSupabaseAdminClient();
  if (!supabase) {
    console.error("NEXT_PUBLIC_SUPABASE_URL / SUPABASE_SERVICE_ROLE_KEY are not set — aborting.");
    process.exitCode = 1;
    return;
  }

  // Dry-run pass first: report exactly how many rows match each old body
  // before mutating anything, so a zero-match run (seeds never applied) or
  // an unexpected duplicate count is visible before any UPDATE fires.
  console.log("Scanning for rows to patch...");
  let totalMatches = 0;
  const matchCounts: { newBody: string; count: number }[] = [];
  for (const { oldBody, newBody } of BODY_FIXES) {
    const { data, error } = await supabase.from("questions").select("id").eq("body", oldBody);
    if (error) {
      console.error(`Lookup failed for "${newBody}":`, error.message);
      process.exitCode = 1;
      return;
    }
    const count = data?.length ?? 0;
    matchCounts.push({ newBody, count });
    totalMatches += count;
  }

  for (const { newBody, count } of matchCounts) {
    console.log(`  ${count === 1 ? "✓" : count === 0 ? "·" : "⚠"} ${count} row(s) — "${newBody}"`);
  }
  console.log(`Total: ${totalMatches} row(s) matched across ${BODY_FIXES.length} known old bodies.`);

  if (totalMatches === 0) {
    console.log("Nothing to patch — these rows were never seeded into this database. Exiting.");
    return;
  }

  console.log("\nApplying updates...");
  let updated = 0;
  for (const { oldBody, newBody } of BODY_FIXES) {
    const { data, error } = await supabase.from("questions").update({ body: newBody }).eq("body", oldBody).select("id");
    if (error) {
      console.error(`Update failed for "${newBody}":`, error.message);
      process.exitCode = 1;
      continue;
    }
    updated += data?.length ?? 0;
  }

  console.log(`Done. ${updated} row(s) updated.`);
}

main();
