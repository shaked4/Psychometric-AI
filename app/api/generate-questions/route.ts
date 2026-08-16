import { NextRequest, NextResponse } from "next/server";
import Anthropic from "@anthropic-ai/sdk";
import { zodOutputFormat } from "@anthropic-ai/sdk/helpers/zod";
import { z } from "zod";
import { MOCK_QUESTIONS } from "@/lib/mock-data";
import {
  GeneratedQuestionSchema,
  buildSystemPrompt,
  buildUserPrompt,
  toQuestion,
  type Difficulty,
} from "@/lib/question-generation";
import type { Question, Section } from "@/types";

// Note: the shared Question type actually lives in /types (not /lib/types) —
// this route imports from there. Prompt-building (system prompt, user
// prompt, the per-question schema, and exam-style guidelines) lives in
// lib/question-generation.ts, shared with app/api/generate-question/route.ts
// (singular) and scripts/seed-question-bank.ts — this route only adds the
// batch-array wrapper schema and mock-fallback/request-handling logic that's
// specific to it.
const MODEL = "claude-sonnet-5";

const VALID_SECTIONS: Section[] = ["quant", "verbal", "english"];
const VALID_DIFFICULTIES: Difficulty[] = ["easy", "medium", "hard"];

interface GenerateRequestBody {
  section: Section;
  topic?: string;
  subtopic?: string;
  difficulty: Difficulty;
  count: number;
}

const GeneratedBatchSchema = z.object({
  questions: z.array(GeneratedQuestionSchema),
});

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
    // This route is stateless (no per-user history) — nothing to exclude,
    // unlike app/api/generate-question/route.ts's cross-device dedup.
    system: buildSystemPrompt([]),
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

  try {
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
        console.error(`[generate-questions] Generation error (attempt ${attempt}/${MAX_GENERATION_ATTEMPTS}):`, error);
      }
    }

    return NextResponse.json({ questions: buildMockQuestions(section, subtopic, safeCount), offline: true });
  } catch (error) {
    // Catch-all for anything not already handled above (e.g. the Anthropic
    // client itself throwing, or an unexpected error building the mock
    // fallback) — previously this would surface in Vercel as a bare 500
    // with no way to tell what actually happened. Still returns a playable
    // set of questions rather than a hard error, matching this route's
    // everything-degrades-gracefully fallback philosophy.
    console.error("[generate-questions] Unhandled error:", error);
    return NextResponse.json({ questions: buildMockQuestions(section, subtopic, safeCount), offline: true });
  }
}
