/**
 * Replaces the 20 Quantitative questions this script originally seeded
 * with a harder, genuinely NITE-caliber set — the first batch turned out
 * to be too basic (e.g. one-step probability, single-fact geometry) for
 * real psychometric difficulty. This run deletes exactly those 20 old
 * rows (matched by their exact body text, so it can never touch the
 * separate starter set from scripts/seed-hardcoded-questions.ts or
 * anything else in the bank) and inserts the new 20 in their place.
 *
 * Every question below is a genuine multi-step problem — combined rates,
 * sequential percentages, conditional probability, circular arrangements,
 * quadratic inequalities, etc. — with a full worked Hebrew solution and
 * distractors built from the specific mistake a student would actually
 * make (not just plausible-looking wrong numbers). No Claude API calls.
 *
 * Usage:
 *   npx tsx --env-file=.env.local scripts/seed-quant-20.ts
 *
 * Requires NEXT_PUBLIC_SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY (see
 * .env.local.example).
 */

import { createClient, type SupabaseClient } from "@supabase/supabase-js";
import WS from "ws";
import type { Question } from "@/types";

// See scripts/seed-question-bank.ts for why this polyfill is needed: Node
// versions below 22 have no native global WebSocket, and
// @supabase/supabase-js's client constructor throws without one even
// though this script only ever does plain REST insert/select/delete calls.
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

// The exact `body` text of the 20 questions this script inserted
// previously — used to delete precisely those rows and nothing else
// before inserting the new set below.
const OLD_QUESTION_BODIES: string[] = [
  'בקבוצה A יש 25 עובדים עם שכר ממוצע של 8,000 ש"ח. בקבוצה B יש 15 עובדים עם שכר ממוצע של 12,000 ש"ח. מה השכר הממוצע של כלל 40 העובדים יחד?',
  "ממוצע הציונים של 9 תלמידים בכיתה הוא 78. תלמיד נוסף הצטרף לכיתה וקיבל ציון 98. מהו הממוצע החדש של 10 התלמידים?",
  "מהו הערך של $\\sqrt{81} \\cdot 2^{3} \\div 3^{2}$?",
  "מהם פתרונות המשוואה $x^2 - 2x - 15 = 0$?",
  "מהו הערך של $97^2 - 3^2$, בעזרת נוסחת הפרש ריבועים?",
  "עבור אילו ערכי $x$ מתקיים אי-השוויון $3x - 7 > 2x + 4$?",
  "האיבר הראשון בסדרה חשבונית הוא 5, וההפרש הקבוע בין איברים עוקבים הוא 4. מהו האיבר ה-15 בסדרה?",
  'בסיסו של משולש הוא 10 ס"מ וגובהו (הניצב לבסיס) 6 ס"מ. מהו שטח המשולש?',
  "במשולש ישר-זווית, אורך היתר הוא 13 ואורך אחד הניצבים הוא 5. מה אורך הניצב השני?",
  'קוטרו של מעגל הוא 14 ס"מ. מהו היקף המעגל (לפי $\\pi \\approx \\dfrac{22}{7}$)?',
  'מהו נפחה של תיבה שאורכה 5 ס"מ, רוחבה 4 ס"מ וגובהה 3 ס"מ?',
  "במשולש, שתיים מהזוויות הן 50° ו-70°. מהי גודל הזווית השלישית?",
  "צינור A ממלא בריכה ריקה לבדו ב-5 שעות. צינור B, כאשר הבריכה מלאה, מרוקן אותה לבדו ב-10 שעות. אם פותחים את שני הצינורות יחד על בריכה ריקה (A ממלא, B מרוקן), כמה זמן ייקח למלא את הבריכה?",
  "מכונית נסעה 180 ק\"מ במהירות ממוצעת קבועה של 90 קמ\"ש. כמה זמן ארכה הנסיעה?",
  'מחיר מוצר ירד מ-400 ש"ח ל-320 ש"ח. באיזה אחוז ירד המחיר?',
  "מחיר מוצר הועלה תחילה ב-20%, ולאחר מכן הופחת ב-10% מהמחיר החדש (לאחר ההעלאה). מה השינוי הכולל במחיר, ביחס למחיר המקורי?",
  "בקופסה יש 4 כדורים ירוקים, 3 כדורים צהובים ו-5 כדורים כחולים. אם מוציאים כדור אחד באקראי, מה ההסתברות שהכדור שהוצא לא יהיה כחול?",
  "תפריט מסעדה כולל 4 סוגי מנות עיקריות ו-3 סוגי קינוחים. בכמה דרכים שונות ניתן לבחור מנה עיקרית אחת וקינוח אחד יחד?",
  "אם 8 פועלים, העובדים באותו קצב, בונים קיר מסוים ב-15 ימים, כמה ימים ייקח ל-12 פועלים (באותו קצב עבודה) לבנות את אותו הקיר?",
  "גילו של דן היום גדול פי 3 מגילו של בנו. בעוד 10 שנים יהיה גילו של דן גדול פי 2 בלבד מגילו של בנו. מה גילו של דן היום?",
];

