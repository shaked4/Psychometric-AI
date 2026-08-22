import { NextRequest, NextResponse } from "next/server";
import Anthropic from "@anthropic-ai/sdk";
import { zodOutputFormat } from "@anthropic-ai/sdk/helpers/zod";
import { z } from "zod";
import type { EssayEvaluation } from "@/lib/essay-storage";

// Haiku, not Sonnet: essay evaluation was taking 20-40s end-to-end on
// Sonnet, most of it model latency rather than the structured-output size.
// Haiku 4.5 is the current fast-tier model (the "claude-3-5-haiku"/
// "claude-3-haiku" snapshot ids are older, deprecated generations that
// predate this app's model family — everywhere else in this codebase
// already uses the current "-5" naming, e.g. generate-questions' own
// "claude-sonnet-5"). Structured-output grading against a fixed rubric is
// well within a fast model's ability; this isn't open-ended reasoning.
const MODEL = "claude-haiku-4-5-20251001";

// Structured outputs don't support numeric min/max constraints, so this is
// deliberately an unconstrained z.number() rather than z.number().min(1).max(6)
// — the 1-6 range is enforced by prompt instruction plus clampAxisScore()
// below, not by the schema. (app/api/generate-questions/route.ts's
// correctAnswer takes the opposite approach — a literal union — because it's
// a small discrete set; that trick doesn't extend to a continuous decimal
// range like this one.)
const DECIMAL_SCORE_1_TO_6 = z.number();

const SentenceFeedbackSchema = z.object({
  original: z.string(),
  suggestion: z.string(),
  comment: z.string(),
});

const EvaluationSchema = z.object({
  contentScore: DECIMAL_SCORE_1_TO_6,
  languageScore: DECIMAL_SCORE_1_TO_6,
  strengths: z.array(z.string()),
  improvements: z.array(z.string()),
  reminiscentExamples: z.array(SentenceFeedbackSchema),
});

/** The schema above can't enforce the 1-6 bound (see comment on
 * DECIMAL_SCORE_1_TO_6), so this is the actual guarantee: any value the
 * model returns gets clamped into range before it's ever used to compute
 * strengths/improvements text or the estimated score. Also guards against
 * a non-finite value (NaN, Infinity) reaching the client. */
function clampAxisScore(value: number): number {
  if (!Number.isFinite(value)) return 1;
  return Math.max(1, Math.min(6, value));
}

const MIN_WORDS_FOR_EVALUATION = 50;

// Below this fraction of unique words (after stripping punctuation), an
// essay is treated as spam/repetitive regardless of what the model — or
// the offline heuristic — would otherwise have scored it. Set fairly
// forgiving (real argumentative essays naturally reuse connector words and
// the essay's own key terms) so this only catches genuine "same phrase
// dozens of times" spam, not normal repetition.
const LEXICAL_RICHNESS_THRESHOLD = 0.3;
// A wall of text with no sentence breaks at all isn't a structured essay,
// independent of vocabulary — the other half of the "spam/gibberish"
// detection the heuristic fallback is asked for.
const MIN_SENTENCES_FOR_STRUCTURE = 3;
const MIN_SCORE = 1;

function countWords(text: string): number {
  const trimmed = text.trim();
  return trimmed.length === 0 ? 0 : trimmed.split(/\s+/).length;
}

function splitSentences(text: string): string[] {
  return text
    .split(/(?<=[.!?])\s+/)
    .map((s) => s.trim())
    .filter((s) => s.length > 0);
}

/** Unique words / total words, after stripping punctuation and casing —
 * the standard cheap proxy for "is this the same phrase copy-pasted over
 * and over" text. A normal essay of a few hundred words easily clears
 * LEXICAL_RICHNESS_THRESHOLD; "אני אוהב לכתוב" repeated 40 times does not. */
