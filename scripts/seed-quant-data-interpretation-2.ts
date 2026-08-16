/**
 * Seeds a second, original "data interpretation" (הסקת מתרשים) question
 * block — same format as scripts/seed-quant-data-interpretation.ts (4
 * questions there), added because that topic only had one block (4
 * questions total) after lib/topics.ts's canonical taxonomy redesign, well
 * below the ~10-question baseline every practice topic should have. A new
 * dataset (quarterly water consumption across towns) rather than reusing
 * the existing one, so a student who's already seen the gym-branch block
 * gets genuinely different content, not a reshuffle of the same numbers.
 *
 * Every answer was derived directly from the table below and independently
 * verified by script before this file was written — see the explanation on
 * each question for the arithmetic.
 *
 * REQUIRES the group_id/group_order/diagram_data migration to have been run
 * first (see supabase/schema.sql's migration block) — this script will fail
 * loudly with a clear message if those columns don't exist yet, rather than
 * silently inserting rows without them.
 *
 * Usage:
 *   npx tsx --env-file=.env.local scripts/seed-quant-data-interpretation-2.ts
 *
 * Requires NEXT_PUBLIC_SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY (see
 * .env.local.example). No ANTHROPIC_API_KEY needed.
 */

import { createClient, type SupabaseClient } from "@supabase/supabase-js";
import WS from "ws";
import type { DataTableDiagram, Question } from "@/types";

if (typeof globalThis.WebSocket === "undefined") {
  (globalThis as { WebSocket?: unknown }).WebSocket = WS;
}

function getSupabaseAdminClient(): SupabaseClient | null {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!url || !serviceRoleKey) return null;
  return createClient(url, serviceRoleKey, { auth: { persistSession: false } });
}

const DIAGRAM: DataTableDiagram = {
  type: "table",
  title: "צריכת מים רבעונית בישובים נבחרים (באלפי מטרים מעוקבים)",
  columns: ["רבעון 1", "רבעון 2", "רבעון 3", "רבעון 4"],
  rows: [
    { label: "רחובות", values: [500, 550, 650, 520] },
    { label: "נס ציונה", values: [400, 460, 500, 420] },
    { label: "יבנה", values: [250, 280, 300, 270] },
    { label: "גדרה", values: [200, 230, 260, 210] },
  ],
  legend: 'כל תא בטבלה מציין את כמות המים, באלפי מטרים מעוקבים, שצרך הישוב המצוין בשורה, ברבעון המצוין בעמודה.',
};

type HardcodedQuestion = Omit<Question, "id" | "createdAt" | "passage" | "type" | "media" | "groupId" | "diagram">;

