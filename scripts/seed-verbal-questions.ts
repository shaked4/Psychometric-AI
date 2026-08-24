/**
 * Seeds the initial Verbal (פרק מילולי) question bank — 12 original,
 * hand-verified Hebrew questions across the three core verbal item types:
 * analogies (אנלוגיות), sentence completion (השלמת משפטים), and critical
 * reasoning / logic (הבנה והסקה: מחזק/מחליש, שקרנים, סידורים).
 *
 * Every question was constructed with an explicit, checkable relation or
 * logical structure and every distractor was individually verified to fail
 * for a specific, statable reason (not just "sounds wrong") — see each
 * `explanation`. The two logic puzzles (liars / seating order) were solved
 * by full case analysis before being written down; see the explanation for
 * the elimination of every other case.
 *
 * Note on `explanation` vs. "description": the live `questions` table (see
 * supabase/schema.sql's note on this table) only has an `explanation`
 * column, not a separate `description` column — every other seed script in
 * this repo already puts the full step-by-step solution there, so this one
 * does too rather than requesting yet another schema migration for a single
 * field that already exists under a different name.
 *
 * Usage:
 *   npx tsx --env-file=.env.local scripts/seed-verbal-questions.ts
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

const VERBAL_QUESTIONS: HardcodedQuestion[] = [
  // ------------------------------------------------------------------
  // אנלוגיות (4) — each pair is built on one explicit, defining relation;
  // every wrong choice fails that exact relation for a stated reason
  // (reversed order, or a different relation entirely) rather than just
  // "feeling" unrelated.
  // ------------------------------------------------------------------
  {
    section: "verbal",
    topic: "אנלוגיות",
    subtopic: "יחס כלי לחומר שעליו הוא פועל",
    difficulty: 2,
    body: "מסור : עצים –",
    choices: ["מחרשה : אדמה", "עצים : רהיטים", "נגר : עצים", "גשם : עצים"],
    correctAnswer: 0,
    explanation:
      'היחס המוגדר הוא "כלי : החומר שעליו הכלי פועל". "מחרשה : אדמה" מקיים אותו יחס בדיוק — מחרשה היא כלי המשמש לעיבוד אדמה. הפסילות: "עצים : רהיטים" הוא יחס חומר-גלם לתוצר, לא כלי לחומר. "נגר : עצים" הוא יחס בין בעל מקצוע (אדם) לחומר, לא כלי לחומר. "גשם : עצים" אינו יחס כלי-חומר כלל אלא קשר סיבתי-אקראי.',
  },
  {
    section: "verbal",
    topic: "אנלוגיות",
    subtopic: "יחס מקצוע למקום עבודה אופייני",
    difficulty: 3,
    body: "טבח : מסעדה –",
    choices: ["רופא : בית חולים", "בית חולים : רופא", "טבח : אוכל", "מורה : תלמיד"],
    correctAnswer: 0,
    explanation:
      '"רופא : בית חולים" מקיים בדיוק את היחס "בעל מקצוע : מקום עבודה אופייני". הפסילות: "בית חולים : רופא" הוא היחס ההפוך (מקום ואז בעל המקצוע — סדר הפוך לזוג הבסיס). "טבח : אוכל" הוא יחס בין בעל מקצוע לתוצר עבודתו, לא למקום העבודה. "מורה : תלמיד" הוא יחס בין שני בני אדם, לא בין בעל מקצוע למקום.',
  },
  {
    section: "verbal",
    topic: "אנלוגיות",
    subtopic: "ניגוד בעוצמה של תכונה",
    difficulty: 3,
    body: "קר : קפוא –",
    choices: ["חם : רותח", "רותח : חם", "קר : חם", "קפוא : קרח"],
    correctAnswer: 0,
    explanation:
      '"חם : רותח" מקיים בדיוק את אותו יחס — "רותח" הוא עוצמה קיצונית של "חם", בדיוק כפי ש"קפוא" הוא עוצמה קיצונית של "קר". הפסילות: "רותח : חם" הפוך בסדרו לזוג הבסיס (העוצמה הקיצונית מופיעה ראשונה, לא שנייה). "קר : חם" הם ניגודים פשוטים ולא יחס של דרגת עוצמה באותה תכונה. "קפוא : קרח" משנה את חלק הדיבור — "קפוא" הוא תואר ו"קרח" הוא שם עצם, בעוד שבזוג הבסיס שתי המילים הן תארים.',
  },
  {
    section: "verbal",
    topic: "אנלוגיות",
    subtopic: "יחס שלם ליחידת מבנה עוקבת",
    difficulty: 4,
    body: "ספר : פרק –",
    choices: ["מחזה : מערכה", "מערכה : מחזה", "ספר : סופר", "עיתון : כתב"],
    correctAnswer: 0,
    explanation:
      '"מחזה : מערכה" מקיים בדיוק את אותו יחס — מחזה מורכב ממערכות המסודרות ברצף קבוע, כשם שספר מורכב מפרקים ברצף. הפסילות: "מערכה : מחזה" הפוך בסדרו. "ספר : סופר" הוא יחס בין יצירה ליוצר שלה, לא בין שלם ליחידת מבנה בתוכו. "עיתון : כתב" הוא אותו סוג יחס שגוי — יצירה מול היוצר/התורם לה, לא שלם ורצף היחידות המרכיבות אותו.',
  },

  // ------------------------------------------------------------------
  // השלמת משפטים (4) — כל משפט בנוי סביב מחבר לוגי מורכב (ניגוד, פרופורציה,
  // תוספת, תנאי בטל בהווה), והתשובה הנכונה היא היחידה שמתיישבת עם משפט
  // הטעם/הסיבה שמלווה אותה.
  // ------------------------------------------------------------------
  {
    section: "verbal",
    topic: "השלמת משפטים",
    subtopic: "ניגוד ותנאי ויתור (אף על פי ש...)",
    difficulty: 2,
    body: "אף על פי שהמומחים הזהירו מפני הסיכונים הכרוכים בפרויקט, ההנהלה החליטה _____, משום שהאמינה כי הרווח הצפוי מצדיק את הסיכון.",
    choices: ["לקדם אותו על אף ההתנגדות", "לבטל אותו לאלתר", "לדחות את ההחלטה בשנה", "להאשים את המומחים בטעות"],
    correctAnswer: 0,
    explanation:
      'משפט הסיבה "משום שהאמינה כי הרווח הצפוי מצדיק את הסיכון" מחייב שההחלטה תהיה המשך של הפרויקט חרף האזהרה — בדיוק מה ש"אף על פי ש..." מבשר. רק "לקדם אותו על אף ההתנגדות" מתיישב עם נימוק כזה. "לבטל", "לדחות" ו"להאשים את המומחים" כולם סותרים או אינם מוסברים על ידי האמונה שהרווח מצדיק את הסיכון.',
  },
  {
    section: "verbal",
    topic: "השלמת משפטים",
    subtopic: "יחס פרופורציה (ככל ש... כך)",
    difficulty: 3,
    body: "ככל שכמות המידע העומדת לרשות הציבור גדלה, כך _____, שכן קשה יותר להבחין בין עובדות מהימנות לבין שמועות בלתי מבוססות.",
    choices: [
      "גובר הקושי לסנן את המידע האמין מתוך הרעש",
      "פוחת הצורך בעיתונות מקצועית",
      "עולה רמת האמון הציבורי בתקשורת",
      "נעלם הצורך במקורות מידע נוספים",
    ],
    correctAnswer: 0,
    explanation:
      'משפט הסיבה "שכן קשה יותר להבחין בין עובדות מהימנות לשמועות" מסביר תוצאה שלילית — קושי גובר בסינון המידע. זהו בדיוק מה שהאפשרות הראשונה קובעת. שלוש האפשרויות האחרות סותרות את הנימוק: אם קשה יותר להבחין באמינות, הצורך בעיתונות מקצועית אמור לעלות ולא לפחות, האמון הציבורי סביר שיירד ולא יעלה, והצורך במקורות מהימנים נוספים גובר ולא נעלם.',
  },
  {
    section: "verbal",
    topic: "השלמת משפטים",
    subtopic: "תוספת נימוקים (לא רק... אלא גם)",
    difficulty: 3,
    body: "מחקרים חדשים מראים שלא רק שהצמח הנדיר תורם לשימור המגוון הביולוגי באזור, אלא גם _____, ולכן יש להגביר את מאמצי ההגנה עליו.",
    choices: [
      "משמש כמקור פוטנציאלי לתרכובות רפואיות יקרות ערך",
      "התגלה לראשונה על ידי חוקר צמחים בן המאה ה-19",
      "דומה מבחינה גנטית לצמחים נפוצים באזורים אחרים",
      "גדל בעיקר בקרבת מקורות מים מזוהמים",
    ],
    correctAnswer: 0,
    explanation:
      'המבנה "לא רק ש... אלא גם..." דורש נימוק חיובי נוסף, המצטרף לתרומה לשימור המגוון הביולוגי, ותומך יחד עמו במסקנה "לכן יש להגביר את מאמצי ההגנה". רק "מקור פוטנציאלי לתרכובות רפואיות" הוא נימוק חיובי כזה. "התגלה במאה ה-19" הוא פרט עובדתי-היסטורי שאינו קשור למסקנה. "דומה גנטית לצמחים נפוצים" למעשה מחליש את הצידוק להגנה מיוחדת (אם הוא דומה לנפוצים, הוא פחות ייחודי). "גדל בקרבת מים מזוהמים" הוא פרט שלילי-נייטרלי שאינו תומך בקריאה להגברת ההגנה.',
  },
  {
    section: "verbal",
    topic: "השלמת משפטים",
    subtopic: "תנאי בטל בהווה (אלמלא)",
    difficulty: 4,
    body: "אלמלא _____, לא היה באפשרותם של החוקרים לזהות את הדפוס הנסתר בנתונים, שכן הכמות העצומה של המידע חייבה עיבוד ממוחשב מתקדם.",
    choices: [
      "פותחו אלגוריתמים מתקדמים לניתוח נתונים",
      "הצטמצם מספר החוקרים בצוות",
      "התארך משך הניסוי במעבדה",
      "פורסמו הממצאים בכתב עת מדעי",
    ],
    correctAnswer: 0,
    explanation:
      '"אלמלא X, לא היה באפשרותם..." דורש שX יהיה התנאי שבלעדיו הזיהוי לא היה מתאפשר — ומשפט הסיבה מפרש זאת במפורש: "הכמות העצומה של המידע חייבה עיבוד ממוחשב מתקדם". רק "פותחו אלגוריתמים מתקדמים לניתוח נתונים" הוא תנאי כזה. הצטמצמות הצוות, התארכות הניסוי, ופרסום הממצאים (שממילא מתרחש רק לאחר הזיהוי, ולא לפניו) אינם קשורים לתנאי הנדרש לעיבוד הנתונים.',
  },

  // ------------------------------------------------------------------
  // הבנה והסקה לוגית (4) — שני שאלות מחזק/מחליש, וחידת שקרנים וחידת סידור
  // בתור שנפתרו בבדיקת כל המקרים האפשריים לפני הכתיבה.
  // ------------------------------------------------------------------
  {
    section: "verbal",
    topic: "הבנה והסקה לוגית",
    subtopic: "החלשת טיעון",
    difficulty: 3,
    body: 'בעיר X חל בשנה האחרונה גידול של 30% במספר בתי הקפה שנפתחו, ובד בבד נרשמה עלייה של 15% בהיקף התיירות לעיר. לפיכך, יש הטוענים כי פתיחת בתי הקפה החדשים היא שגרמה לעלייה בתיירות. איזו מהעובדות הבאות, אם נכונה, מחלישה במידה הרבה ביותר את הטענה?',
    choices: [
      "רוב בתי הקפה החדשים נפתחו רק לאחר שכבר החלה העלייה בהיקף התיירות",
      "בתי הקפה החדשים מציעים תפריט מגוון יותר מבעבר",
      "מספר המקומות בבתי הקפה הישנים בעיר ירד בעשרה אחוזים",
      "עלות שכירות הנכסים בעיר עלתה בחמישה אחוזים באותה תקופה",
    ],
    correctAnswer: 0,
    explanation:
      'טיעון סיבתי (X גרם ל-Y) נחלש באופן החזק ביותר כאשר מוצג ראיה שסדר האירועים בזמן סותר את הכיוון הסיבתי הנטען. אם בתי הקפה נפתחו רק אחרי שהתיירות כבר עלתה, לא ייתכן שהם הסיבה לעלייה — לכל היותר הם תוצאה שלה. שאר האפשרויות אינן נוגעות ישירות לקשר הסיבתי הנטען בין בתי הקפה לתיירות.',
  },
  {
    section: "verbal",
    topic: "הבנה והסקה לוגית",
    subtopic: "חיזוק טיעון",
    difficulty: 3,
    body: "סקר שנערך בקרב 500 עובדי הייטק מצא כי עובדים שעברו הכשרה בניהול זמן דיווחו על שביעות רצון גבוהה יותר בעבודה מאשר עובדים שלא עברו הכשרה כזו. החוקרים מסיקים כי הכשרה בניהול זמן משפרת את שביעות הרצון בעבודה. איזו מהעובדות הבאות, אם נכונה, מחזקת במידה הרבה ביותר את המסקנה?",
    choices: [
      "העובדים חולקו אקראית לשתי הקבוצות (הכשרה / ללא הכשרה) לפני תחילת הניסוי",
      "הסקר בוצע באמצעות שאלון אנונימי מקוון",
      "רוב העובדים שעברו את ההכשרה עבדו בחברות גדולות",
      "ההכשרה נמשכה בממוצע שלושה ימים",
    ],
    correctAnswer: 0,
    explanation:
      "מסקנה סיבתית מתבססת על השוואה בין קבוצות מתאמת חלשה, אלא אם ניתן לשלול הסברים חלופיים. חלוקה אקראית לקבוצות שוללת הטיות בבחירה (למשל, שעובדים מרוצים ויזומים יותר בוחרים מלכתחילה לעבור הכשרה) ולכן מחזקת משמעותית את הטענה שההכשרה עצמה היא הגורם. חלוקה לפי חברות גדולות דווקא עלולה להוות הסבר חלופי (משתנה מתערב) ולכן אינה מחזקת. פרטי השיטה והמשך ההכשרה אינם נוגעים לשאלת הסיבתיות.",
  },
  {
    section: "verbal",
    topic: "הבנה והסקה לוגית",
    subtopic: "חידת שקרנים",
    difficulty: 4,
    body: 'שלושה חברים — דנה, יואב ורוני — כל אחד מהם העלה טענה אחת: דנה טענה: "יואב משקר". יואב טען: "רוני משקר". רוני טען: "גם דנה וגם יואב משקרים". ידוע כי בדיוק אחד מהשלושה דובר אמת. מי דובר אמת?',
    choices: ["יואב", "דנה", "רוני", "לא ניתן לקבוע על פי הנתונים"],
    correctAnswer: 0,
    explanation:
      'בודקים כל אפשרות: אם דנה דוברת אמת — אז יואב משקר, ולכן טענתו "רוני משקר" שקרית, כלומר רוני דובר אמת — אך זה סותר שיש בדיוק דובר אמת אחד. אם רוני דובר אמת — אז דנה ויואב שניהם משקרים; אך אם דנה משקרת, טענתה "יואב משקר" שקרית, ולכן יואב דובר אמת — סתירה נוספת. נותרת האפשרות שיואב דובר אמת: אז רוני משקר (לפי טענת יואב), ולכן טענת רוני ("דנה ויואב משקרים") שקרית — כלומר לפחות אחד מהם דובר אמת, וזה מתקיים כי יואב דובר אמת. וגם דנה משקרת (כנדרש כדי שיואב יהיה היחיד דובר האמת) — טענתה "יואב משקר" אכן שקרית, בהתאמה. כל התנאים מתקיימים ללא סתירה — לכן יואב הוא היחיד שדובר אמת.',
  },
  {
    section: "verbal",
    topic: "הבנה והסקה לוגית",
    subtopic: "חידת סידור בתור",
    difficulty: 4,
    body: "חמישה חברים — אבי, בני, גדי, דורון ואוריה — עומדים בתור זה אחר זה. ידוע: (1) בני עומד בדיוק מקום אחד לפני גדי. (2) אבי עומד ראשון בתור. (3) דורון אינו עומד אחרון. (4) אוריה עומד מיד אחרי גדי. מי עומד אחרון בתור?",
    choices: ["אוריה", "גדי", "דורון", "בני"],
    correctAnswer: 0,
    explanation:
      'לפי (2) אבי במקום 1. לפי (1) ו-(4), בני-גדי-אוריה הם שלושה מקומות רצופים בסדר הזה, ויכולים להתחיל רק במקום 2 או במקום 3 (כי אבי תופס את מקום 1). אם הרצף מתחיל במקום 2: בני=2, גדי=3, אוריה=4, ואז דורון נשאר במקום 5 — אבל זה סותר את סעיף (3) שדורון אינו אחרון. לכן הרצף חייב להתחיל במקום 3: דורון נשאר במקום 2 (מתאים לסעיף 3), בני=3, גדי=4, אוריה=5. בדיקה סופית: כל ארבעת הסעיפים מתקיימים במדויק. לכן במקום האחרון (5) עומד אוריה.',
  },
];

async function main() {
  const supabase = getSupabaseAdminClient();
  if (!supabase) {
    console.error("NEXT_PUBLIC_SUPABASE_URL / SUPABASE_SERVICE_ROLE_KEY are not set — aborting.");
    process.exitCode = 1;
    return;
  }

  if (VERBAL_QUESTIONS.length !== 12) {
    console.error(`Expected exactly 12 questions, found ${VERBAL_QUESTIONS.length} — aborting.`);
    process.exitCode = 1;
    return;
  }

  // Column names/set match the `questions` table as it actually exists in
  // Supabase — `options`/`correct_index` rather than `choices`/
  // `correct_answer` (see supabase/schema.sql's comment on this table).
  const now = new Date().toISOString();
  const rows = VERBAL_QUESTIONS.map((q) => ({
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

  console.log(`Inserting ${rows.length} original verbal questions into the shared question bank...`);
  const byTopic = new Map<string, number>();
  for (const q of VERBAL_QUESTIONS) byTopic.set(q.topic, (byTopic.get(q.topic) ?? 0) + 1);
  for (const [topic, count] of byTopic) console.log(`  ${topic}: ${count}`);
  const byDifficulty = new Map<number, number>();
  for (const q of VERBAL_QUESTIONS) byDifficulty.set(q.difficulty, (byDifficulty.get(q.difficulty) ?? 0) + 1);
  console.log(
    `  difficulty distribution: ${[...byDifficulty.entries()]
      .sort((a, b) => a[0] - b[0])
      .map(([d, c]) => `${d}=${c}`)
      .join(", ")}`
  );

  const { error } = await supabase.from("questions").insert(rows);
  if (error) {
    console.error("Insert failed:", error.message);
    process.exitCode = 1;
    return;
  }

  console.log(`Done. ${rows.length} questions inserted.`);
}

main();
