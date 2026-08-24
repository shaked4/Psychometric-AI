import { z } from "zod";
import type { Question, Section } from "@/types";

/**
 * Shared prompt-building and schema logic for one-question AI generation —
 * extracted from app/api/generate-question/route.ts so scripts/seed-question-bank.ts
 * (a standalone Node script, not a Next.js request handler) can drive the
 * exact same generation quality/rules without duplicating the prompt. The
 * Next.js route still owns request handling, auth, and the Supabase
 * question_cache dedup lookup — only the model-facing pieces live here.
 */

export type Difficulty = "easy" | "medium" | "hard";

export const DIFFICULTY_TO_NUMERIC: Record<Difficulty, number> = { easy: 2, medium: 3, hard: 4 };

export const DIFFICULTY_LABELS_HE: Record<Difficulty, string> = {
  easy: "קלה",
  medium: "בינונית",
  hard: "קשה",
};

export const SECTION_LABELS: Record<Section, string> = {
  quant: "כמותי",
  verbal: "מילולי",
  english: "אנגלית",
};

// Structured outputs don't support numeric range/array-length constraints,
// so correctAnswer is a literal union — same workaround as
// app/api/generate-questions/route.ts.
export const GeneratedQuestionSchema = z.object({
  topic: z.string(),
  subtopic: z.string(),
  body: z.string(),
  passage: z.string().nullable(),
  choices: z.array(z.string()),
  correctAnswer: z.union([z.literal(0), z.literal(1), z.literal(2), z.literal(3)]),
  explanation: z.string(),
});

/**
 * Condensed prompt-injection version of docs/psychometric_question_generation_guide.md
 * — structural/stylistic patterns and distractor-design principles distilled
 * from reviewing a real exam's *format*, not any text reproduced from it (see
 * that doc's "Scope and provenance" section for the exact boundary). Shared
 * by every AI generation path via buildSystemPrompt() below, so updating it
 * once updates /api/generate-question, /api/generate-questions, and
 * scripts/seed-question-bank.ts together.
 */
const EXAM_STYLE_GUIDELINES = `
עקרונות סגנון וקושי (מבוססים על ניתוח מבנה בחינות פסיכומטריות אמיתיות — ראה docs/psychometric_question_generation_guide.md):
- התאם את רמת הקושי המבוקשת לאבחנה הבאה, לא רק ל"תחושה":
  · כמותי: קלה = שלב חישוב אחד-שניים; בינונית = 2-3 שלבים או שילוב שני מושגים (למשל אחוז מתוך אחוז); קשה = שילוב כמה מושגים, בעיה מילולית רב-שלבית (קצבים/עבודה/תערובות/תנועה), או שאלת "מה בהכרח נכון" הדורשת בדיקת כל האפשרויות מול הנתונים.
  · מילולי: קלה = מחבר לוגי נפוץ (כי, אבל); בינונית = משפט טעם שחייב מעקב כדי להכריע בין אפשרויות; קשה = חידת היגיון עם 3+ נתונים הדורשת בדיקת מקרים ממצה, או טיעון הדורש זיהוי הנחת יסוד/החלשה-חיזוק.
  · אנגלית: קלה = אוצר מילים יומיומי; בינונית = מילה פחות שכיחה הדורשת הבחנה בין קונוטציות קרובות; קשה = מבנה דקדוקי מורכב (תנאי מעורב, מבנה קורלטיבי) או ניסוח מחדש שבו שינוי דק במילה אחת (למשל "מעט" מול "באופן דרמטי") הוא ההבדל בין נכון לשגוי.
- לקטע הכמותי עומד לרשות הנבחן דף נוסחאות: אחוזים, חזקות ושורשים, זהויות כפל מקוצר (a±b)², הפרש ריבועים, עצרת ותמורות, משפט תאלס/משולשים דומים, משפט פיתגורס ומשולש 30-60-90, היקף/שטח/גזרה במעגל, נפח ושטח פנים של גליל וחרוט, שטח טרפז — בסס שאלות על נוסחאות אלו ישירות, ובקושי גבוה שלב שתיים מהן באותה שאלה.
- כל מסיח (תשובה שגויה) חייב לתאום טעות ספציפית ושמה ניתנת, לא תשובה אקראית:
  · כמותי: נוסחה נכונה עם משתנה שגוי, טעות של אחד בספירת איברים/מרווחים, בסיס אחוז הפוך, עצירה שלב אחד לפני הסוף, שימוש בשורה/עמודה הלא נכונה בטבלת נתונים, יחס הפוך (A:B במקום B:A).
  · אנלוגיה: סדר הפוך של אותו יחס, יחס דומה אך שונה מהותית, חלק דיבור שונה.
  · השלמת משפט: מילה שמתאימה דקדוקית אך סותרת את משפט הטעם, מילה שמתאימה לצד ההפוך של ניגוד.
  · הבנת הנקרא/ניסוח מחדש: פרט נכון המוצג כרעיון מרכזי, הכללת יתר לא מבוססת, היפוך של הטענה המקורית, סיבה-תוצאה הפוכה, שינוי עוצמה של מילת-הגבלה.
- כשמתבקשת אצווה של כמה שאלות באותו נושא, סדר אותן בקושי עולה בהדרגה.`;