const QUESTIONS: HardcodedQuestion[] = [
  {
    section: "quant",
    topic: "הסקת מתרשים",
    subtopic: "סיכום נתונים לאורך שורה",
    difficulty: 2,
    groupOrder: 0,
    body: 'מה סך כל צריכת המים של רחובות בארבעת הרבעונים גם יחד (באלפי מ"ק)?',
    choices: ["1,780", "2,220", "1,710", "2,270"],
    correctAnswer: 1,
    explanation:
      'צריכת רחובות בארבעת הרבעונים היא 500, 550, 650 ו-520 אלפי מ"ק (שורת רחובות בטבלה). הסכום: $500+550+650+520=2{,}220$ אלפי מ"ק. התשובה 1,780 היא סך הצריכה של נס ציונה — שורה שגויה. התשובה 1,710 היא סך הצריכה של כל הישובים ברבעון 3 בלבד — חיבור לאורך עמודה במקום לאורך שורה. התשובה 2,270 מתקבלת מטעות חיבור (תוספת של 50 בטעות).',
  },
  {
    section: "quant",
    topic: "הסקת מתרשים",
    subtopic: "חישוב אחוז שינוי בין שני רבעונים",
    difficulty: 3,
    groupOrder: 1,
    body: "באיזה אחוז גדלה צריכת המים של נס ציונה בין רבעון 1 לרבעון 3?",
    choices: ["20%", "25%", "15%", "5%"],
    correctAnswer: 1,
    explanation:
      'צריכת נס ציונה ברבעון 1 הייתה 400 וברבעון 3 הייתה 500 (אלפי מ"ק). אחוז השינוי נמדד ביחס לערך ההתחלתי: $\\dfrac{500-400}{400}\\times100\\%=25\\%$. התשובה 20% מתקבלת מחלוקת ההפרש (100) בערך הסופי (500) במקום ההתחלתי: $100/500=20\\%$. התשובה 15% משווה בטעות לרבעון 2 (460) במקום רבעון 3: $(460-400)/400=15\\%$. התשובה 5% משווה בטעות לרבעון 4 (420): $(420-400)/400=5\\%$.',
  },
  {
    section: "quant",
    topic: "הסקת מתרשים",
    subtopic: "השוואה ישירה בין שני ישובים בנקודת זמן קבועה",
    difficulty: 3,
    groupOrder: 2,
    body: 'כמה אלפי מ"ק יותר צרכה רחובות מיבנה ברבעון 2?',
    choices: ["250", "270", "350", "90"],
    correctAnswer: 1,
    explanation:
      'ברבעון 2 צרכה רחובות 550 אלפי מ"ק ויבנה צרכה 280 אלפי מ"ק. ההפרש: $550-280=270$. התשובה 250 משווה בטעות את רבעון 1 של שני הישובים ($500-250$). התשובה 350 משווה בטעות את רבעון 3 ($650-300$). התשובה 90 מבלבלת בין יבנה לנס ציונה ברבעון 2: $550-460=90$.',
  },
  {
    section: "quant",
    topic: "הסקת מתרשים",
    subtopic: "יחס בין שני תאים בטבלה",
    difficulty: 4,
    groupOrder: 3,
    body: "מה היחס בין צריכת המים של גדרה לצריכת המים של רחובות ברבעון 1?",
    choices: ["5:2", "1:2", "2:5", "21:52"],
    correctAnswer: 2,
    explanation:
      'ברבעון 1 צרכה גדרה 200 ורחובות 500 (אלפי מ"ק). היחס גדרה:רחובות הוא $200:500$, המצטמצם ל-$2:5$. התשובה 5:2 היא היחס ההפוך. התשובה 1:2 מתקבלת משימוש בטעות בנתוני יבנה (250) במקום גדרה: $250:500=1:2$. התשובה 21:52 מתקבלת משימוש בעמודת רבעון 4 במקום רבעון 1: $210:520=21:52$.',
  },
  {
    section: "quant",
    topic: "הסקת מתרשים",
    subtopic: "קביעה שחייבת להיות נכונה על סמך כלל הנתונים",
    difficulty: 5,
    groupOrder: 4,
    body: "איזו מהקביעות הבאות בהכרח נכונה על פי נתוני הטבלה?",
    choices: [
      "בכל הרבעונים, נס ציונה צרכה לפחות פי 2 מיבנה.",
      "צריכת המים של גדרה עלתה בכל רבעון לעומת הרבעון הקודם.",
      "בכל אחד מארבעת הרבעונים, רחובות צרכה יותר מים מכל ישוב אחר בטבלה.",
      "ברבעון 3 צרכו כל הישובים יחד יותר ממחצית מסך הצריכה השנתית הכוללת של כל הישובים.",
    ],
    correctAnswer: 2,
    explanation:
      'בדיקה של כל רבעון מראה שרחובות היא הישוב עם הצריכה הגבוהה ביותר בכל אחד מהם: רבעון 1 — 500 (מול 400, 250, 200); רבעון 2 — 550 (מול 460, 280, 230); רבעון 3 — 650 (מול 500, 300, 260); רבעון 4 — 520 (מול 420, 270, 210). לכן הקביעה השלישית נכונה בהכרח. הקביעה הראשונה שגויה: ברבעון 1, פי 2 מיבנה (250) הוא 500, ונס ציונה צרכה רק 400 — פחות מכך. הקביעה השנייה שגויה: צריכת גדרה עלתה מרבעון 1 לרבעון 2 (200→230) ומרבעון 2 לרבעון 3 (230→260), אך ירדה מרבעון 3 לרבעון 4 (260→210). הקביעה הרביעית שגויה: סך הצריכה ברבעון 3 הוא $650+500+300+260=1{,}710$, בעוד מחצית מהסך השנתי הכולל (6,000) היא 3,000 — 1,710 קטן משמעותית מכך.',
  },
  {
    section: "quant",
    topic: "הסקת מתרשים",
    subtopic: "סכום משולב וממוצע על פני כל הישובים",
    difficulty: 4,
    groupOrder: 5,
    body: 'בהתבסס על סך צריכת המים השנתית של כל ארבעת הישובים גם יחד, מה הצריכה הממוצעת לרבעון (באלפי מ"ק)?',
    choices: ["6,000", "1,500", "1,350", "1,710"],
    correctAnswer: 1,
    explanation:
      'סך צריכת המים השנתית של כל ארבעת הישובים גם יחד: $2{,}220+1{,}780+1{,}100+900=6{,}000$ אלפי מ"ק. מכיוון שיש ארבעה רבעונים, הצריכה הממוצעת לרבעון היא $6{,}000/4=1{,}500$. התשובה 6,000 היא הסכום הכולל ללא חלוקה ב-4. התשובה 1,350 היא סך הצריכה של כל הישובים ברבעון 1 בלבד. התשובה 1,710 היא סך הצריכה של כל הישובים ברבעון 3 בלבד.',
  },
];

async function main() {
  const supabase = getSupabaseAdminClient();
  if (!supabase) {
    console.error("NEXT_PUBLIC_SUPABASE_URL / SUPABASE_SERVICE_ROLE_KEY are not set — aborting.");
    process.exitCode = 1;
    return;
  }

  if (QUESTIONS.length !== 6) {
    console.error(`Expected exactly 6 questions, found ${QUESTIONS.length} — aborting.`);
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

  console.log(`Inserting a 6-question data-interpretation block (group_id ${groupId}) into the shared question bank...`);

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
