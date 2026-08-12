import type { Section } from "@/types";

export interface CheatsheetCard {
  id: string;
  section: Section;
  category: string;
  title: string;
  /** KaTeX source (no $ delimiters) — quant cards only. English cards teach
   * word parts, not formulas, so this is omitted for them. */
  formula?: string;
  description: string;
  /** Fed straight into /api/generate-question's topic/subtopic fields for
   * "Practice This Formula" — deliberately not restricted to topics that
   * already exist in lib/mock-data.ts, since the AI route generates
   * original questions for any topic/subtopic it's given (see
   * app/api/generate-question/route.ts's buildUserPrompt). Some, like
   * ממוצעים / ממוצע משוקלל, do line up with the mock bank on purpose so the
   * offline fallback (which filters MOCK_QUESTIONS by subtopic) still finds
   * a good match with no API key configured. */
  topic: string;
  subtopic: string;
}

export const CHEATSHEET_CARDS: CheatsheetCard[] = [
  {
    id: "geometry-triangle-area",
    section: "quant",
    category: "גיאומטריה",
    title: "שטח משולש",
    formula: "A = \\dfrac{1}{2} \\cdot b \\cdot h",
    description: "$b$ = אורך הבסיס, $h$ = הגובה הניצב אליו מהקודקוד הנגדי — השטח שווה למחצית המכפלה שלהם.",
    topic: "גיאומטריה",
    subtopic: "שטח והיקף משולש",
  },
  {
    id: "geometry-pythagoras",
    section: "quant",
    category: "גיאומטריה",
    title: "משפט פיתגורס",
    formula: "a^2 + b^2 = c^2",
    description: "במשולש ישר-זווית, סכום ריבועי הניצבים שווה לריבוע היתר — שימושי גם לחישוב מרחקים.",
    topic: "גיאומטריה",
    subtopic: "משפט פיתגורס",
  },
  {
    id: "geometry-circle",
    section: "quant",
    category: "גיאומטריה",
    title: "שטח והיקף מעגל",
    formula: "A = \\pi r^2, \\quad C = 2\\pi r",
    description: "שטח המעגל תלוי בריבוע הרדיוס; ההיקף תלוי ברדיוס בלבד — הבדל שכיח לבלבל ביניהם.",
    topic: "גיאומטריה",
    subtopic: "שטח והיקף מעגל",
  },
  {
    id: "algebra-quadratic-formula",
    section: "quant",
    category: "אלגברה",
    title: "נוסחת השורשים",
    formula: "x = \\dfrac{-b \\pm \\sqrt{b^2 - 4ac}}{2a}",
    description: "פותרת כל משוואה ריבועית מהצורה $ax^2+bx+c=0$ — שימו לב לסימן ה-$\\pm$, שתי תשובות אפשריות.",
    topic: "אלגברה",
    subtopic: "משוואה ריבועית",
  },
  {
    id: "algebra-difference-of-squares",
    section: "quant",
    category: "אלגברה",
    title: "הפרש ריבועים",
    formula: "a^2 - b^2 = (a-b)(a+b)",
    description: "פירוק שמופיע חוזר ונשנה בשאלות חישוב מהיר — זיהוי הצורה הזו חוסך שלבי חישוב שלמים.",
    topic: "אלגברה",
    subtopic: "פירוק לגורמים",
  },
  {
    id: "averages-weighted",
    section: "quant",
    category: "ממוצעים ויחסים",
    title: "ממוצע משוקלל — שיטת המרחקים",
    formula: "\\dfrac{n_A}{n_B} = \\dfrac{d_B}{d_A}",
    description:
      "$n_A, n_B$ = גדלי שתי הקבוצות, $d_A, d_B$ = המרחק של כל קבוצה מהממוצע הכללי — היחס בין הגדלים שווה ליחס ההפוך של המרחקים, מהיר משמעותית מפתרון משוואות.",
    topic: "ממוצעים",
    subtopic: "ממוצע משוקלל",
  },
  {
    id: "ratios-percent-change",
    section: "quant",
    category: "ממוצעים ויחסים",
    title: "אחוז שינוי",
    formula: "\\%\\Delta = \\dfrac{V_{new} - V_{old}}{V_{old}} \\times 100",
    description: "$V_{old}$ = הערך המקורי, $V_{new}$ = הערך החדש — תמיד מחלקים בערך המקורי, לא בחדש. טעות נפוצה שהופכת את התוצאה.",
    topic: "אחוזים",
    subtopic: "אחוז שינוי",
  },
  {
    id: "work-rate-combined",
    section: "quant",
    category: "עבודה ותנועה",
    title: "עבודה משותפת",
    formula: "\\dfrac{1}{t} = \\dfrac{1}{t_1} + \\dfrac{1}{t_2}",
    description: "כששניים עובדים יחד, קצבי העבודה (לא הזמנים!) הם אלה שמצטברים — לכן עובדים עם הופכי הזמן.",
    topic: "בעיות תנועה ועבודה",
    subtopic: "עבודה משותפת",
  },
  {
    id: "english-prefix-un",
    section: "english",
    category: "Prefixes",
    title: "un-",
    description: "Reverses or negates meaning — \"not\" or \"opposite of.\" e.g. happy → unhappy, likely → unlikely.",
    topic: "Vocabulary",
    subtopic: "Prefixes: un-",
  },
  {
    id: "english-prefix-re",
    section: "english",
    category: "Prefixes",
    title: "re-",
    description: "\"Again\" or \"back.\" e.g. rewrite (write again), return (go back), reconsider (consider again).",
    topic: "Vocabulary",
    subtopic: "Prefixes: re-",
  },
  {
    id: "english-suffix-able",
    section: "english",
    category: "Suffixes",
    title: "-able / -ible",
    description: "\"Capable of being.\" e.g. readable (can be read), reversible (can be reversed).",
    topic: "Vocabulary",
    subtopic: "Suffixes: -able/-ible",
  },
  {
    id: "english-suffix-tion",
    section: "english",
    category: "Suffixes",
    title: "-tion / -sion",
    description: "Turns a verb into a noun naming an action or state. e.g. decide → decision, create → creation.",
    topic: "Vocabulary",
    subtopic: "Suffixes: -tion/-sion",
  },
  {
    id: "english-suffix-less",
    section: "english",
    category: "Suffixes",
    title: "-less",
    description: "\"Without.\" e.g. hopeless (without hope), careless (without care).",
    topic: "Vocabulary",
    subtopic: "Suffixes: -less",
  },
];