export function buildSystemPrompt(excludeTexts: string[]): string {
  const avoidanceBlock =
    excludeTexts.length > 0
      ? `\n\nהשאלות הבאות כבר נשאלו למשתמש הזה — אל תיצור שאלה זהה, כמעט זהה, או המבוססת על אותו תרגיל מספרי/לשוני מדויק:\n${excludeTexts
          .map((t, i) => `${i + 1}. ${t.slice(0, 200)}`)
          .join("\n")}`
      : "";

  return `אתה מומחה בחיבור שאלות מקוריות למבחן הפסיכומטרי הישראלי.

כללים מחייבים:
- דיוק מתמטי, לוגי ולשוני מוחלט. בדוק בעצמך כל שלב פתרון לפני שאתה כותב שאלה — חייבת להיות בדיוק תשובה נכונה אחת מתוך 4 האפשרויות.
- לכל שאלה בדיוק 4 אפשרויות במערך choices, ו-correctAnswer הוא האינדקס (0, 1, 2 או 3) של התשובה הנכונה במערך (התחלה מ-0).
- כאשר יש ביטוי מתמטי, כתוב אותו בפורמט KaTeX עם סימני דולר בודדים בלבד, למשל $x^2+1$ — לעולם לא סימני דולר כפולים.
- שדה explanation מסביר את דרך הפתרון המלאה, צעד אחר צעד, בעברית, ולא רק מציין את התשובה הנכונה.
- שאלות בקטע אנגלית (section = english) חייבות להיות כתובות כולן באנגלית: body, choices ו-explanation. שאלות בקטעים כמותי ומילולי נכתבות בעברית.
- שדה passage יהיה null אלא אם התבקשת ליצור שאלת הבנת הנקרא עם קטע קריאה קצר.
- אם אינך בטוח באחוזים מלאים שהשאלה נכונה ופתירה בבירור, אל תכלול אותה.
- שאלות אנלוגיה (topic/subtopic "אנלוגיות" בקטע מילולי): שדה body חייב להכיל אך ורק את זוג המילים בפורמט המדויק "מילה1 : מילה2 –" (מקף אחרי הזוג — למשל "עוגן : להפליג –"), ותו לא. לעולם אל תוסיף לגוף השאלה טקסט מטא כגון "(משפט מגדיר את היחס...)" או "איזה זוג מילים מבטא את אותו יחס?" — התבנית של השאלה (זוג מילים ואז ארבעה זוגות-מילים לבחירה) מספיקה כדי שהנבחן יבין מה נדרש ממנו, בדיוק כפי שמוצג במבחן האמיתי. כל הגדרת היחס בין המילים והנימוק לפסילת כל מסיח שייכים אך ורק לשדה explanation, שנחשף לנבחן רק לאחר שהוא עונה על השאלה.
${EXAM_STYLE_GUIDELINES}${avoidanceBlock}`;
}

export function buildUserPrompt(
  section: Section,
  topic: string | undefined,
  subtopic: string | undefined,
  difficulty: Difficulty,
  count?: number
): string {
  const topicInstruction = subtopic
    ? `${count && count > 1 ? "כל השאלות חייבות" : "השאלה חייבת"} להתמקד בנושא "${topic ?? subtopic}" ותת-הנושא "${subtopic}" — השתמש בדיוק בערכים האלה בשדות topic ו-subtopic${count && count > 1 ? " של כל שאלה" : ""}.`
    : `בחר בעצמך נושא${count && count > 1 ? "ים ותתי-נושאים מגוונים" : " ותת-נושא"} מתאימים לסגנון המבחן הפסיכומטרי.`;

  const englishReminder =
    section === "english"
      ? `\nתזכורת: כל תוכן ${count && count > 1 ? "השאלות" : "השאלה"} (body, choices, explanation) חייב להיות באנגלית בלבד.`
      : "";

  const opening =
    count && count > 1
      ? `צור בדיוק ${count} שאלות חדשות ומקוריות בקטע ${SECTION_LABELS[section]}, ברמת קושי ${DIFFICULTY_LABELS_HE[difficulty]}.`
      : `צור שאלה חדשה ומקורית אחת בקטע ${SECTION_LABELS[section]}, ברמת קושי ${DIFFICULTY_LABELS_HE[difficulty]}.`;

  return `${opening}
${topicInstruction}${englishReminder}`;
}

export function toQuestion(
  generated: z.infer<typeof GeneratedQuestionSchema>,
  section: Section,
  difficulty: Difficulty,
  overrideTopic: string | undefined,
  overrideSubtopic: string | undefined
): Question {
  return {
    id: crypto.randomUUID(),
    section,
    topic: overrideTopic ?? generated.topic,
    subtopic: overrideSubtopic ?? generated.subtopic,
    difficulty: DIFFICULTY_TO_NUMERIC[difficulty],
    type: generated.passage ? "mcq_with_passage" : "mcq",
    body: generated.body,
    passage: generated.passage,
    choices: generated.choices,
    correctAnswer: generated.correctAnswer,
    explanation: generated.explanation,
    media: null,
    createdAt: new Date().toISOString(),
  };
}
