/**
 * Inserts a small, hand-written, hand-verified set of psychometric
 * questions directly into Supabase's `questions` table — no Claude API
 * calls, no generation cost. A stopgap for populating the bank (see
 * lib/exam-fetcher.ts / app/api/exam/allocate/route.ts) while
 * scripts/seed-question-bank.ts's AI generation is blocked on API credits.
 *
 * Usage:
 *   npx tsx --env-file=.env.local scripts/seed-hardcoded-questions.ts
 *
 * Requires NEXT_PUBLIC_SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY (see
 * .env.local.example). No ANTHROPIC_API_KEY needed — this script never
 * calls the model.
 */

import { createClient, type SupabaseClient } from "@supabase/supabase-js";
import WS from "ws";
import type { Question } from "@/types";

// See scripts/seed-question-bank.ts for why this polyfill is needed: Node
// versions below 22 have no native global WebSocket, and
// @supabase/supabase-js's client constructor throws without one even
// though this script only ever does plain REST insert/select calls.
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

type HardcodedQuestion = Omit<Question, "id" | "createdAt">;

// Topic/subtopic pairs deliberately match scripts/seed-question-bank.ts's
// collectSeedTopics() taxonomy (lib/mock-data.ts + lib/cheatsheets.ts), so
// these rows sit naturally alongside anything generated later. Every
// numeric answer below was computed and double-checked by hand.
const HARDCODED_QUESTIONS: HardcodedQuestion[] = [
  // --- Quantitative ---
  {
    section: "quant",
    topic: "ממוצעים",
    subtopic: "ממוצע משוקלל",
    difficulty: 3,
    type: "mcq",
    body: "בקבוצה A יש 20 תלמידים עם ציון ממוצע של 70. בקבוצה B יש 30 תלמידים עם ציון ממוצע של 90. מה הממוצע הכללי של שתי הקבוצות יחד?",
    passage: null,
    choices: ["78", "80", "82", "85"],
    correctAnswer: 2,
    explanation:
      "סכום הציונים בקבוצה A הוא $20 \\times 70 = 1400$, וסכום הציונים בקבוצה B הוא $30 \\times 90 = 2700$. סך כל הציונים הוא $1400+2700=4100$, ומספר התלמידים הכולל הוא $20+30=50$. הממוצע הכללי הוא $4100 / 50 = 82$. טעות נפוצה היא לחשב ממוצע פשוט של שני הממוצעים ($(70+90)/2=80$) בלי להתחשב בגדלים השונים של הקבוצות.",
    media: null,
  },
  {
    section: "quant",
    topic: "אלגברה",
    subtopic: "חזקות ושורשים",
    difficulty: 2,
    type: "mcq",
    body: "מהו הערך של $\\sqrt{144} + 3^2$?",
    passage: null,
    choices: ["18", "21", "24", "15"],
    correctAnswer: 1,
    explanation: "$\\sqrt{144}=12$ ו-$3^2=9$. הסכום הוא $12+9=21$.",
    media: null,
  },
  {
    section: "quant",
    topic: "אלגברה",
    subtopic: "משוואה ריבועית",
    difficulty: 3,
    type: "mcq",
    body: "מהם פתרונות המשוואה $x^2 - 5x + 6 = 0$?",
    passage: null,
    choices: ["$x=2$ או $x=3$", "$x=1$ או $x=6$", "$x=-2$ או $x=-3$", "$x=2$ או $x=-3$"],
    correctAnswer: 0,
    explanation:
      "יש לפרק את הביטוי לגורמים: מחפשים שני מספרים שסכומם 5 ומכפלתם 6 — אלו הם 2 ו-3. לכן $x^2-5x+6=(x-2)(x-3)=0$, ומכאן $x=2$ או $x=3$.",
    media: null,
  },
  {
    section: "quant",
    topic: "גיאומטריה",
    subtopic: "משפט פיתגורס",
    difficulty: 2,
    type: "mcq",
    body: "במשולש ישר-זווית, אורכי הניצבים הם 6 ו-8. מה אורך היתר?",
    passage: null,
    choices: ["9", "10", "12", "14"],
    correctAnswer: 1,
    explanation: "לפי משפט פיתגורס, $a^2+b^2=c^2$. לכן $6^2+8^2=36+64=100$, ו-$c=\\sqrt{100}=10$.",
    media: null,
  },
  {
    section: "quant",
    topic: "גיאומטריה",
    subtopic: "שטח והיקף מעגל",
    difficulty: 3,
    type: "mcq",
    body: 'רדיוס של מעגל הוא 5 ס"מ. מהו שטח המעגל?',
    passage: null,
    choices: ['$10\\pi$ סמ"ר', '$25\\pi$ סמ"ר', '$5\\pi$ סמ"ר', '$50\\pi$ סמ"ר'],
    correctAnswer: 1,
    explanation:
      "שטח מעגל נתון על ידי $A=\\pi r^2$. עבור $r=5$: $A=\\pi \\times 5^2 = 25\\pi$. טעות נפוצה היא להשתמש בנוסחת ההיקף ($2\\pi r$) במקום בנוסחת השטח.",
    media: null,
  },
  {
    section: "quant",
    topic: "בעיות תנועה ועבודה",
    subtopic: "עבודה משותפת",
    difficulty: 4,
    type: "mcq",
    body: "פועל א' מסיים עבודה מסוימת לבדו ב-4 שעות, ופועל ב' מסיים את אותה עבודה לבדו ב-6 שעות. כמה זמן ייקח להם לסיים את העבודה יחד?",
    passage: null,
    choices: ["2.4 שעות", "2 שעות", "5 שעות", "3 שעות"],
    correctAnswer: 0,
    explanation:
      "קצב העבודה של פועל א' הוא $\\dfrac{1}{4}$ עבודה לשעה, ושל פועל ב' הוא $\\dfrac{1}{6}$ עבודה לשעה. יחד: $\\dfrac{1}{4}+\\dfrac{1}{6}=\\dfrac{3}{12}+\\dfrac{2}{12}=\\dfrac{5}{12}$ עבודה לשעה. הזמן הדרוש הוא ההופכי: $\\dfrac{12}{5}=2.4$ שעות.",
    media: null,
  },
  {
    section: "quant",
    topic: "אחוזים",
    subtopic: "אחוז שינוי",
    difficulty: 2,
    type: "mcq",
    body: 'מחיר מוצר עלה מ-200 ש"ח ל-250 ש"ח. באיזה אחוז עלה המחיר?',
    passage: null,
    choices: ["20%", "25%", "30%", "50%"],
    correctAnswer: 1,
    explanation:
      "אחוז השינוי מחושב לפי $\\dfrac{250-200}{200}\\times 100 = \\dfrac{50}{200}\\times100=25\\%$. יש לחלק תמיד בערך המקורי (200), לא בערך החדש.",
    media: null,
  },
  {
    section: "quant",
    topic: "הסתברות וקומבינטוריקה",
    subtopic: "הסתברות בסיסית",
    difficulty: 3,
    type: "mcq",
    body: "בכיס יש 3 כדורים אדומים ו-5 כדורים כחולים. אם מוציאים כדור אחד באקראי, מה ההסתברות שהכדור יהיה אדום?",
    passage: null,
    choices: ["$\\dfrac{3}{8}$", "$\\dfrac{5}{8}$", "$\\dfrac{3}{5}$", "$\\dfrac{1}{3}$"],
    correctAnswer: 0,
    explanation: "סך כל הכדורים בכיס הוא $3+5=8$. ההסתברות להוציא כדור אדום היא מספר הכדורים האדומים חלקי הסך הכל: $\\dfrac{3}{8}$.",
    media: null,
  },

  // --- Verbal ---
  {
    section: "verbal",
    topic: "הבנה והבעה",
    subtopic: "השלמת משפטים",
    difficulty: 2,
    type: "mcq",
    body: "למרות ה_____ הרב שהשקיע בלימודים, הוא לא הצליח לעבור את המבחן.",
    passage: null,
    choices: ["מאמץ", "עצלות", "שמחה", "כעס"],
    correctAnswer: 0,
    explanation:
      'המילה "למרות" מרמזת על ניגוד — משהו חיובי שלא הביא לתוצאה הצפויה. "מאמץ" הוא היחיד שמתאים להקשר של השקעה בלימודים, ויוצר את הניגוד המתבקש מול אי-ההצלחה במבחן.',
    media: null,
  },
  {
    section: "verbal",
    topic: "חשיבה לוגית",
    subtopic: "היסק",
    difficulty: 3,
    type: "mcq",
    body: "כל התלמידים בכיתה למדו לקראת הבחינה. דנה היא תלמידה בכיתה. מה ניתן להסיק מכך בוודאות?",
    passage: null,
    choices: ["דנה למדה לקראת הבחינה", "דנה תעבור את הבחינה בהצלחה", "דנה לא למדה לקראת הבחינה", "אי אפשר להסיק דבר"],
    correctAnswer: 0,
    explanation:
      "הנחת היסוד קובעת שכל התלמידים בכיתה למדו, ודנה היא תלמידה בכיתה — לכן מתחייב מכך שדנה למדה. אין מידע על הצלחה בבחינה, כך שאי אפשר להסיק את זה.",
    media: null,
  },
  {
    section: "verbal",
    topic: "הבנת הנקרא",
    subtopic: "הסקת מסקנות",
    difficulty: 3,
    type: "mcq_with_passage",
    body: "מה ניתן להסיק מהקטע?",
    passage:
      "מחקרים מראים כי אנשים שישנים פחות משש שעות בלילה נוטים לסבול מירידה בריכוז וביכולת קבלת ההחלטות למחרת. עם זאת, אותם מחקרים מציינים כי שינה של יותר מתשע שעות עלולה גם היא להיות מקושרת לתחושת עייפות מוגברת.",
    choices: [
      "קיים טווח שינה מומלץ, וסטייה ממנו לשני הכיוונים עלולה לפגוע בתפקוד",
      "ככל שישנים יותר, התפקוד היומי משתפר",
      "שינה אינה משפיעה על יכולת קבלת ההחלטות",
      "יש לישון לפחות תשע שעות בכל לילה",
    ],
    correctAnswer: 0,
    explanation:
      "הקטע מתאר שני כיוונים — גם שינה מועטה מדי וגם שינה מרובה מדי קשורות לפגיעה בתפקוד, מה שמרמז על קיומו של טווח מיטבי ולא על כלל של 'יותר תמיד טוב יותר'.",
    media: null,
  },
  {
    section: "verbal",
    topic: "חשיבה לוגית",
    subtopic: "קבוצות והיסק",
    difficulty: 4,
    type: "mcq",
    body: "בכיתה יש 30 תלמידים. 18 מהם לומדים אנגלית, 15 לומדים צרפתית, ו-8 לומדים את שתי השפות. כמה תלמידים אינם לומדים אף אחת מהשפות?",
    passage: null,
    choices: ["3", "5", "7", "10"],
    correctAnswer: 1,
    explanation:
      "מספר התלמידים הלומדים לפחות שפה אחת הוא $18+15-8=25$ (מחסירים את החופפים כדי לא לספור אותם פעמיים). לכן מספר התלמידים שאינם לומדים אף שפה הוא $30-25=5$.",
    media: null,
  },
  {
    section: "verbal",
    topic: "הבנה והבעה",
    subtopic: "השלמת משפטים",
    difficulty: 3,
    type: "mcq",
    body: "היא ניגשה למבחן בביטחון רב, אך ה_____ שחשה כשראתה את השאלות הקשות גרם לה לאבד את הריכוז.",
    passage: null,
    choices: ["הלם", "שמחה", "גאווה", "שעמום"],
    correctAnswer: 0,
    explanation:
      'המילה "אך" מציינת ניגוד לביטחון שהיא הרגישה בתחילה. "הלם" הוא הרגש היחיד מבין האפשרויות שמתאים לתגובה שלילית פתאומית שגורמת לאובדן ריכוז.',
    media: null,
  },
  {
    section: "verbal",
    topic: "הבנת הנקרא",
    subtopic: "הסקת מסקנות",
    difficulty: 3,
    type: "mcq_with_passage",
    body: "מה ניתן להסיק מהקטע?",
    passage:
      "בשנים האחרונות חלה עלייה משמעותית במספר החברות המאמצות עבודה מהבית. רבות מהן מדווחות על עלייה בפריון העובדים, לצד קשיים בשמירה על תחושת שייכות ארגונית וחיבור בין עמיתים.",
    choices: [
      "לעבודה מהבית יש גם יתרונות וגם חסרונות",
      "עבודה מהבית פוגעת תמיד בפריון העובדים",
      "כל החברות עברו לעבודה מהבית",
      "תחושת השייכות אינה חשובה לארגונים",
    ],
    correctAnswer: 0,
    explanation:
      "הקטע מזכיר במפורש עלייה בפריון (יתרון) לצד קשיים בתחושת השייכות (חיסרון) — כלומר לעבודה מהבית תמונה מעורבת, לא חד-משמעית.",
    media: null,
  },
  {
    section: "verbal",
    topic: "חשיבה לוגית",
    subtopic: "היסק",
    difficulty: 3,
    type: "mcq",
    body: "בספרייה כל הספרים ממוינים לפי נושא. ספר על היסטוריה נמצא במדף המתמטיקה. מה ניתן להסיק מכך?",
    passage: null,
    choices: ["חל שיבוש בסידור הספרים", "הספר עוסק גם במתמטיקה", "הספרייה אינה ממוינת כלל", "אין ספרים נוספים בנושא היסטוריה"],
    correctAnswer: 0,
    explanation:
      "אם כל הספרים אמורים להיות ממוינים לפי נושא, ומצאנו ספר היסטוריה במדף הלא נכון, המסקנה ההגיונית היחידה היא שנפלה טעות בסידור — לא ניתן להסיק מכך על תוכן הספר או על הספרייה כולה.",
    media: null,
  },
  {
    section: "verbal",
    topic: "חשיבה לוגית",
    subtopic: "קבוצות והיסק",
    difficulty: 4,
    type: "mcq",
    body: "מתוך 50 אנשים שנשאלו, 32 ציינו שהם אוהבים קפה ו-28 ציינו שהם אוהבים תה. 15 מהם ציינו שהם אוהבים גם קפה וגם תה. כמה מהנשאלים אינם אוהבים אף אחד מהמשקאות?",
    passage: null,
    choices: ["3", "5", "8", "10"],
    correctAnswer: 1,
    explanation: "מספר האנשים שאוהבים לפחות משקה אחד הוא $32+28-15=45$. לכן מספר האנשים שאינם אוהבים אף אחד מהם הוא $50-45=5$.",
    media: null,
  },

  // --- English ---
  {
    section: "english",
    topic: "Sentence Completion",
    subtopic: "Contrast Structures",
    difficulty: 3,
    type: "mcq",
    body: "Although the weather forecast predicted heavy rain, the outdoor concert was ______ attended.",
    passage: null,
    choices: ["poorly", "well", "barely", "rarely"],
    correctAnswer: 1,
    explanation:
      '"Although" signals a contrast between the expectation (bad weather, likely poor attendance) and the actual result. "Well" attended creates that expected contrast — despite the rain forecast, many people still came.',
    media: null,
  },
  {
    section: "english",
    topic: "Restatement",
    subtopic: "Meaning Preservation",
    difficulty: 3,
    type: "mcq",
    body: 'Which sentence best restates the following without changing its meaning?\n\nOriginal: "Despite her lack of experience, she managed to complete the project successfully."',
    passage: null,
    choices: [
      "She completed the project successfully although she was inexperienced.",
      "She failed to complete the project because of her inexperience.",
      "She was experienced enough to complete the project easily.",
      "The project was completed despite being unsuccessful.",
    ],
    correctAnswer: 0,
    explanation:
      "The original states that a lack of experience did not prevent success. Option A preserves this exact relationship (success despite inexperience). The other options reverse the meaning or introduce ideas not present in the original.",
    media: null,
  },
  {
    section: "english",
    topic: "Reading Comprehension",
    subtopic: "Main Idea",
    difficulty: 3,
    type: "mcq_with_passage",
    body: "What is the main idea of the passage?",
    passage:
      "Bees play a crucial role in agriculture by pollinating a wide variety of crops. Without their pollination services, many fruits and vegetables would become far more expensive or even unavailable. In recent years, declining bee populations due to pesticides and habitat loss have raised concerns among farmers and scientists alike.",
    choices: [
      "Bees are vital to agriculture, and their declining population is a growing concern.",
      "Pesticides are the only cause of declining bee populations.",
      "Fruits and vegetables can be grown without any pollination.",
      "Farmers no longer rely on bees for their crops.",
    ],
    correctAnswer: 0,
    explanation:
      "The passage's central point combines two ideas: bees are essential for agricultural pollination, and their population decline is worrying farmers and scientists. Option A captures both parts; the others overstate a detail or contradict the passage.",
    media: null,
  },
  {
    section: "english",
    topic: "Vocabulary",
    subtopic: "Prefixes: un-",
    difficulty: 2,
    type: "mcq",
    body: "The instructions were so ______ that nobody could figure out how to assemble the furniture.",
    passage: null,
    choices: ["unclear", "clearly", "clearness", "clearing"],
    correctAnswer: 0,
    explanation:
      'The prefix "un-" reverses the meaning of "clear," giving "unclear" — the only option that is both grammatically correct as an adjective here and matches the context of confusing instructions.',
    media: null,
  },
  {
    section: "english",
    topic: "Vocabulary",
    subtopic: "Prefixes: re-",
    difficulty: 2,
    type: "mcq",
    body: "After the earthquake damaged the old building, the city decided to ______ it rather than tear it down.",
    passage: null,
    choices: ["rebuild", "disable", "prevent", "destroy"],
    correctAnswer: 0,
    explanation:
      '"Re-" means "again." "Rebuild" (build again) is the only option consistent with "rather than tear it down," which implies restoring the building instead of demolishing it.',
    media: null,
  },
  {
    section: "english",
    topic: "Vocabulary",
    subtopic: "Suffixes: -able/-ible",
    difficulty: 2,
    type: "mcq",
    body: "Her handwriting was barely ______, even with a magnifying glass.",
    passage: null,
    choices: ["legible", "visible", "audible", "edible"],
    correctAnswer: 0,
    explanation:
      '"Legible" (from Latin legere, "to read") uses the "-ible" suffix meaning "capable of being read." It is the only choice related to reading handwriting; the others describe sight, hearing, and eating.',
    media: null,
  },
  {
    section: "english",
    topic: "Vocabulary",
    subtopic: "Suffixes: -tion/-sion",
    difficulty: 2,
    type: "mcq",
    body: "The committee's ______ to postpone the meeting surprised everyone.",
    passage: null,
    choices: ["decision", "decide", "decisive", "deciding"],
    correctAnswer: 0,
    explanation:
      'The sentence needs a noun (subject of "surprised everyone," object of "the committee\'s"). "Decision" is the noun form of "decide," formed with the "-sion" suffix.',
    media: null,
  },
  {
    section: "english",
    topic: "Vocabulary",
    subtopic: "Suffixes: -less",
    difficulty: 3,
    type: "mcq",
    body: "Despite hours of searching, the detective's efforts were completely ______, and the missing files were never found.",
    passage: null,
    choices: ["fruitless", "fruity", "fruitful", "fruition"],
    correctAnswer: 0,
    explanation:
      'The suffix "-less" means "without." "Fruitless" (without fruit/result) fits an unsuccessful search — the files were never found, meaning the effort produced no result.',
    media: null,
  },
];