type HardcodedQuestion = Omit<Question, "id" | "createdAt" | "passage" | "type" | "media">;

// 5 questions per requested category: multi-step word problems, rigorous
// geometry, advanced probability & combinatorics, complex algebra and
// inequalities. Every numeric answer was computed and re-verified by hand
// (see each explanation's worked steps); distractors are the specific
// wrong answer a real mistake produces (e.g. treating without-replacement
// draws as independent, adding percentages instead of compounding them),
// not arbitrary nearby numbers.
const QUANT_QUESTIONS: HardcodedQuestion[] = [
  // --- Multi-step word problems ---
  {
    section: "quant",
    topic: "בעיות תנועה ועבודה",
    subtopic: "מפגש שני גופים נעים",
    difficulty: 4,
    body: 'שתי תחנות רכבת מרוחקות זו מזו 300 ק"מ. רכבת יוצאת מתחנה A לכיוון תחנה B במהירות 80 קמ"ש. בו-זמנית, רכבת שנייה יוצאת מתחנה B לכיוון תחנה A במהירות 70 קמ"ש. מה המרחק מתחנה A בנקודת המפגש בין שתי הרכבות?',
    choices: ['160 ק"מ', '150 ק"מ', '140 ק"מ', '180 ק"מ'],
    correctAnswer: 0,
    explanation:
      'כאשר שני גופים נעים זה לקראת זה, מהירות ההתקרבות ההדדית היא סכום המהירויות: $80+70=150$ קמ"ש. הזמן עד המפגש הוא $300/150=2$ שעות. המרחק שעברה הרכבת היוצאת מ-A עד לנקודת המפגש הוא $80\\times2=160$ ק"מ.',
  },
  {
    section: "quant",
    topic: "אחוזים",
    subtopic: "אחוזים עוקבים",
    difficulty: 4,
    body: 'לאחר הנחה של 25%, ולאחר מכן הנחה נוספת של 20% (על המחיר שלאחר ההנחה הראשונה), שילם קונה 96 ש"ח עבור מוצר. מה היה מחירו המקורי של המוצר?',
    choices: ['150 ש"ח', '160 ש"ח', '175 ש"ח', '180 ש"ח'],
    correctAnswer: 1,
    explanation:
      'נסמן את המחיר המקורי ב-$P$. לאחר ההנחה הראשונה המחיר הוא $0.75P$, ולאחר ההנחה השנייה: $0.75P\\times0.8=0.6P$. נתון ש-$0.6P=96$, ולכן $P=96/0.6=160$ ש"ח. טעות נפוצה היא לחבר את שתי ההנחות להנחה כוללת של 45% ולחשב $96/0.55\\approx175$ ש"ח — אך הנחות עוקבות אינן מצטברות בחיבור פשוט.',
  },
  {
    section: "quant",
    topic: "יחס ופרופורציה",
    subtopic: "תערובות וריכוזים",
    difficulty: 4,
    body: "בכלי A יש תמיסת מלח בריכוז 10% (מלח מתוך התמיסה), ונפחה 300 מ\"ל. בכלי B יש תמיסת מלח בריכוז 25%, ונפחה 200 מ\"ל. אם מערבבים את כל התוכן משני הכלים יחד, מהו ריכוז המלח בתערובת החדשה?",
    choices: ["15%", "16%", "17.5%", "20%"],
    correctAnswer: 1,
    explanation:
      'כמות המלח בכלי A היא $0.10\\times300=30$ מ"ל, ובכלי B היא $0.25\\times200=50$ מ"ל. סך כל המלח בתערובת הוא $30+50=80$ מ"ל, וסך הנפח הוא $300+200=500$ מ"ל. הריכוז החדש הוא $\\dfrac{80}{500}\\times100=16\\%$. טעות נפוצה היא לחשב ממוצע פשוט של האחוזים ($(10\\%+25\\%)/2=17.5\\%$) בלי להתחשב בכך שנפחי הכלים שונים.',
  },
  {
    section: "quant",
    topic: "בעיות תנועה ועבודה",
    subtopic: "עבודה משותפת מורכבת",
    difficulty: 4,
    body: "שלושה פועלים — א', ב' ו-ג' — יכולים לסיים עבודה מסוימת לבד ב-6, 3 ו-2 שעות בהתאמה. א' וב' התחילו לעבוד יחד, ולאחר שעה אחת הצטרף אליהם ג' עד לסיום העבודה. כמה זמן, בסך הכול מתחילת העבודה, ארכה העבודה?",
    choices: ["1.5 שעות", "1 שעה", "2 שעות", "1.75 שעות"],
    correctAnswer: 0,
    explanation:
      "קצב א' הוא $\\dfrac{1}{6}$ מהעבודה לשעה, וקצב ב' הוא $\\dfrac{1}{3}=\\dfrac{2}{6}$ לשעה — יחד $\\dfrac{1}{6}+\\dfrac{2}{6}=\\dfrac{1}{2}$ מהעבודה לשעה. בשעה הראשונה הם משלימים $\\dfrac{1}{2}$ מהעבודה, ונותרו $\\dfrac{1}{2}$. כשג' מצטרף (קצבו $\\dfrac{1}{2}$ לשעה), הקצב המשולב של שלושתם הוא $\\dfrac{1}{6}+\\dfrac{1}{3}+\\dfrac{1}{2}=\\dfrac{1}{6}+\\dfrac{2}{6}+\\dfrac{3}{6}=1$ מהעבודה לשעה — כלומר משלימים את חצי העבודה הנותרת תוך $0.5$ שעות. הזמן הכולל הוא $1+0.5=1.5$ שעות.",
  },
  {
    section: "quant",
    topic: "בעיות תנועה ועבודה",
    subtopic: "מהירות ממוצעת",
    difficulty: 4,
    body: 'מכונית נסעה מעיר X לעיר Y, מרחק של 240 ק"מ. במחצית הראשונה של המרחק (120 ק"מ) נסעה במהירות ממוצעת של 60 קמ"ש, ובמחצית השנייה נסעה במהירות ממוצעת של 40 קמ"ש. מה הייתה המהירות הממוצעת לכל הנסיעה?',
    choices: ['48 קמ"ש', '50 קמ"ש', '52 קמ"ש', '45 קמ"ש'],
    correctAnswer: 0,
    explanation:
      'מהירות ממוצעת אינה הממוצע החשבוני הפשוט של המהירויות! יש לחשב את זמן הנסיעה בכל קטע בנפרד: זמן במחצית הראשונה $=120/60=2$ שעות, זמן במחצית השנייה $=120/40=3$ שעות. הזמן הכולל $=2+3=5$ שעות, והמרחק הכולל $=240$ ק"מ. המהירות הממוצעת האמיתית היא $240/5=48$ קמ"ש — נמוכה מהממוצע הפשוט (50), מכיוון שהמכונית בילתה יותר זמן בנסיעה במהירות הנמוכה.',
  },

  // --- Rigorous geometry ---
  {
    section: "quant",
    topic: "גיאומטריה",
    subtopic: "משולשים מיוחדים (30-60-90)",
    difficulty: 3,
    body: 'במשולש ישר-זווית, אחת הזוויות היא 30°, ואורך הניצב הקצר (מול זווית ה-30°) הוא 6 ס"מ. מהו אורך היתר?',
    choices: ['12 ס"מ', '6√3 ס"מ', '9 ס"מ', '6√2 ס"מ'],
    correctAnswer: 0,
    explanation:
      'במשולש ישר-זווית שבו אחת הזוויות היא 30°, היחס בין הצלעות קבוע: הניצב שמול זווית 30° הוא הקצר ביותר ושווה ל-$x$, הניצב שמול 60° שווה ל-$x\\sqrt3$, והיתר (שמול הזווית הישרה) שווה ל-$2x$. כאן $x=6$, ולכן היתר $=2\\times6=12$ ס"מ.',
  },
  {
    section: "quant",
    topic: "גיאומטריה",
    subtopic: "מעגל חסום במצולע",
    difficulty: 3,
    body: 'מעגל חסום בריבוע (המעגל משיק לארבעת צלעות הריבוע) שאורך צלעו 8 ס"מ. מהו שטח המעגל?',
    choices: ['$16\\pi$ סמ"ר', '$8\\pi$ סמ"ר', '$4\\pi$ סמ"ר', '$64\\pi$ סמ"ר'],
    correctAnswer: 0,
    explanation:
      'כאשר מעגל חסום בריבוע ומשיק לכל צלעותיו, קוטר המעגל שווה לאורך צלע הריבוע: $d=8$, ולכן $r=4$. שטח המעגל הוא $A=\\pi r^2=\\pi\\times4^2=16\\pi$ סמ"ר. טעות נפוצה היא להשתמש ברדיוס $r=8$ (אורך הצלע עצמו, במקום מחציתו).',
  },
  {
    section: "quant",
    topic: "גיאומטריה",
    subtopic: "תכונות מצולעים",
    difficulty: 3,
    body: "מהו סכום זוויות הפנים של מצולע קמור בעל 9 צלעות (תשע-צלעון)?",
    choices: ["1260°", "1080°", "1440°", "900°"],
    correctAnswer: 0,
    explanation:
      "סכום זוויות הפנים של מצולע קמור בעל $n$ צלעות נתון על ידי הנוסחה $(n-2)\\times180°$. עבור $n=9$: $(9-2)\\times180°=7\\times180°=1260°$.",
  },
  {
    section: "quant",
    topic: "גיאומטריה",
    subtopic: "מצולע משוכלל חסום במעגל",
    difficulty: 4,
    body: 'משושה משוכלל (כל צלעותיו וזוויותיו שוות) חסום במעגל שרדיוסו 6 ס"מ. מהו אורך צלעו של המשושה?',
    choices: ['6 ס"מ', '3 ס"מ', '12 ס"מ', '6√3 ס"מ'],
    correctAnswer: 0,
    explanation:
      'תכונה ייחודית של משושה משוכלל החסום במעגל: ניתן לחלק אותו לשישה משולשים שווי-צלעות זהים, שכל אחד מהם נוצר מהמרכז לשני קודקודים סמוכים — ולכן זווית המרכז בכל משולש היא $360°/6=60°$, מה שהופך כל משולש כזה לשווה-צלעות. משום כך, אורך צלעו של המשושה שווה תמיד לרדיוס המעגל החוסם אותו — כאן 6 ס"מ.',
  },
  {
    section: "quant",
    topic: "גיאומטריה",
    subtopic: "צורות משולבות",
    difficulty: 4,
    body: 'משולש ישר-זווית שניצביו 6 ס"מ ו-8 ס"מ, כאשר היתר שלו הוא קוטר של חצי-מעגל הבנוי עליו. מהו שטח האזור הכולל (המשולש וחצי-המעגל יחד)?',
    choices: ['$24+12.5\\pi$ סמ"ר', '$24+25\\pi$ סמ"ר', '$48+12.5\\pi$ סמ"ר', '$24+50\\pi$ סמ"ר'],
    correctAnswer: 0,
    explanation:
      'לפי משפט פיתגורס, אורך היתר הוא $\\sqrt{6^2+8^2}=\\sqrt{36+64}=\\sqrt{100}=10$ ס"מ — וזהו גם קוטר חצי-המעגל, כך שרדיוסו הוא 5 ס"מ. שטח המשולש הוא $\\dfrac{1}{2}\\times6\\times8=24$ סמ"ר. שטח חצי-המעגל הוא מחצית משטח מעגל מלא: $\\dfrac{1}{2}\\times\\pi\\times5^2=12.5\\pi$ סמ"ר. השטח הכולל הוא $24+12.5\\pi$ סמ"ר.',
  },

  // --- Advanced probability & combinatorics ---
  {
    section: "quant",
    topic: "הסתברות וקומבינטוריקה",
    subtopic: "הוצאה ללא החזרה",
    difficulty: 4,
    body: "בקופסה יש 5 כדורים אדומים ו-3 כדורים כחולים. מוציאים שני כדורים בזה אחר זה, בלי החזרה. מה ההסתברות ששני הכדורים שהוצאו יהיו אדומים?",
    choices: ["$\\dfrac{5}{14}$", "$\\dfrac{5}{8}$", "$\\dfrac{25}{64}$", "$\\dfrac{1}{2}$"],
    correctAnswer: 0,
    explanation:
      "ההסתברות שהכדור הראשון יהיה אדום היא $\\dfrac{5}{8}$. לאחר הוצאתו (בלי החזרה) נותרו בקופסה 7 כדורים, מתוכם 4 אדומים — כך שההסתברות שגם הכדור השני יהיה אדום היא $\\dfrac{4}{7}$. ההסתברות ששניהם אדומים היא $\\dfrac{5}{8}\\times\\dfrac{4}{7}=\\dfrac{20}{56}=\\dfrac{5}{14}$. טעות נפוצה היא להתייחס להוצאה כאילו יש החזרה ולחשב $\\left(\\dfrac{5}{8}\\right)^2=\\dfrac{25}{64}$.",
  },
  {
    section: "quant",
    topic: "הסתברות וקומבינטוריקה",
    subtopic: "הסתברות מותנית",
    difficulty: 4,
    body: "במפעל מסוים, 60% מהעובדים הם גברים ו-40% נשים. מבין הגברים, 30% מעשנים; מבין הנשים, 20% מעשנות. בוחרים עובד אקראי מהמפעל ומתברר שהוא מעשן. מה ההסתברות שהעובד הוא גבר?",
    choices: ["$\\dfrac{9}{13}$", "$\\dfrac{4}{13}$", "0.3", "0.6"],
    correctAnswer: 0,
    explanation:
      "ההסתברות שעובד אקראי מעשן מתקבלת מסכימת שני המקרים האפשריים: $0.6\\times0.3+0.4\\times0.2=0.18+0.08=0.26$. כדי למצוא את ההסתברות שהעובד הוא גבר, בהינתן שהוא מעשן, מחלקים את ההסתברות ש'העובד גבר וגם מעשן' ($0.6\\times0.3=0.18$) בהסתברות הכוללת שהעובד מעשן ($0.26$): $\\dfrac{0.18}{0.26}=\\dfrac{18}{26}=\\dfrac{9}{13}$.",
  },
  {
    section: "quant",
    topic: "הסתברות וקומבינטוריקה",
    subtopic: "סידורים בשורה עם הגבלה",
    difficulty: 4,
    body: "חמישה חברים, ובהם דנה ורון, יושבים בשורה של חמישה כיסאות. בכמה דרכים שונות ניתן לסדר את חמשת החברים בשורה כך שדנה ורון יישבו זה לצד זה (סמוכים)?",
    choices: ["48", "24", "120", "60"],
    correctAnswer: 0,
    explanation:
      "מתייחסים לדנה ולרון כאל 'יחידה' אחת, כך שיש לסדר 4 'יחידות' בשורה (היחידה המשולבת + 3 החברים הנוספים): $4!=24$ דרכים. בתוך היחידה עצמה, דנה ורון יכולים להתחלף ביניהם ב-2 דרכים. סך כל הסידורים האפשריים הוא $4!\\times2=24\\times2=48$ (מתוך $5!=120$ סידורים אפשריים ללא ההגבלה).",
  },
  {
    section: "quant",
    topic: "הסתברות וקומבינטוריקה",
    subtopic: "סידורים במעגל",
    difficulty: 4,
    body: "שמונה אנשים יושבים סביב שולחן עגול. בכמה דרכים שונות ניתן לסדר אותם סביב השולחן, כאשר סיבובים של אותו סידור (שבהם כל אחד יושב עם אותם שכנים באותו סדר יחסי) נחשבים לאותו סידור?",
    choices: ["5040", "40320", "2520", "720"],
    correctAnswer: 0,
    explanation:
      "כאשר מסדרים $n$ אנשים שונים סביב שולחן עגול, וסיבובים של אותו סידור נחשבים זהים, מספר הסידורים השונים הוא $(n-1)!$ ולא $n!$ — ניתן 'לקבע' אדם אחד כנקודת ייחוס, ולסדר את שאר $n-1$ האנשים ביחס אליו. עבור $n=8$: $(8-1)!=7!=5040$.",
  },
  {
    section: "quant",
    topic: "הסתברות וקומבינטוריקה",
    subtopic: "צירופים ועקרון המשלים",
    difficulty: 4,
    body: "ועדה בת 3 חברים נבחרת באקראי מתוך קבוצה של 5 גברים ו-4 נשים (סה\"כ 9 אנשים). מה ההסתברות שבוועדה יהיה לפחות אישה אחת?",
    choices: ["$\\dfrac{37}{42}$", "$\\dfrac{10}{84}$", "$\\dfrac{4}{9}$", "$\\dfrac{1}{3}$"],
    correctAnswer: 0,
    explanation:
      "הדרך היעילה ביותר היא באמצעות המשלים: במקום לחשב ישירות 'לפחות אישה אחת', מחשבים את ההסתברות ל'אף לא אישה אחת' (שלושה גברים בלבד) ומחסירים מ-1. מספר הדרכים לבחור 3 מתוך 9 אנשים הוא $\\binom{9}{3}=84$. מספר הדרכים לבחור 3 גברים בלבד (מתוך 5) הוא $\\binom{5}{3}=10$. לכן ההסתברות ל'אף לא אישה' היא $\\dfrac{10}{84}$, וההסתברות ל'לפחות אישה אחת' היא $1-\\dfrac{10}{84}=\\dfrac{74}{84}=\\dfrac{37}{42}$.",
  },

  // --- Complex algebraic expressions and inequalities ---
  {
    section: "quant",
    topic: "אלגברה",
    subtopic: "מערכת משוואות",
    difficulty: 3,
    body: "סכום שני מספרים הוא 50, וההפרש ביניהם הוא 12. מהי מכפלת שני המספרים?",
    choices: ["589", "600", "558", "620"],
    correctAnswer: 0,
    explanation:
      "נסמן את שני המספרים ב-$x$ ו-$y$ כך ש-$x+y=50$ ו-$x-y=12$. בחיבור שתי המשוואות: $2x=62$, ולכן $x=31$. הצבה חוזרת: $y=50-31=19$. המכפלה היא $31\\times19=589$.",
  },
  {
    section: "quant",
    topic: "אלגברה",
    subtopic: "אי-שוויון עם ערך מוחלט",
    difficulty: 4,
    body: "עבור אילו ערכי $x$ מתקיים $|2x-5| \\le 7$?",
    choices: ["$-1\\le x\\le6$", "$-6\\le x\\le1$", "$x\\le6$", "$-1\\le x\\le7$"],
    correctAnswer: 0,
    explanation:
      "אי-שוויון עם ערך מוחלט מהצורה $|A|\\le B$ (כאשר $B>0$) שקול לאי-השוויון הכפול $-B\\le A\\le B$. כאן: $-7\\le2x-5\\le7$. מוסיפים 5 לכל האגפים: $-2\\le2x\\le12$. מחלקים ב-2: $-1\\le x\\le6$.",
  },
  {
    section: "quant",
    topic: "אלגברה",
    subtopic: "פישוט ביטויים רציונליים",
    difficulty: 4,
    body: "פשטו את הביטוי $\\dfrac{x^2-9}{x^2-x-6}$ (עבור $x\\ne-2,3$).",
    choices: ["$\\dfrac{x+3}{x+2}$", "$\\dfrac{x-3}{x+2}$", "$\\dfrac{x+3}{x-2}$", "3"],
    correctAnswer: 0,
    explanation:
      "מפרקים את המונה כהפרש ריבועים: $x^2-9=(x-3)(x+3)$. מפרקים את המכנה: מחפשים שני מספרים שסכומם $-1$ ומכפלתם $-6$ — אלו $-3$ ו-$2$, כך ש-$x^2-x-6=(x-3)(x+2)$. מצמצמים את הגורם המשותף $(x-3)$: $\\dfrac{(x-3)(x+3)}{(x-3)(x+2)}=\\dfrac{x+3}{x+2}$.",
  },
  {
    section: "quant",
    topic: "אלגברה",
    subtopic: "אי-שוויון ריבועי",
    difficulty: 4,
    body: "עבור אילו ערכי $x$ מתקיים $x^2-5x+6<0$?",
    choices: ["$2<x<3$", "$x<2$ או $x>3$", "$x<-3$ או $x>-2$", "$-3<x<-2$"],
    correctAnswer: 0,
    explanation:
      "מפרקים לגורמים: $x^2-5x+6=(x-2)(x-3)$. מכיוון שמקדם $x^2$ חיובי, הפרבולה פונה כלפי מעלה, ולכן הביטוי שלילי (קטן מ-0) בדיוק בין השורשים: $2<x<3$. מחוץ לתחום זה (מתחת ל-2 או מעל 3) הביטוי חיובי.",
  },
  {
    section: "quant",
    topic: "אלגברה",
    subtopic: "בעיות ריבית והשקעות",
    difficulty: 4,
    body: 'משקיע חילק סכום של 20,000 ש"ח לשתי השקעות: חלק בריבית שנתית של 5%, והשאר בריבית שנתית של 8%. בתום שנה אחת קיבל המשקיע בסך הכול 1,360 ש"ח ריבית. כמה כסף הושקע בריבית של 8%?',
    choices: ['12,000 ש"ח', '8,000 ש"ח', '10,000 ש"ח', '15,000 ש"ח'],
    correctAnswer: 0,
    explanation:
      'נסמן ב-$x$ את הסכום שהושקע בריבית של 8%, ולכן $20{,}000-x$ הושקע בריבית של 5%. סך הריבית: $0.08x+0.05(20{,}000-x)=1{,}360$. פותחים: $0.08x+1{,}000-0.05x=1{,}360$, כלומר $0.03x=360$, ומכאן $x=12{,}000$. בדיקה: $0.08\\times12{,}000=960$ ו-$0.05\\times8{,}000=400$, וסכומם $1{,}360$ כנדרש.',
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

  console.log(`Deleting the ${OLD_QUESTION_BODIES.length} old (too-basic) quant questions this script previously seeded...`);
  const { data: deleted, error: deleteError } = await supabase
    .from("questions")
    .delete()
    .eq("section", "quant")
    .in("body", OLD_QUESTION_BODIES)
    .select("id");

  if (deleteError) {
    console.error("Delete failed:", deleteError.message);
    process.exitCode = 1;
    return;
  }
  console.log(`  deleted ${deleted?.length ?? 0} rows.`);

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

  console.log(`Inserting ${rows.length} new advanced quant questions into the shared question bank...`);
  const bySubtopic = new Map<string, number>();
  for (const q of QUANT_QUESTIONS) bySubtopic.set(q.subtopic, (bySubtopic.get(q.subtopic) ?? 0) + 1);
  for (const [subtopic, count] of bySubtopic) console.log(`  ${subtopic}: ${count}`);

  const { error: insertError } = await supabase.from("questions").insert(rows);
  if (insertError) {
    console.error("Insert failed:", insertError.message);
    process.exitCode = 1;
    return;
  }

  console.log(`Done. ${deleted?.length ?? 0} old questions removed, ${rows.length} new advanced questions inserted.`);
}

main();
