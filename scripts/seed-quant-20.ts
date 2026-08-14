/**
 * Inserts 20 hand-written, hand-verified Quantitative questions directly
 * into Supabase's `questions` table — a focused, single-section top-up on
 * top of scripts/seed-hardcoded-questions.ts's smaller starter set, so
 * `/exam/quant` can draw a full non-overlapping 20-question exam straight
 * from the bank (see lib/exam-fetcher.ts) without falling back to live AI
 * generation. No Claude API calls, no generation cost.
 *
 * Usage:
 *   npx tsx --env-file=.env.local scripts/seed-quant-20.ts
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

type HardcodedQuestion = Omit<Question, "id" | "createdAt" | "passage" | "type" | "media">;

// Topics/subtopics deliberately reuse scripts/seed-hardcoded-questions.ts's
// existing quant taxonomy where it already fits (ממוצעים, אלגברה, גיאומטריה,
// בעיות תנועה ועבודה, אחוזים, הסתברות וקומבינטוריקה) and adds a handful of
// standard psychometric subtopics that set didn't cover yet (אי-שוויונות,
// סדרה חשבונית, נפח, זוויות, יחס ופרופורציה, בעיית גיל) — every numeric
// answer below was computed and double-checked by hand.
const QUANT_QUESTIONS: HardcodedQuestion[] = [
  {
    section: "quant",
    topic: "ממוצעים",
    subtopic: "ממוצע משוקלל",
    difficulty: 3,
    body: 'בקבוצה A יש 25 עובדים עם שכר ממוצע של 8,000 ש"ח. בקבוצה B יש 15 עובדים עם שכר ממוצע של 12,000 ש"ח. מה השכר הממוצע של כלל 40 העובדים יחד?',
    choices: ['9,000 ש"ח', '9,500 ש"ח', '10,000 ש"ח', '10,500 ש"ח'],
    correctAnswer: 1,
    explanation:
      "סכום השכר בקבוצה A הוא $25 \\times 8{,}000 = 200{,}000$, ובקבוצה B הוא $15 \\times 12{,}000 = 180{,}000$. סך השכר הכולל הוא $200{,}000+180{,}000=380{,}000$, ומספר העובדים הכולל הוא $25+15=40$. הממוצע הוא $380{,}000/40=9{,}500$. טעות נפוצה היא לחשב ממוצע פשוט של שני הממוצעים ($(8000+12000)/2=10000$) בלי להתחשב בגדלים השונים של הקבוצות.",
  },
  {
    section: "quant",
    topic: "ממוצעים",
    subtopic: "שינוי ממוצע בעקבות הוספת איבר",
    difficulty: 3,
    body: "ממוצע הציונים של 9 תלמידים בכיתה הוא 78. תלמיד נוסף הצטרף לכיתה וקיבל ציון 98. מהו הממוצע החדש של 10 התלמידים?",
    choices: ["79", "80", "81", "82"],
    correctAnswer: 1,
    explanation:
      "סכום הציונים של 9 התלמידים הוא $9 \\times 78 = 702$. לאחר הוספת התלמיד החדש: $702+98=800$, ומספר התלמידים הוא כעת 10. הממוצע החדש הוא $800/10=80$.",
  },
  {
    section: "quant",
    topic: "אלגברה",
    subtopic: "חזקות ושורשים",
    difficulty: 2,
    body: "מהו הערך של $\\sqrt{81} \\cdot 2^{3} \\div 3^{2}$?",
    choices: ["6", "8", "9", "12"],
    correctAnswer: 1,
    explanation:
      "מחשבים כל איבר בנפרד: $\\sqrt{81}=9$, $2^3=8$, $3^2=9$. מבצעים את הפעולות משמאל לימין: $9 \\times 8 = 72$, ולאחר מכן $72 \\div 9 = 8$.",
  },
  {
    section: "quant",
    topic: "אלגברה",
    subtopic: "משוואה ריבועית",
    difficulty: 3,
    body: "מהם פתרונות המשוואה $x^2 - 2x - 15 = 0$?",
    choices: ["$x=5$ או $x=-3$", "$x=-5$ או $x=3$", "$x=3$ או $x=5$", "$x=1$ או $x=-15$"],
    correctAnswer: 0,
    explanation:
      "יש לפרק לגורמים: מחפשים שני מספרים שסכומם $2$ ומכפלתם $-15$ — אלו הם $5$ ו-$-3$. לכן $x^2-2x-15=(x-5)(x+3)=0$, ומכאן $x=5$ או $x=-3$. בדיקה: $5+(-3)=2$ ו-$5\\times(-3)=-15$, כנדרש.",
  },
  {
    section: "quant",
    topic: "אלגברה",
    subtopic: "פירוק לגורמים",
    difficulty: 3,
    body: "מהו הערך של $97^2 - 3^2$, בעזרת נוסחת הפרש ריבועים?",
    choices: ["9,400", "9,409", "9,040", "8,900"],
    correctAnswer: 0,
    explanation:
      "לפי נוסחת הפרש ריבועים, $a^2-b^2=(a-b)(a+b)$. עבור $a=97, b=3$: $(97-3)(97+3)=94\\times100=9{,}400$. שיטה זו נמנעת מהצורך לחשב $97^2$ במלואו.",
  },
  {
    section: "quant",
    topic: "אלגברה",
    subtopic: "אי-שוויונות",
    difficulty: 3,
    body: "עבור אילו ערכי $x$ מתקיים אי-השוויון $3x - 7 > 2x + 4$?",
    choices: ["$x>11$", "$x<11$", "$x>-11$", "$x>3$"],
    correctAnswer: 0,
    explanation:
      "מעבירים אגפים: $3x-2x>4+7$, כלומר $x>11$. שימו לב שכיוון אי-השוויון לא מתהפך כאן מכיוון שלא הוכפל/חולק באגף כלשהו במספר שלילי.",
  },
  {
    section: "quant",
    topic: "אלגברה",
    subtopic: "סדרה חשבונית",
    difficulty: 3,
    body: "האיבר הראשון בסדרה חשבונית הוא 5, וההפרש הקבוע בין איברים עוקבים הוא 4. מהו האיבר ה-15 בסדרה?",
    choices: ["57", "61", "65", "60"],
    correctAnswer: 1,
    explanation:
      "הנוסחה לאיבר הכללי בסדרה חשבונית היא $a_n=a_1+(n-1)d$. עבור $a_1=5, d=4, n=15$: $a_{15}=5+(15-1)\\times4=5+56=61$.",
  },
  {
    section: "quant",
    topic: "גיאומטריה",
    subtopic: "שטח והיקף משולש",
    difficulty: 2,
    body: 'בסיסו של משולש הוא 10 ס"מ וגובהו (הניצב לבסיס) 6 ס"מ. מהו שטח המשולש?',
    choices: ['16 סמ"ר', '30 סמ"ר', '60 סמ"ר', '20 סמ"ר'],
    correctAnswer: 1,
    explanation: 'שטח משולש נתון על ידי $A=\\dfrac{1}{2}\\times b \\times h$. עבור $b=10, h=6$: $A=\\dfrac{1}{2}\\times10\\times6=30$ סמ"ר.',
  },
  {
    section: "quant",
    topic: "גיאומטריה",
    subtopic: "משפט פיתגורס",
    difficulty: 3,
    body: "במשולש ישר-זווית, אורך היתר הוא 13 ואורך אחד הניצבים הוא 5. מה אורך הניצב השני?",
    choices: ["10", "12", "14", "8"],
    correctAnswer: 1,
    explanation:
      "לפי משפט פיתגורס, $a^2+b^2=c^2$, כאשר $c$ הוא היתר. מכאן $b^2=c^2-a^2=13^2-5^2=169-25=144$, ולכן $b=\\sqrt{144}=12$.",
  },
  {
    section: "quant",
    topic: "גיאומטריה",
    subtopic: "שטח והיקף מעגל",
    difficulty: 2,
    body: 'קוטרו של מעגל הוא 14 ס"מ. מהו היקף המעגל (לפי $\\pi \\approx \\dfrac{22}{7}$)?',
    choices: ['44 ס"מ', '22 ס"מ', '88 ס"מ', '28 ס"מ'],
    correctAnswer: 0,
    explanation:
      'רדיוס המעגל הוא מחצית הקוטר: $r=14/2=7$. היקף המעגל הוא $C=2\\pi r=2\\times\\dfrac{22}{7}\\times7=44$ ס"מ.',
  },
  {
    section: "quant",
    topic: "גיאומטריה",
    subtopic: "נפח תיבה וקוביה",
    difficulty: 3,
    body: 'מהו נפחה של תיבה שאורכה 5 ס"מ, רוחבה 4 ס"מ וגובהה 3 ס"מ?',
    choices: ['12 סמ"ק', '60 סמ"ק', '120 סמ"ק', '47 סמ"ק'],
    correctAnswer: 1,
    explanation: 'נפח תיבה הוא מכפלת שלושת המידות: $V=l\\times w\\times h=5\\times4\\times3=60$ סמ"ק.',
  },
  {
    section: "quant",
    topic: "גיאומטריה",
    subtopic: "זוויות במשולש",
    difficulty: 2,
    body: "במשולש, שתיים מהזוויות הן 50° ו-70°. מהי גודל הזווית השלישית?",
    choices: ["50°", "60°", "70°", "80°"],
    correctAnswer: 1,
    explanation: "סכום הזוויות במשולש הוא תמיד $180°$. הזווית השלישית שווה ל-$180°-50°-70°=60°$.",
  },
  {
    section: "quant",
    topic: "בעיות תנועה ועבודה",
    subtopic: "עבודה משותפת",
    difficulty: 4,
    body: "צינור A ממלא בריכה ריקה לבדו ב-5 שעות. צינור B, כאשר הבריכה מלאה, מרוקן אותה לבדו ב-10 שעות. אם פותחים את שני הצינורות יחד על בריכה ריקה (A ממלא, B מרוקן), כמה זמן ייקח למלא את הבריכה?",
    choices: ["7.5 שעות", "10 שעות", "15 שעות", "6 שעות"],
    correctAnswer: 1,
    explanation:
      "קצב המילוי של צינור A הוא $\\dfrac{1}{5}$ בריכה לשעה, וקצב הריקון של צינור B הוא $\\dfrac{1}{10}$ בריכה לשעה — יש לחסר אותו כי הוא פועל בכיוון הפוך. הקצב המשולב הוא $\\dfrac{1}{5}-\\dfrac{1}{10}=\\dfrac{2}{10}-\\dfrac{1}{10}=\\dfrac{1}{10}$ בריכה לשעה. הזמן הדרוש הוא ההופכי: $10$ שעות.",
  },
  {
    section: "quant",
    topic: "בעיות תנועה ועבודה",
    subtopic: "מהירות זמן ומרחק",
    difficulty: 3,
    body: "מכונית נסעה 180 ק\"מ במהירות ממוצעת קבועה של 90 קמ\"ש. כמה זמן ארכה הנסיעה?",
    choices: ["1.5 שעות", "2 שעות", "2.5 שעות", "3 שעות"],
    correctAnswer: 1,
    explanation: 'הזמן מחושב לפי $t=\\dfrac{d}{v}$, כאשר $d$ המרחק ו-$v$ המהירות. עבור $d=180, v=90$: $t=180/90=2$ שעות.',
  },
  {
    section: "quant",
    topic: "אחוזים",
    subtopic: "אחוז שינוי",
    difficulty: 2,
    body: 'מחיר מוצר ירד מ-400 ש"ח ל-320 ש"ח. באיזה אחוז ירד המחיר?',
    choices: ["15%", "20%", "25%", "80%"],
    correctAnswer: 1,
    explanation:
      "אחוז השינוי מחושב לפי $\\dfrac{\\text{ערך ישן}-\\text{ערך חדש}}{\\text{ערך ישן}}\\times100=\\dfrac{400-320}{400}\\times100=\\dfrac{80}{400}\\times100=20\\%$. יש לחלק תמיד בערך המקורי.",
  },
  {
    section: "quant",
    topic: "אחוזים",
    subtopic: "אחוזים מורכבים",
    difficulty: 4,
    body: "מחיר מוצר הועלה תחילה ב-20%, ולאחר מכן הופחת ב-10% מהמחיר החדש (לאחר ההעלאה). מה השינוי הכולל במחיר, ביחס למחיר המקורי?",
    choices: ["עלייה של 8%", "עלייה של 10%", "ירידה של 2%", "עלייה של 12%"],
    correctAnswer: 0,
    explanation:
      "נניח שהמחיר המקורי הוא 100. לאחר עלייה של 20%: $100\\times1.2=120$. לאחר ירידה של 10% מהמחיר החדש: $120\\times0.9=108$. השינוי הכולל ביחס ל-100 המקורי הוא $108-100=8$, כלומר עלייה של 8%. טעות נפוצה היא לחבר את האחוזים ישירות ($20\\%-10\\%=10\\%$) במקום להפעיל אותם ברצף.",
  },
  {
    section: "quant",
    topic: "הסתברות וקומבינטוריקה",
    subtopic: "הסתברות בסיסית",
    difficulty: 3,
    body: "בקופסה יש 4 כדורים ירוקים, 3 כדורים צהובים ו-5 כדורים כחולים. אם מוציאים כדור אחד באקראי, מה ההסתברות שהכדור שהוצא לא יהיה כחול?",
    choices: ["$\\dfrac{5}{12}$", "$\\dfrac{7}{12}$", "$\\dfrac{4}{12}$", "$\\dfrac{1}{2}$"],
    correctAnswer: 1,
    explanation:
      "סך כל הכדורים הוא $4+3+5=12$. מספר הכדורים שאינם כחולים הוא $4+3=7$. ההסתברות שהכדור לא יהיה כחול היא $\\dfrac{7}{12}$.",
  },
  {
    section: "quant",
    topic: "הסתברות וקומבינטוריקה",
    subtopic: "עקרון הכפל",
    difficulty: 4,
    body: "תפריט מסעדה כולל 4 סוגי מנות עיקריות ו-3 סוגי קינוחים. בכמה דרכים שונות ניתן לבחור מנה עיקרית אחת וקינוח אחד יחד?",
    choices: ["7", "12", "10", "24"],
    correctAnswer: 1,
    explanation:
      "לפי עקרון הכפל, כאשר יש לבחור שני פריטים בלתי-תלויים בזה מזה, מספר האפשרויות הכולל הוא מכפלת מספרי האפשרויות של כל שלב: $4\\times3=12$.",
  },
  {
    section: "quant",
    topic: "יחס ופרופורציה",
    subtopic: "יחס הפוך",
    difficulty: 3,
    body: "אם 8 פועלים, העובדים באותו קצב, בונים קיר מסוים ב-15 ימים, כמה ימים ייקח ל-12 פועלים (באותו קצב עבודה) לבנות את אותו הקיר?",
    choices: ["8 ימים", "10 ימים", "12 ימים", "20 ימים"],
    correctAnswer: 1,
    explanation:
      "מספר הפועלים וזמן הביצוע נמצאים ביחס הפוך: ככל שיש יותר פועלים, לוקח פחות זמן, כאשר המכפלה נשארת קבועה. $8\\times15=120$ (יחידות 'עבודת-אדם'). עבור 12 פועלים: $120/12=10$ ימים.",
  },
  {
    section: "quant",
    topic: "בעיות מילוליות",
    subtopic: "בעיות גיל",
    difficulty: 3,
    body: "גילו של דן היום גדול פי 3 מגילו של בנו. בעוד 10 שנים יהיה גילו של דן גדול פי 2 בלבד מגילו של בנו. מה גילו של דן היום?",
    choices: ["24", "27", "30", "33"],
    correctAnswer: 2,
    explanation:
      "נסמן את גיל הבן היום ב-$x$, כך שגיל דן היום הוא $3x$. בעוד 10 שנים: $3x+10=2(x+10)$. פותחים: $3x+10=2x+20$, ומכאן $x=10$. גילו של דן היום הוא $3x=30$. בדיקה: בעוד 10 שנים דן יהיה בן 40 והבן בן 20, ואכן $40=2\\times20$.",
  },
];

async function main() {
  const supabase = getSupabaseAdminClient();
  if (!supabase) {
    console.error("NEXT_PUBLIC_SUPABASE_URL / SUPABASE_SERVICE_ROLE_KEY are not set — aborting.");
    process.exitCode = 1;
    return;
  }

  if (QUANT_QUESTIONS.length !== 20) {
    console.error(`Expected exactly 20 questions, found ${QUANT_QUESTIONS.length} — aborting.`);
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

  console.log(`Inserting ${rows.length} hardcoded quant questions into the shared question bank...`);
  const bySubtopic = new Map<string, number>();
  for (const q of QUANT_QUESTIONS) bySubtopic.set(q.subtopic, (bySubtopic.get(q.subtopic) ?? 0) + 1);
  for (const [subtopic, count] of bySubtopic) console.log(`  ${subtopic}: ${count}`);

  const { error } = await supabase.from("questions").insert(rows);
  if (error) {
    console.error("Insert failed:", error.message);
    process.exitCode = 1;
    return;
  }

  console.log(`Done. ${rows.length} quant questions inserted.`);
}

main();
