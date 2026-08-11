import { NextRequest, NextResponse } from "next/server";
import Anthropic from "@anthropic-ai/sdk";
import { zodOutputFormat } from "@anthropic-ai/sdk/helpers/zod";
import { z } from "zod";
import { auth } from "@clerk/nextjs/server";
import { getSupabaseServerClient } from "@/lib/supabase-server";
import { MOCK_QUESTIONS } from "@/lib/mock-data";
import type { Question, Section } from "@/types";

/**
 * Singular, session-aware sibling of /api/generate-questions (plural): that
 * route is a stateless batch generator used by /practice/custom. This one
 * generates exactly one question at a time and is aware of the caller's
 * Supabase-synced history — it's what /practice/adaptive (Phase 17) uses so
 * "don't repeat a question I've already seen on another device" and
 * "pick a difficulty based on my actual accuracy in this topic" are both
 * possible, neither of which a stateless batch endpoint can do.
 */
const MODEL = "claude-sonnet-5";

type Difficulty = "easy" | "medium" | "hard";
type RequestedDifficulty = Difficulty | "adaptive";

const VALID_SECTIONS: Section[] = ["quant", "verbal", "english"];
const VALID_REQUESTED_DIFFICULTIES: RequestedDifficulty[] = ["easy", "medium", "hard", "adaptive"];

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

const MAX_EXCLUDE_TEXTS = 25;
const RECENT_QUESTION_CACHE_LIMIT = 40;

interface GenerateQuestionBody {
  section: Section;
  topic?: string;
  subtopic?: string;
  difficulty: RequestedDifficulty;
  /** Caller-computed accuracy (0-100) for this section/topic, from the full
   * local attempt log (lib/mastery.ts) — only meaningful when
   * difficulty === "adaptive". Computed client-side rather than
   * reconstructed here because the client already has the merged,
   * cross-device attempt log; re-deriving it server-side from a Supabase
   * snapshot alone risks missing attempts still mid-sync. */
  recentAccuracyPct?: number;
  /** Best-effort caller-known recent question bodies to avoid repeating —
   * used as-is for guests/offline; merged with a Supabase lookup below when
   * the caller is signed in, which is the part a stateless client can't do
   * on its own (it can't see AI questions served to this user's *other*
   * devices). */
  excludeQuestionTexts?: string[];
}

// Structured outputs don't support numeric range/array-length constraints,
// so correctAnswer is a literal union — same workaround as
// app/api/generate-questions/route.ts.
const GeneratedQuestionSchema = z.object({
  topic: z.string(),
  subtopic: z.string(),
  body: z.string(),
  passage: z.string().nullable(),
  choices: z.array(z.string()),
  correctAnswer: z.union([z.literal(0), z.literal(1), z.literal(2), z.literal(3)]),
  explanation: z.string(),
});

function resolveAdaptiveDifficulty(recentAccuracyPct: number | undefined): Difficulty {
  if (recentAccuracyPct === undefined) return "medium";
  if (recentAccuracyPct < 60) return "easy";
  if (recentAccuracyPct >= 85) return "hard";
  return "medium";
}

