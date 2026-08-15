/**
 * Adds 8 original Quantitative questions matching specific NITE question
 * *formats* not yet represented in the bank — cryptarithmetic (letter/digit
 * substitution puzzles), factorial/exponent algebraic equations, and
 * compound-figure geometry — without copying any real exam's wording,
 * numbers, or diagrams. Every question is original content authored for
 * this app; only the *style* is modeled on the real test.
 *
 * Geometry questions here are fully specified in words (no image/diagram
 * column exists on `questions` — see supabase/schema.sql's note on this
 * table — so every figure is described precisely enough to solve without
 * seeing a picture, the same approach scripts/seed-quant-20.ts already
 * uses for its "צורות משולבות" question).
 *
 * Cryptarithmetic questions are posed as "which claim is necessarily true"
 * deductions (matching real NITE style) rather than "solve for the exact
 * digit," except where the equation is linear and has a single forced
 * solution — both kinds are proven algebraically in the explanation, not
 * just asserted.
 *
 * Usage:
 *   npx tsx --env-file=.env.local scripts/seed-quant-advanced-formats.ts
 *
 * Requires NEXT_PUBLIC_SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY (see
 * .env.local.example). No ANTHROPIC_API_KEY needed.
 */

import { createClient, type SupabaseClient } from "@supabase/supabase-js";
import WS from "ws";
import type { Question } from "@/types";

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

type HardcodedQuestion = Omit<Question, "id" | "createdAt" | "passage" | "type" | "media">;