async function main() {
  const supabase = getSupabaseAdminClient();
  if (!supabase) {
    console.error("NEXT_PUBLIC_SUPABASE_URL / SUPABASE_SERVICE_ROLE_KEY are not set — aborting.");
    process.exitCode = 1;
    return;
  }

  // Column names/set match the `questions` table as it actually exists in
  // Supabase — `options`/`correct_index` rather than `choices`/
  // `correct_answer`, and no `type`/`passage`/`media` columns (the table
  // was hand-created via the Table Editor before supabase/schema.sql was
  // written, and diverged from it). The 3 reading-comprehension questions
  // above have their passage folded into `body` here, since there's
  // nowhere else to put it.
  const now = new Date().toISOString();
  const rows = HARDCODED_QUESTIONS.map((q) => ({
    id: crypto.randomUUID(),
    section: q.section,
    topic: q.topic,
    subtopic: q.subtopic,
    difficulty: q.difficulty,
    body: q.passage ? `${q.passage}\n\n${q.body}` : q.body,
    options: q.choices,
    correct_index: q.correctAnswer,
    explanation: q.explanation,
    created_at: now,
  }));

  console.log(`Inserting ${rows.length} hardcoded questions into the shared question bank...`);
  const bySection = new Map<string, number>();
  for (const q of HARDCODED_QUESTIONS) bySection.set(q.section, (bySection.get(q.section) ?? 0) + 1);
  for (const [section, count] of bySection) console.log(`  ${section}: ${count}`);

  const { error } = await supabase.from("questions").insert(rows);
  if (error) {
    console.error("Insert failed:", error.message);
    process.exitCode = 1;
    return;
  }

  console.log(`Done. ${rows.length} questions inserted.`);
}

main();
