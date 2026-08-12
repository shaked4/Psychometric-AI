/**
 * Bulk-generates and seeds the shared exam question bank (Phase 18) into
 * Supabase's `questions` table (supabase/schema.sql) via the Claude API.
 * Read by app/api/exam/allocate/route.ts (lib/exam-fetcher.ts) to draw
 * non-overlapping, deduplicated exam sets — see /exam/[section].
 *
 * Usage:
 *   npx tsx --env-file=.env.local scripts/seed-question-bank.ts [options]
 *
 * Options:
 *   --count=N        questions per (section, topic, subtopic) pair (default 500)
 *   --concurrency=N  parallel in-flight API calls (default 5)
 *   --section=quant  restrict to one section (quant | verbal | english)
 *   --dry-run        print the generation plan and exit — no API calls, no
 *                     writes, no env vars required
 *
 * Requires ANTHROPIC_API_KEY, NEXT_PUBLIC_SUPABASE_URL, and
 * SUPABASE_SERVICE_ROLE_KEY (see .env.local.example) for a real run.
 *
 * COST/TIME WARNING: the default --count=500 calls the Claude API roughly
 * 500 times per (section, topic, subtopic) pair. With this repo's current
 * seed-topic taxonomy that's several thousand calls total, and will take a
 * long time and real API spend. Always run --dry-run first to see the exact
 * plan, and consider starting with a much smaller --count (e.g. 20-50) to
 * validate quality before scaling up.
 */

import Anthropic from "@anthropic-ai/sdk";
import { zodOutputFormat } from "@anthropic-ai/sdk/helpers/zod";
import { createClient, type SupabaseClient } from "@supabase/supabase-js";
import { getAllTopics } from "@/lib/stats";
import { CHEATSHEET_CARDS } from "@/lib/cheatsheets";
import {
  GeneratedQuestionSchema,
  buildSystemPrompt,
  buildUserPrompt,
  toQuestion,
  type Difficulty,
} from "@/lib/question-generation";
import type { Question, Section } from "@/types";

/**
 * Deliberately not a reuse of lib/supabase-server.ts's getSupabaseServerClient()
 * — that file starts with `import "server-only"`, which unconditionally
 * throws when required outside Next.js's own bundler (it relies on webpack
 * swapping it for a no-op in server-graph builds; a standalone script run
 * via tsx has no such swap). Same client construction, just inlined here.
 */
function getSupabaseAdminClient(): SupabaseClient | null {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!url || !serviceRoleKey) return null;
  return createClient(url, serviceRoleKey, { auth: { persistSession: false } });
}

const MODEL = "claude-sonnet-5";
const DEFAULT_COUNT_PER_SUBTOPIC = 500;
const DEFAULT_CONCURRENCY = 5;
const MAX_GENERATION_ATTEMPTS = 2;
// How many recently-generated bodies (within this run, per subtopic) get
// passed as the model's "don't repeat these" list — same avoidance
// mechanism app/api/generate-question/route.ts uses per-request, just
// accumulated across this whole seeding run instead of one call.
const RECENT_EXCLUDE_LIMIT = 30;
const INSERT_BATCH_SIZE = 20;
// Roughly balanced, medium-weighted spread — matches how a real question
// bank shouldn't be uniformly one difficulty.
const DIFFICULTY_CYCLE: Difficulty[] = ["easy", "medium", "medium", "hard"];

interface SeedTopic {
  section: Section;
  topic: string;
  subtopic: string;
}

/** Baseline taxonomy from the mock bank (lib/mock-data.ts via getAllTopics)
 * plus every topic/subtopic lib/cheatsheets.ts references — the cheat sheet
 * cards intentionally cover ground (Geometry, Percentages, English
 * prefixes/suffixes) the small mock bank doesn't, so a real seeded bank
 * should too. Deduplicated since a few overlap on purpose (e.g. ממוצעים /
 * ממוצע משוקלל, בעיות תנועה ועבודה / עבודה משותפת). */
function collectSeedTopics(): SeedTopic[] {
  const seen = new Set<string>();
  const topics: SeedTopic[] = [];
  function add(section: Section, topic: string, subtopic: string) {
    const key = `${section}::${topic}::${subtopic}`;
    if (seen.has(key)) return;
    seen.add(key);
    topics.push({ section, topic, subtopic });
  }
  for (const t of getAllTopics()) add(t.section, t.topic, t.subtopic);
  for (const c of CHEATSHEET_CARDS) add(c.section, c.topic, c.subtopic);
  return topics;
}

interface ParsedArgs {
  count: number;
  concurrency: number;
  dryRun: boolean;
  onlySection: Section | null;
}

function parseArgs(argv: string[]): ParsedArgs {
  function get(name: string): string | undefined {
    const found = argv.find((a) => a.startsWith(`--${name}=`));
    return found?.split("=")[1];
  }
  const sectionArg = get("section");
  const validSections: Section[] = ["quant", "verbal", "english"];
  return {
    count: Number(get("count") ?? DEFAULT_COUNT_PER_SUBTOPIC),
    concurrency: Number(get("concurrency") ?? DEFAULT_CONCURRENCY),
    dryRun: argv.includes("--dry-run"),
    onlySection: sectionArg && validSections.includes(sectionArg as Section) ? (sectionArg as Section) : null,
  };
}

/** Simple bounded-concurrency worker pool — no new dependency needed for
 * something this small. */