function computeLexicalRichness(text: string): number {
  const words = text
    .trim()
    .split(/\s+/)
    .map((w) => w.replace(/[.,!?;:'"()[\]{}״׳*\-–—]/g, "").toLowerCase())
    .filter((w) => w.length > 0);
  if (words.length === 0) return 1;
  return new Set(words).size / words.length;
}

interface EssayMetrics {
  paragraphs: string[];
  sentences: string[];
  lexicalRichness: number;
  /** Repetitive/gibberish text, or text missing basic sentence structure —
   * both contentScore and languageScore are hard-forced to 1 whenever this
   * is true, on every evaluation path (Claude or offline heuristic), so a
   * spam submission can't slip through just because the model didn't fully
   * follow the "flag it" instruction in the system prompt. */
  isFlaggedInvalid: boolean;
}

function computeEssayMetrics(essayText: string): EssayMetrics {
  const paragraphs = essayText
    .split(/\n{2,}/)
    .map((p) => p.trim())
    .filter(Boolean);
  const sentences = splitSentences(essayText);
  const lexicalRichness = computeLexicalRichness(essayText);
  const structureOk = paragraphs.length >= 1 && sentences.length >= MIN_SENTENCES_FOR_STRUCTURE;

  return {
    paragraphs,
    sentences,
    lexicalRichness,
    isFlaggedInvalid: lexicalRichness < LEXICAL_RICHNESS_THRESHOLD || !structureOk,
  };
}

/**
 * The model is asked for contentScore/languageScore, never for the final
 * estimate — same stats-layer-vs-narrative-layer split as everywhere else
 * in this codebase (CLAUDE.md). An even 50/50 average is safe to use again
 * now that both axes are genuine decimals (see DECIMAL_SCORE_1_TO_6 above)
 * rather than whole integers — the "only 11 possible sums" bucket-cap
 * problem the earlier 60/40 weighting worked around no longer applies, since
 * a continuous input naturally produces a continuous output. Deliberately
 * NOT lib/exam-history.ts's scaleScore(): that rounds to the nearest 5 to
 * match the MCQ sections' real-exam-style reporting, which would throw away
 * the decimal precision this is built for (e.g. 4.25 vs 4.4 should be
 * distinguishable in the final estimate) — this rounds to the nearest whole
 * integer instead, clamped to the same 50-150 range.
 */
function estimatePsychometricScore(contentScore: number, languageScore: number): number {
  const average = (contentScore + languageScore) / 2; // 1-6 scale
  const fraction = (average - 1) / 5; // normalized to 0-1
  const raw = 50 + fraction * 100; // 50-150
  return Math.max(50, Math.min(150, Math.round(raw)));
}

/** Deterministic result for text flagged by computeEssayMetrics() —
 * used on every path (live Claude call or offline heuristic) so a spam
 * submission is scored 1/1 and clearly labeled as such no matter which
 * evaluator produced it. */
function buildFlaggedInvalidEvaluation(metrics: EssayMetrics): EssayEvaluation {
  const reason =
    metrics.sentences.length < MIN_SENTENCES_FOR_STRUCTURE
      ? "הטקסט אינו בנוי כחיבור טיעון תקין — אין בו חלוקה למשפטים וּפסקאות."
      : `הטקסט מציג חזרתיות לשונית קיצונית (עושר לשוני של כ-${Math.round(metrics.lexicalRichness * 100)}% בלבד מהמילים ייחודיות).`;

  return {
    contentScore: MIN_SCORE,
    languageScore: MIN_SCORE,
    estimatedPsychometricScore: estimatePsychometricScore(MIN_SCORE, MIN_SCORE),
    strengths: [`החיבור סומן כלא תקין/חזרתי ולכן לא ניתן לזהות בו נקודות חוזק מהותיות. ${reason}`],
    improvements: [
      "יש לכתוב חיבור טיעון מקורי ורלוונטי לנושא שהוצג, במקום טקסט חוזר או חסר מבנה.",
      "החיבור צריך לכלול תזה ברורה, גוף טיעון עם נימוקים מגוונים, התייחסות לעמדה הנגדית וסיכום.",
    ],
    reminiscentExamples: [],
  };
}

/** Plain heuristic fallback for when there's no API key or the model call
 * fails — grounded entirely in numbers actually measured from the essay
 * (word/paragraph/sentence counts, transition-word usage), never fabricated
 * content, matching the offline-fallback philosophy used by
 * app/api/analyze-mistakes/route.ts's buildTemplateAnalysis(). It can't
 * responsibly rewrite the student's prose without a model, so
 * reminiscentExamples only ever flags genuinely long sentences it can point
 * to directly in the text, and is left empty rather than invented content
 * when there's nothing objectively worth flagging.
 *
 * POST() already returns buildFlaggedInvalidEvaluation() before this is ever
 * called when metrics.isFlaggedInvalid, but the guard is repeated here too
 * so this function stays correct on its own — a 300-word essay that's the
 * same sentence copy-pasted 40 times would otherwise still pass the plain
 * length/paragraph-count checks below. */
function buildTemplateEvaluation(essayText: string, wordCount: number, metrics: EssayMetrics): EssayEvaluation {
  if (metrics.isFlaggedInvalid) return buildFlaggedInvalidEvaluation(metrics);

  const { paragraphs, sentences } = metrics;
  const avgSentenceLen = sentences.length > 0 ? wordCount / sentences.length : 0;

  const TRANSITION_WORDS = [
    "אולם",
    "לעומת זאת",
    "מצד שני",
    "לכן",
    "לפיכך",
    "בנוסף",
    "יתרה מזאת",
    "למרות זאת",
    "עם זאת",
    "כתוצאה מכך",
    "משום כך",
    "יחד עם זאת",
  ];
  const transitionCount = TRANSITION_WORDS.reduce(
    (count, word) => count + (essayText.includes(word) ? 1 : 0),
    0
  );

  // Distinct from TRANSITION_WORDS above: those measure general connective
  // density (a language-axis signal), this specifically detects whether the
  // essay actually raises an opposing view — the one piece of the content
  // rubric (see buildSystemPrompt's "התייחסות אמיתית לטיעון הנגד") a cheap
  // keyword check can approximate at all.
  const COUNTERARGUMENT_MARKERS = [
    "מנגד",
    "לעומת זאת",
    "מצד שני",
    "יש הטוענים",
    "יש הסבורים",
    "אחרים טוענים",
    "אחרים סבורים",
    "יש החולקים",
  ];
  const hasCounterargument = COUNTERARGUMENT_MARKERS.some((marker) => essayText.includes(marker));

  // Doesn't move contentScore — same "can't reliably judge argument quality
  // from keywords alone" reasoning as the cap above. Overly decisive phrasing
  // ("אין ספק ש...") without any counterargument treatment is exactly the
  // "כתיבה החלטית מדי" pitfall the official writing guidance warns against,
  // so it's still worth surfacing as a concrete, text-grounded improvement
  // note even though the heuristic can't responsibly discount the score for it.
  const DECISIVE_PHRASES = ["אין ספק ש", "אין ספק כי", "ברור ש", "ברור כי", "בוודאות ש", "באופן חד משמעי"];
  const hasUnhedgedDecisiveLanguage =
    !hasCounterargument && DECISIVE_PHRASES.some((phrase) => essayText.includes(phrase));

  const inTargetLength = wordCount >= 300 && wordCount <= 500;

  // Capped at 4, not 6: length, paragraph count, and a keyword-matched
  // counterargument mention are all this heuristic can actually measure, and
  // a second real-world calibration check proved even that combination is
  // an unreliable predictor of content quality — one essay that checked
  // every one of these boxes was independently graded 2.8/6 content, 3.09/6
  // language (a structurally similar essay from the first check graded
  // 4.25/6 content). Same structural profile, ~1.5-point-different content
  // score: no amount of tuning keyword/length checks can resolve that gap,
  // because it comes down to whether the argument itself is logically sound
  // (a weak analogy, a shaky factual claim) — judging that requires reading
  // comprehension, which only a live Claude evaluation (see generateOnce
  // below) actually has. This cap exists to stop the fallback from
  // confidently handing out near-perfect scores it has no real basis for,
  // not to chase exact parity with either reference example.
  const contentScore = Math.max(
    1,
    Math.min(
      4,
      2 + (inTargetLength ? 1 : 0) + (paragraphs.length >= 3 ? 1 : 0) + (hasCounterargument ? 1 : 0)
    )
  );

  // Same reasoning as contentScore's cap above: the second calibration essay
  // hit every one of these surface signals (transition-word count, sentence
  // length, sentence count) yet was graded 3.09/6 for language — its actual
  // weaknesses were imprecise word choices and a couple of malformed words,
  // invisible to length/connector-count checks.
  const languageScore = Math.max(
    1,
    Math.min(
      4,
      2 +
        (transitionCount >= 2 ? 1 : 0) +
        (avgSentenceLen >= 8 && avgSentenceLen <= 25 ? 1 : 0) +
        (sentences.length >= 8 ? 1 : 0) +
        (transitionCount >= 4 ? 1 : 0)
    )
  );

  const strengths: string[] = [];
  const improvements: string[] = [];

  if (inTargetLength) {
    strengths.push(`אורך החיבור (${wordCount} מילים) נמצא בטווח היעד של 300–500 מילים.`);
  } else {
    improvements.push(
      `אורך החיבור הנוכחי (${wordCount} מילים) חורג מטווח היעד (300–500) — ${
        wordCount < 300 ? "כדאי להרחיב את הטיעון ואת הדוגמאות" : "כדאי לצמצם ולהתמקד בעיקר"
      }.`
    );
  }

  if (paragraphs.length >= 3) {
    strengths.push(`החיבור בנוי מ-${paragraphs.length} פסקאות, מה שמעיד על חלוקה מאורגנת של הטיעון.`);
  } else {
    improvements.push("כדאי לחלק את החיבור למספר פסקאות ברורות: פתיחה, גוף הטיעון, התייחסות לעמדה הנגדית וסיכום.");
  }

  if (hasCounterargument) {
    strengths.push("ניכרת התייחסות מפורשת לעמדה הנגדית, מה שמחזק את הטיעון המרכזי.");
  } else {
    improvements.push('כדאי להוסיף פסקה המתייחסת במפורש לעמדה הנגדית (למשל בפתיחה עם "מנגד" או "יש הטוענים") ולהסביר מדוע עמדתכם עדיפה.');
  }

  if (transitionCount >= 2) {
    strengths.push(`נעשה שימוש ב-${transitionCount} מילות קישור לוגיות, המסייעות לזרימת הטיעון.`);
  } else {
    improvements.push('כדאי להוסיף יותר מילות קישור לוגיות (כגון "אולם", "לעומת זאת", "לכן") כדי לחדד את מבנה הטיעון.');
  }

  if (hasUnhedgedDecisiveLanguage) {
    improvements.push(
      'החיבור משתמש בניסוחים החלטיים מדי (כגון "אין ספק ש..." או "ברור ש...") בלי להתייחס לעמדה הנגדית — ניסוח כזה מעיד על טיעון שטחי ולא על ביטחון. עדיף ניסוח זהיר ואובייקטיבי יותר, כמו "נראה כי" או "ניתן לטעון ש-".'
    );
  }

  if (strengths.length === 0) {
    strengths.push("ניכר מאמץ להתמודד עם הנושא שהוצג.");
  }

  const longSentences = sentences.filter((s) => s.split(/\s+/).length >= 35).slice(0, 2);
  const reminiscentExamples = longSentences.map((original) => ({
    original,
    suggestion: "שקלו לפצל משפט זה לשני משפטים קצרים יותר.",
    comment: `משפט זה ארוך במיוחד (${original.split(/\s+/).length} מילים) — משפטים ארוכים עלולים להקשות על הקורא לעקוב אחר הטיעון.`,
  }));

  return {
    contentScore,
    languageScore,
    estimatedPsychometricScore: estimatePsychometricScore(contentScore, languageScore),
    strengths,
    improvements,
    reminiscentExamples,
  };
}

function buildSystemPrompt(): string {
  return `אתה בוחן מקצועי המעריך מטלות כתיבה (חיבור טיעון) בסגנון המבחן הפסיכומטרי הישראלי, לפי אמות המידה של המרכז הארצי לבחינות ולהערכה (המיצ"ב הפסיכומטרי).

הערך את החיבור בשני ממדים נפרדים, בדיוק כפי שנעשה בבחינה האמיתית:
- ממד התוכן והטיעון (contentScore): היכולת להבין את נושא המטלה, להציג עמדה ברורה, לפתח רעיונות בצורה שיטתית, להשתמש בנימוקים ענייניים המקושרים זה לזה באופן הגיוני, למקד את הדיון בנושא, ולהתמודד עם עמדת נגד.
- ממד הלשון והביטוי (languageScore): תקינות תחבירית, פיסוק נכון, אוצר מילים, שימוש בשפה עיונית תקינה, משפטים ברורים וארגון תקין בפסקאות.

כל ממד מדורג בסולם רציף בין 1 ל-6, עם עוגני ציון קונקרטיים ברמות השלמות (1-6) — קרא אותם בעיון והשתמש בהם כדי להבחין בין רמות סמוכות (למשל בין 4 ל-5, או בין 5 ל-6), ולא רק בין "טוב" ל"פחות טוב". אם רמת החיבור נמצאת בין שתי רמות עוגן סמוכות, אל תעגלו אוטומטית לרמה הקרובה — ציינו ערך עשרוני מדויק המשקף את מיקומו היחסי (למשל 4.5 אם הוא בדיוק באמצע בין רמה 4 ל-5, או 4.25 אם הוא קרוב יותר לרמה 4 אך חורג ממנה בבירור בהיבט אחד או שניים):

מימד התוכן (contentScore) — עוגני ציון:
1: לא רלוונטי לנושא, חסר תזה, או טקסט חסר משמעות.
2: תזה מעורפלת מאוד; טיעון חד-צדדי לחלוטין ללא כל התייחסות לעמדה הנגדית; נימוקים כלליים וללא ביסוס.
3: תזה קיימת אך לא תמיד ברורה; התייחסות שטחית וחד-משפטית בלבד לטיעון הנגד (ללא התמודדות אמיתית איתו); נימוקים בסיסיים שאינם מפותחים לעומק.
4: תזה ברורה ומבנה תקין בן חמש פסקאות (פתיחה עם עמדה ברורה, שני טיעונים מפותחים בעד העמדה, פסקת התמודדות עם טיעון נגד, סיכום); התייחסות אמיתית לטיעון הנגד אך לא מעמיקה — מוזכר ונדחה בקצרה בלי לפרק אותו לגורמים; נימוקים סבירים אך חלקם נשארים כלליים או חסרי דוגמה קונקרטית.
5: תזה חדה ומדויקת; התמודדות מעמיקה עם הטיעון הנגדי החזק ביותר האפשרי (לא הקל ביותר להפרכה) — מפרק אותו ומראה נקודת חולשה אמיתית בו; כל נימוק נתמך בדוגמה או בהנמקה קונקרטית וספציפית לנושא, לא כללית.
6: כמו 5, ברמה יוצאת דופן: מבנה טיעוני מורכב ומדורג (למשל הכרה בגבולות העמדה שלו/ה עצמו/ה, או שילוב חלקי של טענת הנגד בתוך המסקנה); כל דוגמה מדויקת, ספציפית ובלתי ניתנת להחלפה בדוגמה כללית יותר; אין אף משפט "ממלא" שלא מקדם את הטיעון.

מימד הלשון (languageScore) — עוגני ציון:
1: שגיאות חמורות המקשות על ההבנה הבסיסית של המשפטים.
2: שפה בסיסית מאוד; משפטים קצרים וחוזרים באותו מבנה; כמעט ואין מילות קישור.
3: שפה תקינה אך פשוטה; רוב המשפטים דומים באורכם ובמבנהם (למשל כולם משפטים פשוטים או כולם באותו אורך); אוצר מילים כללי ולא מדויק; מילות קישור בסיסיות בלבד ("אבל", "אז").
4: שפה תקינה עם גיוון תחבירי מסוים — שילוב של משפטים ארוכים וקצרים, פשוטים ומורכבים; אוצר מילים סביר עם כמה בחירות מדויקות; מילות קישור מגוונות אך לא תמיד מדויקות להקשר.
5: גיוון תחבירי ברור לאורך כל החיבור (מבנים תחביריים שונים בכוונה, לא במקרה); אוצר מילים מדויק ועשיר, כולל ביטויים ספציפיים לרישום גבוה; כל מילת קישור משקפת במדויק את היחס הלוגי בין הרעיונות (ניגוד לעומת סיבה לעומת מסקנה, לא סתם "אבל"/"אז" גנריים).
6: כמו 5, ברמה יוצאת דופן: רגיסטר גבוה ועקבי מתחילת החיבור ועד סופו; גיוון תחבירי מתוחכם (למשל משפטי תנאי, מבני כפיפות מורכבים) המשרת את הטיעון ולא רק "מקשט" אותו; דיוק לשוני מוחלט ללא אף שגיאה או ניסוח מגושם.

כלל מכריע נגד ציונים סטטיים: אל תיתן ציון 5 כברירת מחדל לחיבור "טוב באופן כללי". לפני שאתה קובע ציון של 5 ומעלה, בדוק במפורש אם החיבור עומד בכל קריטריוני העוגן של אותו ציון — לא רק ברוח הכללית שלהם. אם שני חיבורים שונים מקבלים אותו ציון בציר מסוים, וודא שיש לך סיבה קונקרטית מתוך שני הטקסטים (לא רק "שניהם טובים") שמצדיקה זהות זו. שיפור מדיד בחיבור (יותר גיוון תחבירי, דוגמאות ספציפיות יותר, התמודדות עמוקה יותר עם טיעון נגדי) חייב להשתקף בשינוי הציון, גם אם רק בציר אחד.

כלל מאזן נגד קפדנות יתר (חשוב באותה מידה מהכלל הקודם, ובכיוון ההפוך): עוגני 5-6 מתארים רמת ביצוע גבוהה, לא היעדר כל פגם. אם חיבור עומד במובהק בקריטריונים המהותיים של עוגן 5 (תזה חדה, נימוק אחד לפחות מפותח לעומק עם דוגמה קונקרטית וספציפית, התמודדות אמיתית ולא שטחית עם הטיעון הנגד) — תנו לו 5 ומעלה גם אם יש בו נימוק משני חלש יותר, ניסוח מגושם בודד, או מילה לא מדויקת אחת. אל תורידו ציר שלם (למשל מ-5 ל-4) בגלל פגם יחיד ומבודד באחד מכמה רכיבים — שקלו את מכלול הביצוע מול העוגנים, לא כל חריגה קטנה בנפרד. תשובות מופת רשמיות שמפרסם המרכז הארצי לבחינות ולהערכה כדוגמה ל"חיבור טוב" אינן חפות מכל פגם קטן, ועדיין מייצגות ציון של 5 ומעלה בשני הצירים — אם השיפוט שלכם היה נותן לתשובת מופת רשמית כזו ציון של 4 ומשהו, זה סימן שאתם שופטים בקפדנות יתר ולא לפי מה שהעוגנים באמת דורשים.

כללים נוספים לדיוק השיפוט (טעויות נפוצות שיש לזהות ולשקלל):
- שפה "גבוהה" או מליצית שאינה מדויקת בהקשרה אינה מעלה את ציון הלשון, ולעיתים אף מורידה אותו — הבוחן מחפש בהירות ודיוק, לא רושם. העדיפו שיפוט לפי דיוק השימוש במילים על פני תחושת "גובה" הרישום.
- עמדה "מקורית" או יוצאת דופן אינה יתרון כשלעצמה בממד התוכן — מוערכת האיכות הלוגית של הטיעון ומידת פיתוחו, לא חדשנות הרעיון. עמדה פשוטה וברורה עם נימוקים חזקים עדיפה על עמדה מורכבת ולא מבוססת.
- משפטים כלליים וריקים שאינם מקדמים את הטיעון (כגון "לנושא זה השפעה רבה על החברה" או "זהו נושא מורכב וחשוב") מורידים את ציון התוכן גם אם הם תקינים לשונית — כל משפט חייב לתרום תוכן ממשי (נימוק, דוגמה, הבחנה).
- ניסוח החלטי מדי ("אין ספק ש...", "ברור ש...", "בוודאות") ללא הכרה במורכבות הסוגיה או בטיעון הנגד מעיד על טיעון שטחי, לא על ביטחון — שקללו זאת כלפי מטה בציון התוכן. לעומת זאת, ניסוחים זהירים ואובייקטיביים ("נראה כי", "ניתן לטעון ש-", "מכך משתמע") הם סימן חיובי לבשלות הטיעון.
- חיבור שדוחס יותר מדי רעיונות/טיעונים חצי-מפותחים במקום להתמקד ב-1-2 טיעונים מפותחים לעומק ייחשב חלש יותר בממד התוכן מחיבור ממוקד יותר, גם אם הוא "מכסה" יותר זוויות על הנייר.

כללים מחייבים:
- ציין ציון עשרוני מדויק בין 1 ל-6 בכל ציר (למשל 4.25, 3.8 או 5.1) — לא רק מספרים שלמים. עיגול גס למספר שלם כאשר החיבור בבירור נמצא בין שתי רמות עוגן הוא טעות: אם החיבור טוב יותר מרמת עוגן 4 אך לא מגיע לכל קריטריוני רמה 5, ציינו ערך כמו 4.2 או 4.4 בהתאם למידת הקרבה, ולא סתם 4 או 5.
- strengths: 2-4 נקודות חוזק קונקרטיות, מבוססות על מה שבאמת כתוב בטקסט.
- improvements: 2-4 הערות ביקורת בונה וממוקדת, גם על תוכן וגם על לשון.
- reminiscentExamples: 2-4 פריטים של משוב ברמת המשפט — כל פריט מצטט משפט אמיתי מתוך הטקסט של הכותב/ת בשדה original (העתק מדויק, לא פרפרזה), מציע ניסוח חלופי או משופר בשדה suggestion, ומסביר בקצרה מדוע בשדה comment.
- לעולם אל תמציא ציטוטים שאינם מופיעים בטקסט המקורי.
- כתוב הכל בעברית, בטון מקצועי, ישיר אך מכבד ובונה.

כלל תיקוף מחייב (עדיפות עליונה על כל הכללים האחרים):
אם הטקסט שנשלח הוא טקסט חזרתי באופן קיצוני (למשל אותו משפט או ביטוי החוזר על עצמו עשרות פעמים), טקסט חסר משמעות/ג'יבריש, או טקסט שאינו קשור כלל לנושא החיבור שהוצג — עליך:
1. לתת לשני הצירים, contentScore ו-languageScore, ציון 1 (הציון המינימלי) ללא יוצא מן הכלל.
2. לציין באופן מפורש וברור בשדות strengths ו-improvements שהחיבור סומן כלא תקין/חזרתי/לא רלוונטי, ומדוע (למשל חזרתיות, חוסר משמעות, או חוסר קשר לנושא).
3. שדה reminiscentExamples יכול להישאר ריק אם אין מה לצטט באופן מועיל.
אל תנסה "לרכך" את הציון או להעניק נקודות על מאמץ כאשר הטקסט אינו חיבור אמיתי — זהו הכלל החשוב ביותר בהערכה הזו.`;
}

function buildUserPrompt(promptTitle: string, promptText: string, essayText: string, wordCount: number): string {
  return `נושא החיבור: "${promptTitle}"
הנחיית הכתיבה: ${promptText}

מספר מילים בחיבור שנכתב: ${wordCount}

הטקסט שנכתב על ידי הנבחן/ת:
"""
${essayText}
"""`;
}

export async function POST(req: NextRequest) {
  let body: { promptTitle?: string; promptText?: string; essayText?: string };
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON body" }, { status: 400 });
  }

  const promptTitle = typeof body.promptTitle === "string" ? body.promptTitle : "";
  const promptText = typeof body.promptText === "string" ? body.promptText : "";
  const essayText = typeof body.essayText === "string" ? body.essayText : "";

  if (!promptText || !essayText) {
    return NextResponse.json({ error: "Missing promptText or essayText" }, { status: 400 });
  }

  const wordCount = countWords(essayText);
  if (wordCount < MIN_WORDS_FOR_EVALUATION) {
    return NextResponse.json({ insufficientContent: true, wordCount });
  }

  const metrics = computeEssayMetrics(essayText);

  // Obviously repetitive/structureless text is rejected before ever calling
  // Claude — metrics.isFlaggedInvalid is computed straight from the text, so
  // there's no need to spend an API call just to have the model reach the
  // same conclusion the system prompt already tells it to. The prompt's own
  // validation rule (buildSystemPrompt()) still matters for cases this cheap
  // heuristic can't catch, like well-formed but off-topic text.
  if (metrics.isFlaggedInvalid) {
    return NextResponse.json({ evaluation: buildFlaggedInvalidEvaluation(metrics), wordCount });
  }

  const apiKey = process.env.ANTHROPIC_API_KEY;
  // Diagnostic only — never logs the key itself, just whether process.env
  // actually has it by the time this request handler runs. If this ever
  // prints "present: false" while .env.local clearly has a value, that's a
  // real env-loading problem (wrong file, server not actually restarted,
  // etc.); if it prints "present: true" but the route still falls back
  // offline, the cause is downstream (see the catch block below) — a bad
  // key, no credit, a refusal, or a network error, not a missing key.
  console.log(`[evaluate-essay] ANTHROPIC_API_KEY present: ${Boolean(apiKey)}${apiKey ? `, length: ${apiKey.length}` : ""}`);

  if (!apiKey) {
    return NextResponse.json({
      evaluation: buildTemplateEvaluation(essayText, wordCount, metrics),
      wordCount,
      offline: true,
    });
  }

  const client = new Anthropic({ apiKey });

  try {
    const response = await client.messages.parse({
      model: MODEL,
      max_tokens: 4096,
      system: buildSystemPrompt(),
      messages: [{ role: "user", content: buildUserPrompt(promptTitle, promptText, essayText, wordCount) }],
      output_config: { format: zodOutputFormat(EvaluationSchema) },
    });

    if (response.stop_reason === "refusal" || !response.parsed_output) {
      console.error(
        `[evaluate-essay] Model returned no usable output — stop_reason: ${response.stop_reason}, parsed_output present: ${Boolean(response.parsed_output)}. Falling back to offline heuristic.`
      );
      return NextResponse.json({
        evaluation: buildTemplateEvaluation(essayText, wordCount, metrics),
        wordCount,
        offline: true,
      });
    }

    const { strengths, improvements, reminiscentExamples } = response.parsed_output;
    // Rounded to 2 decimals purely for display sanity (a raw float straight
    // off the model is already clean in practice, but this guards against
    // something like 4.2500000001) — clampAxisScore() is the actual 1-6
    // enforcement, since the schema itself can't declare that bound.
    const contentScore = Math.round(clampAxisScore(response.parsed_output.contentScore) * 100) / 100;
    const languageScore = Math.round(clampAxisScore(response.parsed_output.languageScore) * 100) / 100;

    const evaluation: EssayEvaluation = {
      contentScore,
      languageScore,
      estimatedPsychometricScore: estimatePsychometricScore(contentScore, languageScore),
      strengths,
      improvements,
      reminiscentExamples,
    };

    console.log("[evaluate-essay] Live Claude evaluation succeeded.");
    return NextResponse.json({ evaluation, wordCount });
  } catch (error) {
    // Anthropic SDK errors carry the useful detail on .status/.error rather
    // than the message alone (e.g. a 400 "credit balance too low" or a 401
    // bad-key error both just say "Error" at the top level) — surfacing
    // those explicitly is what actually answers "why did this fall back to
    // offline," not just that it did.
    const status = (error as { status?: number })?.status;
    const apiMessage = (error as { error?: { error?: { message?: string } } })?.error?.error?.message;
    console.error(
      `[evaluate-essay] Live Claude call failed — status: ${status ?? "n/a"}, message: ${
        apiMessage ?? (error instanceof Error ? error.message : String(error))
      }. Falling back to offline heuristic.`,
      error
    );
    return NextResponse.json({
      evaluation: buildTemplateEvaluation(essayText, wordCount, metrics),
      wordCount,
      offline: true,
    });
  }
}