const QUANT_QUESTIONS: HardcodedQuestion[] = [
  // --- Cryptarithmetic (letter/digit substitution) ---
  {
    section: "quant",
    topic: "קריפטואריתמטיקה",
    subtopic: "זוגיות ותכונות ספרות",
    difficulty: 4,
    body: "A, B, C ו-D הן ספרות שונות זו מזו, כל אחת בין 1 ל-9. נתון כי $\\overline{AB} + \\overline{AB} = \\overline{CD}$, כאשר $\\overline{AB}$ ו-$\\overline{CD}$ הם מספרים דו-ספרתיים (כלומר $\\overline{AB}$ קטן מ-50). איזו מהטענות הבאות נכונה בהכרח?",
    choices: [
      "D היא בהכרח ספרה זוגית",
      "C היא בהכרח ספרה זוגית",
      "A גדולה בהכרח מ-C",
      "B היא בהכרח ספרה אי-זוגית",
    ],
    correctAnswer: 0,
    explanation:
      "הביטוי $\\overline{AB}+\\overline{AB}$ שווה ל-$2\\times\\overline{AB}=2\\times(10A+B)=20A+2B$. ספרת האחדות של התוצאה — כלומר D — נקבעת אך ורק על ידי ספרת האחדות של $2B$, מכיוון ש-$20A$ הוא כפולה של 10 ואינו משפיע על ספרת האחדות. מכיוון ש-$2B$ הוא תמיד מספר זוגי, גם ספרת האחדות שלו — D — היא תמיד ספרה זוגית, ללא תלות בערכים הספציפיים של A ו-B. לדוגמה: עבור $A=1,B=3$ מתקבל $\\overline{AB}=13$, ו-$2\\times13=26$, כך ש-$C=2,D=6$ — ואכן D זוגית. שאר הטענות (לגבי C, יחס הגודל בין A ל-C, או זוגיות B) אינן נובעות בהכרח מהנתונים.",
  },
  {
    section: "quant",
    topic: "קריפטואריתמטיקה",
    subtopic: "תכונות הפרש ספרות",
    difficulty: 4,
    body: "M ו-N הן ספרות שונות זו מזו, כאשר $\\overline{MN}$ הוא מספר דו-ספרתי (כלומר $M\\ne0$) וגם $M>N$. איזו מהטענות הבאות על הביטוי $\\overline{MN}-\\overline{NM}$ נכונה בהכרח?",
    choices: [
      "התוצאה היא תמיד כפולה של 9",
      "התוצאה היא תמיד כפולה של 11",
      "התוצאה היא תמיד מספר אי-זוגי",
      "התוצאה תלויה רק ב-M ולא ב-N",
    ],
    correctAnswer: 0,
    explanation:
      "$\\overline{MN}=10M+N$ ו-$\\overline{NM}=10N+M$. ההפרש ביניהם הוא $(10M+N)-(10N+M)=9M-9N=9(M-N)$ — כלומר תמיד כפולה של 9, ללא תלות בערכים הספציפיים של M ו-N (כל עוד $M>N$). לדוגמה: $\\overline{52}-\\overline{25}=52-25=27=9\\times3$, וגם $\\overline{83}-\\overline{38}=83-38=45=9\\times5$ — שני המקרים אכן כפולות של 9.",
  },
  {
    section: "quant",
    topic: "קריפטואריתמטיקה",
    subtopic: "פתרון משוואת ספרות",
    difficulty: 4,
    body: "הספרה K (בין 0 ל-9) מקיימת: מספר דו-ספרתי שספרת העשרות שלו K וספרת האחדות שלו 3 (כלומר $\\overline{K3}$), מוכפל ב-3, ותוצאת ההכפלה שווה למספר תלת-ספרתי שספרת המאות שלו 1, ספרת העשרות K וספרת האחדות 9 (כלומר $\\overline{1K9}$). מהו K?",
    choices: ["5", "3", "4", "6"],
    correctAnswer: 0,
    explanation:
      "$\\overline{K3}=10K+3$, ולאחר הכפלה ב-3: $3(10K+3)=30K+9$. $\\overline{1K9}=100+10K+9=109+10K$. משווים: $30K+9=109+10K$. מעבירים אגפים: $20K=100$, ומכאן $K=5$. בדיקה: $\\overline{53}\\times3=159=\\overline{159}$ — ואכן ספרת העשרות של 159 היא 5, כנדרש.",
  },

  // --- Factorial / exponent algebraic equations ---
  {
    section: "quant",
    topic: "אלגברה",
    subtopic: "משוואות עצרת (פקטוריאל)",
    difficulty: 4,
    body: "נתון: $48! \\cdot 49! = (48!)^2 \\cdot x^2$, כאשר $x$ חיובי. מהו $x$?",
    choices: ["7", "48", "49", "24"],
    correctAnswer: 0,
    explanation:
      "$49!=49\\times48!$, ולכן $48!\\times49!=48!\\times(49\\times48!)=49\\times(48!)^2$. משווים לאגף הימני: $49\\times(48!)^2=(48!)^2\\times x^2$. מחלקים את שני האגפים ב-$(48!)^2$: $x^2=49$, ומכיוון ש-$x$ חיובי: $x=7$.",
  },
  {
    section: "quant",
    topic: "אלגברה",
    subtopic: "משוואות מעריכיות",
    difficulty: 4,
    body: "נתון $2^{x+3} = 4^{x-1} \\cdot 8$. מהו $x$?",
    choices: ["2", "1", "3", "4"],
    correctAnswer: 0,
    explanation:
      "מבטאים את כל האגפים בבסיס 2: $4^{x-1}=(2^2)^{x-1}=2^{2x-2}$, ו-$8=2^3$. לכן האגף הימני שווה ל-$2^{2x-2}\\times2^3=2^{2x+1}$. משווים מעריכים (מכיוון שהבסיסים שווים): $x+3=2x+1$. פותרים: $x=2$. בדיקה: $2^{2+3}=2^5=32$, ו-$4^{2-1}\\times8=4\\times8=32$ — שני האגפים שווים.",
  },
  {
    section: "quant",
    topic: "אלגברה",
    subtopic: "יחס עצרות ופתרון למשתנה",
    difficulty: 4,
    body: "נתון $\\dfrac{n!}{(n-2)!}=90$. מהו הערך של $n$ (כאשר $n$ הוא מספר טבעי גדול מ-2)?",
    choices: ["10", "9", "11", "8"],
    correctAnswer: 0,
    explanation:
      "$\\dfrac{n!}{(n-2)!}=n\\times(n-1)$ (מצמצמים את כל האיברים המשותפים). נתון ש-$n(n-1)=90$ — זוהי המשוואה הריבועית $n^2-n-90=0$. מחפשים שני מספרים עוקבים שמכפלתם 90: אלו 10 ו-9 ($10\\times9=90$). מכיוון ש-$n$ הוא הגדול מביניהם (כי $n>n-1$), מתקבל $n=10$.",
  },

  // --- Geometry with a fully-specified compound figure ---
  {
    section: "quant",
    topic: "גיאומטריה",
    subtopic: "צורות מורכבות עם משולשים שווי-צלעות",
    difficulty: 4,
    body: 'ריבוע שאורך צלעו 10 ס"מ. על כל אחת מארבע צלעות הריבוע נבנה משולש שווה-צלעות הפונה כלפי חוץ (ארבעה משולשים זהים, אחד לכל צלע), ויחד עם הריבוע הם יוצרים צורת "כוכב". מהו שטח הכוכב כולו (הריבוע וארבעת המשולשים יחד)?',
    choices: ['$100+100\\sqrt3$ סמ"ר', '$100+25\\sqrt3$ סמ"ר', '$100\\sqrt3$ סמ"ר', '$400+100\\sqrt3$ סמ"ר'],
    correctAnswer: 0,
    explanation:
      'שטח הריבוע הוא $10^2=100$ סמ"ר. שטח משולש שווה-צלעות שאורך צלעו $a$ נתון על ידי $A=\\dfrac{\\sqrt3}{4}a^2$ — כאן $a=10$: $A=\\dfrac{\\sqrt3}{4}\\times100=25\\sqrt3$ סמ"ר לכל משולש. יש ארבעה משולשים זהים, ולכן שטחם הכולל הוא $4\\times25\\sqrt3=100\\sqrt3$ סמ"ר. שטח הכוכב הכולל הוא $100+100\\sqrt3$ סמ"ר.',
  },
  {
    section: "quant",
    topic: "גיאומטריה",
    subtopic: "יחס שטחים במעגלים משולבים",
    difficulty: 4,
    body: "מעגל שרדיוסו $R$ חוסם ריבוע (כלומר קודקודי הריבוע נמצאים על היקף המעגל). בתוך אותו ריבוע חסום מעגל נוסף, המשיק לארבע צלעותיו. מהו היחס בין שטח המעגל החיצוני לשטח המעגל הפנימי?",
    choices: ["2:1", "√2:1", "4:1", "3:2"],
    correctAnswer: 0,
    explanation:
      "קוטר המעגל החיצוני שווה לאלכסון הריבוע: $2R$. אם צלע הריבוע היא $s$, האלכסון שווה ל-$s\\sqrt2$, ולכן $s\\sqrt2=2R$, כלומר $s=\\dfrac{2R}{\\sqrt2}=R\\sqrt2$. המעגל הפנימי (החסום בריבוע ומשיק לצלעותיו) קוטרו שווה לצלע הריבוע, כך שרדיוסו הוא $\\dfrac{R\\sqrt2}{2}=\\dfrac{R}{\\sqrt2}$. שטח המעגל החיצוני הוא $\\pi R^2$, ושטח המעגל הפנימי הוא $\\pi\\left(\\dfrac{R}{\\sqrt2}\\right)^2=\\dfrac{\\pi R^2}{2}$. היחס בין השטחים הוא $\\pi R^2:\\dfrac{\\pi R^2}{2}=2:1$.",
  },
];

