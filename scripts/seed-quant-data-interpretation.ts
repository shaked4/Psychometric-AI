/**
 * Seeds one original "data interpretation" (הסקת מתרשים) question block: 4
 * quant questions that all read the same shared data table, inserted with a
 * common `group_id` (in authored order via `group_order`) and an identical
 * `diagram_data` payload on every row — see types/index.ts's DiagramData and
 * components/practice/data-interpretation-table.tsx for how it renders, and
 * lib/exam-fetcher.ts's applyDifficultyCurve() for how the group is kept
 * contiguous inside an exam rather than being shuffled apart.
 *
 * The dataset (branch registrations per quarter) and every question/number
 * here are original — inspired by the *format* of a real NITE data-
 * interpretation block (a shared table + several questions reasoning over
 * it), not copied from one. All four answers were derived directly from the
 * table below and double-checked by hand; see each explanation for the
 * arithmetic.
 *
 * REQUIRES the group_id/group_order/diagram_data migration to have been run
 * first (see supabase/schema.sql's migration block) — this script will fail
 * loudly with a clear message if those columns don't exist yet, rather than
 * silently inserting rows without them.
 *
 * Usage:
 *   npx tsx --env-file=.env.local scripts/seed-quant-data-interpretation.ts
 *
 * Requires NEXT_PUBLIC_SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY (see
 * .env.local.example). No ANTHROPIC_API_KEY needed.
 */

import { createClient, type SupabaseClient } from "@supabase/supabase-js";
import WS from "ws";
import type { DataTableDiagram, Question } from "@/types";

// See scripts/seed-question-bank.ts for why this polyfill is needed: Node
// versions below 22 have no native global WebSocket, and
// @supabase/supabase-js's client constructor throws without one even
// though this script only ever does plain REST insert calls.
if (typeof globalThis.WebSocket === "undefined") {
  (globalThis as { WebSocket?: unknown }).WebSocket = WS;
}

// Deliberately not a reuse of lib/supabase-server.ts — that file starts
// with `import "server-only"`, which unconditionally throws outside
// Next.js's own bundler. Same client construction, just inlined here.
function getSupabaseAdminClient(): SupabaseClient | null {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!url || !serviceRoleKey) return null;
  return createClient(url, serviceRoleKey, { auth: { persistSession: false } });
}

const DIAGRAM: DataTableDiagram = {
  type: "table",
  title: 'מספר מנויים חדשים שנרשמו בכל סניף של רשת חדרי כושר, לפי רבעון (בשנה נתונה)',
  columns: ["רבעון 1", "רבעון 2", "רבעון 3", "רבעון 4"],
  rows: [
    { label: "סניף צפון", values: [40, 55, 35, 70] },
    { label: "סניף דרום", values: [60, 45, 65, 50] },
    { label: "סניף מרכז", values: [30, 30, 60, 80] },
    { label: "סניף מזרח", values: [50, 65, 40, 45] },
  ],
  legend: "כל תא בטבלה מציין את מספר המנויים החדשים (יחידות) שנרשמו בסניף הנתון ברבעון הנתון.",
};

type HardcodedQuestion = Omit<Question, "id" | "createdAt" | "passage" | "type" | "media" | "groupId" | "diagram">;

