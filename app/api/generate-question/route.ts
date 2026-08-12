import { NextRequest, NextResponse } from "next/server";
import Anthropic from "@anthropic-ai/sdk";
import { zodOutputFormat } from "@anthropic-ai/sdk/helpers/zod";
import { auth } from "@clerk/nextjs/server";
import { getSupabaseServerClient } from "@/lib/supabase-server";
import { MOCK_QUESTIONS } from "@/lib/mock-data";
import {
  GeneratedQuestionSchema,
  buildSystemPrompt,
  buildUserPrompt,
  toQuestion,
  type Difficulty,
} from "@/lib/question-generation";
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

type RequestedDifficulty = Difficulty | "adaptive";

const VALID_SECTIONS: Section[] = ["quant", "verbal", "english"];
const VALID_REQUESTED_DIFFICULTIES: RequestedDifficulty[] = ["easy", "medium", "hard", "adaptive"];

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

function resolveAdaptiveDifficulty(recentAccuracyPct: number | undefined): Difficulty {
  if (recentAccuracyPct === undefined) return "medium";
  if (recentAccuracyPct < 60) return "easy";
  if (recentAccuracyPct >= 85) return "hard";
  return "medium";
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
