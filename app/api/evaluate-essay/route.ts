import { NextRequest, NextResponse } from "next/server";
import Anthropic from "@anthropic-ai/sdk";
import { zodOutputFormat } from "@anthropic-ai/sdk/helpers/zod";
import { z } from "zod";
import { scaleScore } from "@/lib/exam-history";
import type { EssayEvaluation } from "@/lib/essay-storage";

const MODEL = "claude-sonnet-5";

// Structured outputs don't support numeric min/max constraints, so the 1-6
// NITE scale is expressed as a literal union and re-validated by hand where
// it matters — the same workaround app/api/generate-questions/route.ts uses
// for correctAnswer.
const SCORE_1_TO_6 = z.union([
  z.literal(1),
  z.literal(2),
  z.literal(3),
  z.literal(4),
  z.literal(5),
  z.literal(6),
]);

const SentenceFeedbackSchema = z.object({
  original: z.string(),
  suggestion: z.string(),
  comment: z.string(),
});

const EvaluationSchema = z.object({
  contentScore: SCORE_1_TO_6,
  languageScore: SCORE_1_TO_6,
  strengths: z.array(z.string()),
  improvements: z.array(z.string()),
  reminiscentExamples: z.array(SentenceFeedbackSchema),
});

const MIN_WORDS_FOR_EVALUATION = 50;

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

/**
 * The model is asked for contentScore/languageScore, never for the final
 * estimate — same stats-layer-vs-narrative-layer split as everywhere else
 * in this codebase (CLAUDE.md). Reuses the exam sections' own scaleScore()
 * linear approximation: both 1-6 axes are normalized to a 0-1 fraction and
 * averaged before feeding the same 50-150 curve, so an essay's estimate is
 * directly comparable to a section score.
 */
function estimatePsychometricScore(contentScore: number, languageScore: number): number {
  const fraction = (contentScore - 1 + (languageScore - 1)) / 10;
  return scaleScore(fraction);
}

/** Plain heuristic fallback for when there's no API key or the model call
 * fails — grounded entirely in numbers actually measured from the essay
 * (word/paragraph/sentence counts, transition-word usage), never fabricated
 * content, matching the offline-fallback philosophy used by
 * app/api/analyze-mistakes/route.ts's buildTemplateAnalysis(). It can't
 * responsibly rewrite the student's prose without a model, so
 * reminiscentExamples only ever flags genuinely long sentences it can point
 * to directly in the text, and is left empty rather than invented content
 * when there's nothing objectively worth flagging. */
function buildTemplateEvaluation(essayText: string, wordCount: number): EssayEvaluation {
  const paragraphs = essayText.split(/\n{2,}/).map((p) => p.trim()).filter(Boolean);
  const sentences = splitSentences(essayText);
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

  const inTargetLength = wordCount >= 300 && wordCount <= 500;

  const contentScore = Math.max(
    1,
    Math.min(
      6,
      2 +
        (wordCount >= 250 ? 1 : 0) +
        (inTargetLength ? 1 : 0) +
        (paragraphs.length >= 3 ? 1 : 0) +
        (paragraphs.length >= 4 ? 1 : 0)
    )
  );

  const languageScore = Math.max(
    1,
    Math.min(
      6,
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

  if (transitionCount >= 2) {
    strengths.push(`נעשה שימוש ב-${transitionCount} מילות קישור לוגיות, המסייעות לזרימת הטיעון.`);
  } else {
    improvements.push('כדאי להוסיף יותר מילות קישור לוגיות (כגון "אולם", "לעומת זאת", "לכן") כדי לחדד את מבנה הטיעון.');
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

הערך את החיבור בשני צירים נפרדים, כל אחד בסולם שלם של 1 עד 6:

מימד התוכן (contentScore):
- בהירות התזה/העמדה שהוצגה
- טיעון הגיוני ובנייה סדורה של הנימוקים
- התייחסות אמיתית לטיעון הנגד (לא רק אזכור שטחי)
- מבנה ברור: פתיחה, גוף הטיעון, התייחסות לעמדה הנגדית, סיכום
- רלוונטיות מלאה לנושא שהוצג

מימד הלשון (languageScore):
- רגיסטר לשוני גבוה ותקין
- עושר לשוני ומגוון אוצר מילים
- גיוון תחבירי (לא רק משפטים פשוטים וחוזרים)
- שימוש מדויק במילות קישור ומעברים לוגיים
- דיוק דקדוקי ותחבירי

כללים מחייבים:
- ציין ציון שלם בין 1 ל-6 בכל ציר, ללא חצאים.
- strengths: 2-4 נקודות חוזק קונקרטיות, מבוססות על מה שבאמת כתוב בטקסט.
- improvements: 2-4 הערות ביקורת בונה וממוקדת, גם על תוכן וגם על לשון.
- reminiscentExamples: 2-4 פריטים של משוב ברמת המשפט — כל פריט מצטט משפט אמיתי מתוך הטקסט של הכותב/ת בשדה original (העתק מדויק, לא פרפרזה), מציע ניסוח חלופי או משופר בשדה suggestion, ומסביר בקצרה מדוע בשדה comment.
- לעולם אל תמציא ציטוטים שאינם מופיעים בטקסט המקורי.
- כתוב הכל בעברית, בטון מקצועי, ישיר אך מכבד ובונה.`;
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

  const apiKey = process.env.ANTHROPIC_API_KEY;
  if (!apiKey) {
    return NextResponse.json({
      evaluation: buildTemplateEvaluation(essayText, wordCount),
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
      return NextResponse.json({
        evaluation: buildTemplateEvaluation(essayText, wordCount),
        wordCount,
        offline: true,
      });
    }

    const { contentScore, languageScore, strengths, improvements, reminiscentExamples } =
      response.parsed_output;

    const evaluation: EssayEvaluation = {
      contentScore,
      languageScore,
      estimatedPsychometricScore: estimatePsychometricScore(contentScore, languageScore),
      strengths,
      improvements,
      reminiscentExamples,
    };

    return NextResponse.json({ evaluation, wordCount });
  } catch (error) {
    console.error("Evaluate essay error:", error);
    return NextResponse.json({
      evaluation: buildTemplateEvaluation(essayText, wordCount),
      wordCount,
      offline: true,
    });
  }
}
