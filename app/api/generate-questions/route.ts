import { NextRequest, NextResponse } from "next/server";
import Anthropic from "@anthropic-ai/sdk";
import { zodOutputFormat } from "@anthropic-ai/sdk/helpers/zod";
import { z } from "zod";
import { MOCK_QUESTIONS } from "@/lib/mock-data";
import type { Question, Section } from "@/types";

// Note: the shared Question type actually lives in /types (not /lib/types) —
// this route imports from there.
const MODEL = "claude-sonnet-5";

type Difficulty = "easy" | "medium" | "hard";

const VALID_SECTIONS: Section[] = ["quant", "verbal", "english"];
const VALID_DIFFICULTIES: Difficulty[] = ["easy", "medium", "hard"];

const DIFFICULTY_TO_NUMERIC: Record<Difficulty, number> = { easy: 2, medium: 3, hard: 4 };
const DIFFICULTY_LABELS_HE: Record<Difficulty, string> = {
  easy: "קלה",
  medium: "בינונית",
  hard: "קשה",
};
const SECTION_LABELS: Record<Section, string> = {
  quant: "כמותי",
  verbal: "מילולי",
  english: "אנגלית",
};

interface GenerateRequestBody {
  section: Section;
  topic?: string;
  subtopic?: string;
  difficulty: Difficulty;
  count: number;
}

// Kept intentionally simple: no length/range constraints in the schema
// (structured outputs don't support numeric/array-length constraints), so
// choices.length === 4 and correctAnswer being in-range is re-checked by
// hand below, and correctAnswer is restricted to a literal union instead of
// min/max.
const GeneratedQuestionSchema = z.object({
  topic: z.string(),
  subtopic: z.string(),
  body: z.string(),
  passage: z.string().nullable(),
  choices: z.array(z.string()),
  correctAnswer: z.union([z.literal(0), z.literal(1), z.literal(2), z.literal(3)]),
  explanation: z.string(),
});

const GeneratedBatchSchema = z.object({
  questions: z.array(GeneratedQuestionSchema),
});

function buildSystemPrompt(): string {
  return `אתה מומחה בחיבור שאלות מקוריות למבחן הפסיכומטרי הישראלי.

כללים מחייבים:
- דיוק מתמטי, לוגי ולשוני מוחלט. בדוק בעצמך כל שלב פתרון לפני שאתה כותב שאלה — חייבת להיות בדיוק תשובה נכונה אחת מתוך 4 האפשרויות.
- לכל שאלה בדיוק 4 אפשרויות במערך choices, ו-correctAnswer הוא האינדקס (0, 1, 2 או 3) של התשובה הנכונה במערך (התחלה מ-0).
- כאשר יש ביטוי מתמטי, כתוב אותו בפורמט KaTeX עם סימני דולר בודדים בלבד, למשל $x^2+1$ — לעולם לא סימני דולר כפולים.
- שדה explanation מסביר את דרך הפתרון המלאה, שלב אחר שלב, ולא רק מציין את התשובה הנכונה.
- שאלות בקטע אנגלית (section = english) חייבות להיות כתובות כולן באנגלית: body, choices ו-explanation. שאלות בקטעים כמותי ומילולי נכתבות בעברית.
- שדה passage יהיה null אלא אם התבקשת ליצור שאלת הבנת הנקרא עם קטע קריאה קצר.
- אם אינך בטוח באחוזים מלאים שהשאלה נכונה ופתירה בבירור, אל תכלול אותה.`;
}

function buildUserPrompt(
  section: Section,
  topic: string | undefined,
  subtopic: string | undefined,
  difficulty: Difficulty,
  count: number
): string {
  const topicInstruction = subtopic
    ? `כל השאלות חייבות להתמקד בנושא "${topic ?? subtopic}" ותת-הנושא "${subtopic}" — השתמש בדיוק בערכים האלה בשדות topic ו-subtopic של כל שאלה.`
    : "בחר בעצמך נושאים ותתי-נושאים מגוונים ומתאימים לסגנון המבחן הפסיכומטרי.";

  const englishReminder =
    section === "english"
      ? "\nתזכורת: כל תוכן השאלות (body, choices, explanation) חייב להיות באנגלית בלבד."
      : "";

  return `צור בדיוק ${count} שאלות חדשות ומקוריות בקטע ${SECTION_LABELS[section]}, ברמת קושי ${DIFFICULTY_LABELS_HE[difficulty]}.
${topicInstruction}${englishReminder}`;
}