async function runWithConcurrency<T>(items: T[], limit: number, worker: (item: T, index: number) => Promise<void>) {
  let cursor = 0;
  async function next(): Promise<void> {
    const i = cursor++;
    if (i >= items.length) return;
    await worker(items[i], i);
    return next();
  }
  await Promise.all(Array.from({ length: Math.max(1, Math.min(limit, items.length)) }, () => next()));
}

async function generateOne(
  client: Anthropic,
  section: Section,
  topic: string,
  subtopic: string,
  difficulty: Difficulty,
  excludeTexts: string[]
): Promise<Question | null> {
  for (let attempt = 1; attempt <= MAX_GENERATION_ATTEMPTS; attempt++) {
    try {
      const response = await client.messages.parse({
        model: MODEL,
        max_tokens: 3072,
        system: buildSystemPrompt(excludeTexts),
        messages: [{ role: "user", content: buildUserPrompt(section, topic, subtopic, difficulty) }],
        output_config: { format: zodOutputFormat(GeneratedQuestionSchema) },
      });
      if (response.stop_reason === "refusal" || !response.parsed_output) continue;
      if (response.parsed_output.choices.length !== 4) continue;
      return toQuestion(response.parsed_output, section, difficulty, topic, subtopic);
    } catch (error) {
      console.error(
        `  ! generation error (attempt ${attempt}/${MAX_GENERATION_ATTEMPTS}) for ${section}/${subtopic}:`,
        error instanceof Error ? error.message : error
      );
    }
  }
  return null;
}

async function insertBatch(supabase: SupabaseClient, questions: Question[]) {
  if (questions.length === 0) return;
  const rows = questions.map((q) => ({
    id: q.id,
    section: q.section,
    topic: q.topic,
    subtopic: q.subtopic,
    difficulty: q.difficulty,
    type: q.type,
    body: q.body,
    passage: q.passage,
    choices: q.choices,
    correct_answer: q.correctAnswer,
    explanation: q.explanation,
    media: q.media,
    created_at: q.createdAt,
  }));
  const { error } = await supabase.from("questions").insert(rows);
  if (error) console.error(`  ! insert error:`, error.message);
}

async function seedSubtopic(
  client: Anthropic,
  supabase: SupabaseClient,
  seedTopic: SeedTopic,
  count: number,
  concurrency: number
): Promise<{ generated: number; failed: number }> {
  const { section, topic, subtopic } = seedTopic;
  console.log(`\n${section} / ${topic} / ${subtopic} — generating ${count} questions...`);

  let generated = 0;
  let failed = 0;
  const recentBodies: string[] = [];
  let buffer: Question[] = [];

  async function flush() {
    if (buffer.length === 0) return;
    const toInsert = buffer;
    buffer = [];
    await insertBatch(supabase, toInsert);
  }

  const indices = Array.from({ length: count }, (_, i) => i);
  await runWithConcurrency(indices, concurrency, async (i) => {
    const difficulty = DIFFICULTY_CYCLE[i % DIFFICULTY_CYCLE.length];
    const question = await generateOne(client, section, topic, subtopic, difficulty, recentBodies.slice(-RECENT_EXCLUDE_LIMIT));
    if (!question) {
      failed += 1;
      return;
    }
    generated += 1;
    recentBodies.push(question.body);
    buffer.push(question);
    if (buffer.length >= INSERT_BATCH_SIZE) await flush();
    if (generated % 50 === 0) console.log(`  ...${generated}/${count} generated`);
  });

  await flush();
  console.log(`  done: ${generated} generated, ${failed} failed for ${section}/${subtopic}`);
  return { generated, failed };
}

async function main() {
  const { count, concurrency, dryRun, onlySection } = parseArgs(process.argv.slice(2));
  let seedTopics = collectSeedTopics();
  if (onlySection) seedTopics = seedTopics.filter((t) => t.section === onlySection);

  const totalPlanned = seedTopics.length * count;
  console.log("Question bank seed plan:");
  console.log(`  ${seedTopics.length} (section, topic, subtopic) pairs x ${count} questions = ${totalPlanned} questions`);
  console.log(`  concurrency: ${concurrency}`);
  for (const t of seedTopics) console.log(`    - ${t.section} / ${t.topic} / ${t.subtopic}`);

  if (dryRun) {
    console.log("\n--dry-run: no API calls or database writes were made.");
    return;
  }

  const apiKey = process.env.ANTHROPIC_API_KEY;
  if (!apiKey) {
    console.error("\nANTHROPIC_API_KEY is not set — aborting. Run with --dry-run to preview the plan without it.");
    process.exitCode = 1;
    return;
  }

  const supabase = getSupabaseAdminClient();
  if (!supabase) {
    console.error("\nNEXT_PUBLIC_SUPABASE_URL / SUPABASE_SERVICE_ROLE_KEY are not set — aborting.");
    process.exitCode = 1;
    return;
  }

  console.log(`\nThis will make up to ~${totalPlanned} Claude API calls and write to the shared Supabase question bank.`);
  console.log("Starting in 5 seconds — Ctrl+C to cancel.");
  await new Promise((resolve) => setTimeout(resolve, 5000));

  const client = new Anthropic({ apiKey });
  let totalGenerated = 0;
  let totalFailed = 0;

  for (const seedTopic of seedTopics) {
    const { generated, failed } = await seedSubtopic(client, supabase, seedTopic, count, concurrency);
    totalGenerated += generated;
    totalFailed += failed;
  }

  console.log(`\nDone. ${totalGenerated} questions inserted, ${totalFailed} generation failures.`);
}

main().catch((error) => {
  console.error("Fatal error:", error);
  process.exitCode = 1;
});
