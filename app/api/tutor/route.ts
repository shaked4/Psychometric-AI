import { NextRequest, NextResponse } from "next/server";
import Anthropic from "@anthropic-ai/sdk";
import type { Section, SelfReportedError } from "@/types";

// Claude 3.5 Sonnet is retired (Oct 2025) and would 404. Claude Sonnet 5 is
// the current equivalent tier — good balance of quality/cost/latency for a
// per-answer tutoring call.
const MODEL = "claude-sonnet-5";

interface TutorQuestionContext {
  section: Section;
  topic: string;
  subtopic: string;
  body: string;
  passage: string | null;
  choices: string[];
  correctAnswer: number;
  explanation: string;
}

interface ChatMessage {
  role: "user" | "assistant";
  content: string;
}

interface TutorRequestBody {
  question: TutorQuestionContext;
  studentAnswer: number | null;
  selfReportedError: SelfReportedError | null;
  messages: ChatMessage[];
}

const SECTION_LABELS: Record<Section, string> = {
  quant: "כמותי",
  verbal: "מילולי",
  english: "אנגלית",
};

const ERROR_REASON_LABELS: Record<SelfReportedError, string> = {
  misread_question: "טעות בהבנת השאלה",
  calculation_error: "טעות חישוב / אלגברה",
  time_pressure: "ניהול זמנים / לחץ",
  knowledge_gap: "חוסר ידע בנושא",
  guessed: "ניחוש מושכל / ניחוש פראי",
};

// Shown whenever the model can't be reached — missing key, network error, or
// an API failure — so the practice flow never breaks because of the AI layer.
const OFFLINE_FALLBACK =
  "מצטערים, מאמן ה-AI אינו זמין כרגע. בינתיים, כדאי לעיין שוב בהסבר הרשמי " +
  "שמופיע למעלה — הוא מכסה את השלבים המרכזיים לפתרון השאלה.";

function buildSystemPrompt(
  question: TutorQuestionContext,
  studentAnswer: number | null,
  selfReportedError: SelfReportedError | null
): string {
  const chosenText = studentAnswer !== null ? question.choices[studentAnswer] : "לא נבחרה תשובה";
  const correctText = question.choices[question.correctAnswer];
  const reasonLine = selfReportedError
    ? `התלמיד/ה דיווח/ה שהסיבה לטעות הייתה: ${ERROR_REASON_LABELS[selfReportedError]}.`
    : "";

  return `אתה מאמן פסיכומטרי אישי, סבלני ותומך, שעוזר לתלמידים ישראלים המתכוננים למבחן הפסיכומטרי.

הקשר השאלה (${SECTION_LABELS[question.section]} — ${question.topic} / ${question.subtopic}):
"""
${question.passage ? `קטע: ${question.passage}\n` : ""}שאלה: ${question.body}
אפשרויות: ${question.choices.map((c, i) => `${i + 1}. ${c}`).join(" | ")}
התשובה הנכונה: ${correctText}
התשובה שהתלמיד/ה בחר/ה: ${chosenText}
${reasonLine}
ההסבר הרשמי: ${question.explanation}
"""

כללים מחייבים:
- כתוב תמיד בעברית חמה, מעודדת ותומכת — לעולם לא מתנשאת או שיפוטית.
- דיוק מתמטי/לוגי מוחלט הוא חובה. בדוק כל שלב חישוב בעצמך לפני שאתה כותב אותו. אם אינך בטוח/ה במשהו במאת האחוזים, אמור זאת בפירוש במקום לנחש.
- כל ביטוי מתמטי ייכתב בפורמט KaTeX בעזרת סימני דולר בודדים, למשל $x^2 + 1$.
- התמקד בדיוק בסיבה שבגללה התלמיד/ה טעה/ה בשאלה הזו הפעם — אל תשכפל את ההסבר הרשמי מילה במילה, אלא הצג אותו מזווית אחרת או בדרך אחרת שתתאים לסוג הטעות שדווחה.
- היה תמציתי: 3-5 משפטים לתשובה, אלא אם התלמיד/ה מבקש/ת פירוט נוסף באופן מפורש.
- ההסבר הרשמי הוא מקור האמת. אתה יכול לנסח אותו מחדש אך אסור לך לסתור אותו או להמציא עובדות.`;
}

export async function POST(req: NextRequest) {
  let body: TutorRequestBody;
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON body" }, { status: 400 });
  }

  const { question, studentAnswer, selfReportedError, messages } = body;

  if (!question || !Array.isArray(messages) || messages.length === 0) {
    return NextResponse.json({ error: "Missing question or messages" }, { status: 400 });
  }

  const apiKey = process.env.ANTHROPIC_API_KEY;
  if (!apiKey) {
    // No key configured (e.g. local/offline dev) — degrade smoothly instead
    // of failing the request.
    return NextResponse.json({ reply: OFFLINE_FALLBACK, offline: true });
  }

  const client = new Anthropic({ apiKey });

  try {
    const response = await client.messages.create({
      model: MODEL,
      max_tokens: 1024,
      system: buildSystemPrompt(question, studentAnswer, selfReportedError),
      messages: messages.map((m) => ({ role: m.role, content: m.content })),
    });

    if (response.stop_reason === "refusal") {
      return NextResponse.json({ reply: OFFLINE_FALLBACK, offline: true });
    }

    const textBlock = response.content.find(
      (block): block is Anthropic.TextBlock => block.type === "text"
    );

    return NextResponse.json({ reply: textBlock?.text ?? OFFLINE_FALLBACK });
  } catch (error) {
    console.error("Tutor API error:", error);
    return NextResponse.json({ reply: OFFLINE_FALLBACK, offline: true });
  }
}