/** No API key, a refusal, a parse failure, or any thrown error all land
 * here — cycling through the vetted mock bank instead of ever surfacing an
 * error or fabricating unverified content offline. */
function buildMockQuestions(section: Section, subtopic: string | undefined, count: number): Question[] {
  const bySubtopic = subtopic
    ? MOCK_QUESTIONS.filter((q) => q.section === section && q.subtopic === subtopic)
    : [];
  const pool = bySubtopic.length > 0 ? bySubtopic : MOCK_QUESTIONS.filter((q) => q.section === section);

  return Array.from({ length: count }, (_, i) => {
    const base = pool[i % pool.length];
    return { ...base, id: crypto.randomUUID(), createdAt: new Date().toISOString() };
  });
}

function toQuestion(
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

/** One attempt at real generation. Returns null (not an error) for a
 * refusal, an empty parse, or zero questions surviving validation — the
 * caller decides whether to retry or fall back from there. */
async function generateOnce(
  client: Anthropic,
  section: Section,
  topic: string | undefined,
  subtopic: string | undefined,
  difficulty: Difficulty,
  safeCount: number
): Promise<Question[] | null> {
  const response = await client.messages.parse({
    model: MODEL,
    max_tokens: 6144,
    system: buildSystemPrompt(),
    messages: [{ role: "user", content: buildUserPrompt(section, topic, subtopic, difficulty, safeCount) }],
    output_config: { format: zodOutputFormat(GeneratedBatchSchema) },
  });

  if (response.stop_reason === "refusal" || !response.parsed_output) return null;

  const questions = response.parsed_output.questions
    .filter((q) => q.choices.length === 4)
    .slice(0, safeCount)
    .map((q) => toQuestion(q, section, difficulty, topic, subtopic));

  return questions.length > 0 ? questions : null;
}

const MAX_GENERATION_ATTEMPTS = 2;

export async function POST(req: NextRequest) {
  let body: GenerateRequestBody;
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON body" }, { status: 400 });
  }

  const { section, topic, subtopic, difficulty, count } = body;

  if (
    !VALID_SECTIONS.includes(section) ||
    !VALID_DIFFICULTIES.includes(difficulty) ||
    !count
  ) {
    return NextResponse.json({ error: "Missing or invalid fields" }, { status: 400 });
  }

  const safeCount = Math.min(10, Math.max(1, Math.round(count)));

  const apiKey = process.env.ANTHROPIC_API_KEY;
  if (!apiKey) {
    return NextResponse.json({ questions: buildMockQuestions(section, subtopic, safeCount), offline: true });
  }

  const client = new Anthropic({ apiKey });

  // A key is configured, so make a genuine effort to return real content:
  // a refusal, a parse failure, or a transient API error on the first try
  // shouldn't immediately dump the user into the 4-question mock bank when
  // a retry stands a good chance of succeeding. Only after both attempts
  // fail to produce valid questions do we fall back, and that fallback is
  // always flagged via `offline: true` so callers (e.g. the continuous
  // stream in /practice/custom) can react instead of looping mock content
  // forever.
  for (let attempt = 1; attempt <= MAX_GENERATION_ATTEMPTS; attempt++) {
    try {
      const questions = await generateOnce(client, section, topic, subtopic, difficulty, safeCount);
      if (questions) return NextResponse.json({ questions });
    } catch (error) {
      console.error(`Generate questions error (attempt ${attempt}/${MAX_GENERATION_ATTEMPTS}):`, error);
    }
  }

  return NextResponse.json({ questions: buildMockQuestions(section, subtopic, safeCount), offline: true });
}