async function main() {
  const supabase = getSupabaseAdminClient();
  if (!supabase) {
    console.error("NEXT_PUBLIC_SUPABASE_URL / SUPABASE_SERVICE_ROLE_KEY are not set — aborting.");
    process.exitCode = 1;
    return;
  }

  if (QUANT_QUESTIONS.length !== 8) {
    console.error(`Expected exactly 8 questions, found ${QUANT_QUESTIONS.length} — aborting.`);
    process.exitCode = 1;
    return;
  }

  // Column names/set match the `questions` table as it actually exists in
  // Supabase — `options`/`correct_index` rather than `choices`/
  // `correct_answer` (see supabase/schema.sql's comment on this table).
  const now = new Date().toISOString();
  const rows = QUANT_QUESTIONS.map((q) => ({
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
  }));

  console.log(`Inserting ${rows.length} new NITE-format quant questions into the shared question bank...`);
  const bySubtopic = new Map<string, number>();
  for (const q of QUANT_QUESTIONS) bySubtopic.set(q.subtopic, (bySubtopic.get(q.subtopic) ?? 0) + 1);
  for (const [subtopic, count] of bySubtopic) console.log(`  ${subtopic}: ${count}`);

  const { error } = await supabase.from("questions").insert(rows);
  if (error) {
    console.error("Insert failed:", error.message);
    process.exitCode = 1;
    return;
  }

  console.log(`Done. ${rows.length} questions inserted.`);
}

main();