function buildSystemPrompt(excludeTexts: string[]): string {
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
- אם אינך בטוח באחוזים מלאים שהשאלה נכונה ופתירה בבירור, אל תכלול אותה.${avoidanceBlock}`;
}

function buildUserPrompt(
  section: Section,
  topic: string | undefined,
  subtopic: string | undefined,
  difficulty: Difficulty
): string {
  const topicInstruction = subtopic
    ? `השאלה חייבת להתמקד בנושא "${topic ?? subtopic}" ותת-הנושא "${subtopic}" — השתמש בדיוק בערכים האלה בשדות topic ו-subtopic.`
    : "בחר בעצמך נושא ותת-נושא מתאימים לסגנון המבחן הפסיכומטרי.";

  const englishReminder =
    section === "english" ? "\nתזכורת: כל תוכן השאלה (body, choices, explanation) חייב להיות באנגלית בלבד." : "";

  return `צור שאלה חדשה ומקורית אחת בקטע ${SECTION_LABELS[section]}, ברמת קושי ${DIFFICULTY_LABELS_HE[difficulty]}.
${topicInstruction}${englishReminder}`;
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

/** No API key, a refusal, or a thrown error all land here — same
 * never-error-the-user philosophy as every other AI route in this app. Skips
 * any mock question whose body exactly matches something in excludeTexts
 * before falling back to cycling the bank, since the mock bank is small
 * enough that exact repeats are a real risk for a user who's practiced a
 * lot. */
function buildMockQuestion(section: Section, subtopic: string | undefined, excludeTexts: string[]): Question {
  const excluded = new Set(excludeTexts.map((t) => t.trim()));
  const bySubtopic = subtopic
    ? MOCK_QUESTIONS.filter((q) => q.section === section && q.subtopic === subtopic)
    : [];
  const pool = bySubtopic.length > 0 ? bySubtopic : MOCK_QUESTIONS.filter((q) => q.section === section);
  const unseen = pool.filter((q) => !excluded.has(q.body.trim()));
  const base = (unseen.length > 0 ? unseen : pool)[Math.floor(Math.random() * (unseen.length > 0 ? unseen.length : pool.length))];

  return { ...base, id: crypto.randomUUID(), createdAt: new Date().toISOString() };
}

/** Merges the caller-supplied exclude list with this signed-in user's own
 * recent AI-generated questions from Supabase (question_cache), scoped to
 * the same section — this is the cross-device half of dedup a stateless
 * client can't provide on its own. Silently returns just the client list on
 * any auth/config/query failure, matching this app's everything-degrades
 * pattern rather than blocking generation on a sync problem. */
async function buildExcludeTexts(
  section: Section,
  topic: string | undefined,
  clientExcludeTexts: string[]
): Promise<string[]> {
  const base = clientExcludeTexts.slice(0, MAX_EXCLUDE_TEXTS);

  let userId: string | null = null;
  try {
    ({ userId } = await auth());
  } catch {
    return base;
  }
  if (!userId) return base;

  const supabase = getSupabaseServerClient();
  if (!supabase) return base;

  let query = supabase
    .from("question_cache")
    .select("body")
    .eq("clerk_user_id", userId)
    .eq("section", section);
  if (topic) query = query.eq("topic", topic);

  const { data, error } = await query.order("created_at", { ascending: false }).limit(RECENT_QUESTION_CACHE_LIMIT);

  if (error || !data) return base;

  const remoteTexts = (data as { body: string }[])
    .map((r) => r.body)
    .filter((body) => typeof body === "string" && body.length > 0);

  const merged = [...base, ...remoteTexts];
  return merged.slice(0, MAX_EXCLUDE_TEXTS + RECENT_QUESTION_CACHE_LIMIT);
}

async function generateOnce(
  client: Anthropic,
  section: Section,
  topic: string | undefined,
  subtopic: string | undefined,
  difficulty: Difficulty,
  excludeTexts: string[]
): Promise<Question | null> {
  const response = await client.messages.parse({
    model: MODEL,
    max_tokens: 3072,
    system: buildSystemPrompt(excludeTexts),
    messages: [{ role: "user", content: buildUserPrompt(section, topic, subtopic, difficulty) }],
    output_config: { format: zodOutputFormat(GeneratedQuestionSchema) },
  });

  if (response.stop_reason === "refusal" || !response.parsed_output) return null;
  if (response.parsed_output.choices.length !== 4) return null;

  return toQuestion(response.parsed_output, section, difficulty, topic, subtopic);
}

const MAX_GENERATION_ATTEMPTS = 2;

export async function POST(req: NextRequest) {
  let body: GenerateQuestionBody;
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON body" }, { status: 400 });
  }

  const { section, topic, subtopic, difficulty, recentAccuracyPct } = body;
  const clientExcludeTexts = Array.isArray(body.excludeQuestionTexts) ? body.excludeQuestionTexts : [];

  if (!VALID_SECTIONS.includes(section) || !VALID_REQUESTED_DIFFICULTIES.includes(difficulty)) {
    return NextResponse.json({ error: "Missing or invalid fields" }, { status: 400 });
  }

  const resolvedDifficulty: Difficulty =
    difficulty === "adaptive" ? resolveAdaptiveDifficulty(recentAccuracyPct) : difficulty;

  const excludeTexts = await buildExcludeTexts(section, topic, clientExcludeTexts);

  const apiKey = process.env.ANTHROPIC_API_KEY;
  if (!apiKey) {
    return NextResponse.json({
      question: buildMockQuestion(section, subtopic, excludeTexts),
      resolvedDifficulty,
      offline: true,
    });
  }

  const client = new Anthropic({ apiKey });

  for (let attempt = 1; attempt <= MAX_GENERATION_ATTEMPTS; attempt++) {
    try {
      const question = await generateOnce(client, section, topic, subtopic, resolvedDifficulty, excludeTexts);
      if (question && !excludeTexts.includes(question.body.trim())) {
        return NextResponse.json({ question, resolvedDifficulty });
      }
    } catch (error) {
      console.error(`Generate question error (attempt ${attempt}/${MAX_GENERATION_ATTEMPTS}):`, error);
    }
  }

  return NextResponse.json({
    question: buildMockQuestion(section, subtopic, excludeTexts),
    resolvedDifficulty,
    offline: true,
  });
}