const QUESTIONS: HardcodedQuestion[] = [
  {
    section: "quant",
    topic: "הסקת מתרשים",
    subtopic: "קריאת נתונים וסכימה",
    difficulty: 3,
    groupOrder: 0,
    body: "כמה מנויים חדשים נרשמו בסניף מרכז לאורך כל ארבעת הרבעונים גם יחד?",
    choices: ["200", "220", "180", "195"],
    correctAnswer: 0,
    explanation:
      "סוכמים את שורת סניף מרכז בטבלה: $30+30+60+80=200$. (שאר האפשרויות הן סכומי שורות/עמודות אחרות בטבלה — 220 הוא סך סניף דרום, 180 הוא סך רבעון 1, ו-195 הוא סך רבעון 2 — ולכן חשוב לקרוא את השורה הנכונה בלבד.)",
  },
  {
    section: "quant",
    topic: "הסקת מתרשים",
    subtopic: "אחוזי שינוי בין תאים",
    difficulty: 3,
    groupOrder: 1,
    body: "באיזה אחוז גדל מספר המנויים החדשים בסניף צפון בין רבעון 3 לרבעון 4?",
    choices: ["100%", "50%", "200%", "35%"],
    correctAnswer: 0,
    explanation:
      "בסניף צפון: רבעון 3 = 35, רבעון 4 = 70. הגידול המוחלט הוא $70-35=35$. אחוז הגידול נמדד ביחס לערך המקורי (רבעון 3): $\\dfrac{35}{35}\\times100\\%=100\\%$ — מספר המנויים הכפיל את עצמו.",
  },
  {
    section: "quant",
    topic: "הסקת מתרשים",
    subtopic: "השוואה בין סניפים באותו רבעון",
    difficulty: 3,
    groupOrder: 2,
    body: "בכמה עולה מספר המנויים שנרשמו בסניף דרום על מספר המנויים שנרשמו בסניף מרכז, ברבעון 2?",
    choices: ["15", "10", "20", "5"],
    correctAnswer: 0,
    explanation:
      "ברבעון 2: סניף דרום = 45, סניף מרכז = 30. ההפרש הוא $45-30=15$.",
  },
  {
    section: "quant",
    topic: "הסקת מתרשים",
    subtopic: "מסקנות המחייבות בדיקת כל הנתונים",
    difficulty: 4,
    groupOrder: 3,
    body: "איזו מהטענות הבאות נכונה בהכרח על פי הנתונים בטבלה?",
    choices: [
      "בכל אחד מארבעת הרבעונים, סך המנויים החדשים בכל הסניפים יחד עולה על 150",
      "סניף דרום גייס יותר מנויים חדשים מכל סניף אחר, בכל אחד מהרבעונים",
      "סך המנויים החדשים שנרשמו בסניף צפון גדול מסך המנויים שנרשמו בסניף מרכז",
      "בכל אחד מהסניפים, הרבעון שבו נרשמו הכי הרבה מנויים חדשים הוא רבעון 4",
    ],
    correctAnswer: 0,
    explanation:
      "בודקים כל טענה מול סכומי העמודות/שורות בטבלה: סך כל הסניפים לפי רבעון הוא 180 (ר1), 195 (ר2), 200 (ר3), 245 (ר4) — כל הערכים גדולים מ-150, כך שהטענה הראשונה נכונה בהכרח. הטענה השנייה שגויה: ברבעון 2 בסניף צפון נרשמו 55 מנויים, יותר מסניף דרום (45). הטענה השלישית שגויה: סך סניף צפון הוא $40+55+35+70=200$, זהה בדיוק לסך סניף מרכז ($30+30+60+80=200$) — לא גדול ממנו. הטענה הרביעית שגויה: בסניף דרום הרבעון עם הכי הרבה מנויים הוא רבעון 3 (65), לא רבעון 4 (50).",
  },
];

async function main() {
  const supabase = getSupabaseAdminClient();
  if (!supabase) {
    console.error("NEXT_PUBLIC_SUPABASE_URL / SUPABASE_SERVICE_ROLE_KEY are not set — aborting.");
    process.exitCode = 1;
    return;
  }

  if (QUESTIONS.length !== 4) {
    console.error(`Expected exactly 4 questions, found ${QUESTIONS.length} — aborting.`);
    process.exitCode = 1;
    return;
  }

  const groupId = crypto.randomUUID();
  const now = new Date().toISOString();
  const rows = QUESTIONS.map((q) => ({
    id: crypto.randomUUID(),
    section: q.section,
    topic: q.topic,
    subtopic: q.subtopic,
    difficulty: q.difficulty,
    body: q.body,
    options: q.choices,
    correct_index: q.correctAnswer,
    explanation: q.explanation,
    created_at: now,
    group_id: groupId,
    group_order: q.groupOrder,
    diagram_data: DIAGRAM,
  }));

  console.log(`Inserting a 4-question data-interpretation block (group_id ${groupId}) into the shared question bank...`);

  const { error } = await supabase.from("questions").insert(rows);
  if (error) {
    if (error.code === "42703") {
      console.error(
        "Insert failed: the group_id/group_order/diagram_data columns don't exist yet on `questions`. " +
          "Run the migration in supabase/schema.sql's migration block (Supabase SQL Editor), then retry."
      );
    } else {
      console.error("Insert failed:", error.message);
    }
    process.exitCode = 1;
    return;
  }

  console.log(`Done. ${rows.length} questions inserted as one data-interpretation group.`);
}

main();
