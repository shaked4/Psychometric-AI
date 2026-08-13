import "server-only";
import type { SupabaseClient } from "@supabase/supabase-js";
import type { Question, Section } from "@/types";

/**
 * Smart exam allocation engine (Phase 18) — draws non-overlapping,
 * randomized exam sets from the shared `questions` bank (supabase/schema.sql),
 * seeded by scripts/seed-question-bank.ts. Lives here rather than inline in
 * app/api/exam/allocate/route.ts so the allocation/dedup *logic* is testable
 * and reusable independent of request handling, same reasoning as
 * lib/post-mortem.ts and lib/mastery.ts being plain functions the API routes
 * and pages both call into.
 *
 * Only ever imported from server code (API routes) — never from a client
 * component — since it takes a service-role SupabaseClient.
 */

/**
 * Column names/set here match the `questions` table as it actually exists
 * in Supabase today — `options`/`correct_index` rather than `choices`/
 * `correct_answer`, and no `type`/`passage`/`media` columns at all (the
 * table was hand-created via the Table Editor before this feature's SQL
 * migration was written, and diverged from supabase/schema.sql). Every row
 * is treated as a plain "mcq": any reading-comprehension passage gets
 * folded into `body` at write time (see scripts/seed-hardcoded-questions.ts
 * and scripts/seed-question-bank.ts) rather than kept separate.
 */
interface QuestionRow {
  id: string;
  section: Section;
  topic: string;
  subtopic: string;
  difficulty: number;
  body: string;
  options: string[];
  correct_index: number;
  explanation: string;
  created_at: string;
}

function rowToQuestion(row: QuestionRow): Question {
  return {
    id: row.id,
    section: row.section,
    topic: row.topic,
    subtopic: row.subtopic,
    difficulty: row.difficulty,
    type: "mcq",
    body: row.body,
    passage: null,
    choices: row.options,
    correctAnswer: row.correct_index,
    explanation: row.explanation,
    media: null,
    createdAt: row.created_at,
  };
}

/** Fisher-Yates — avoids the `sort(() => Math.random() - 0.5)` bias trap. */
function shuffle<T>(items: T[]): T[] {
  const result = [...items];
  for (let i = result.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [result[i], result[j]] = [result[j], result[i]];
  }
  return result;
}

// Caps how much of the section pool a single allocation call scans — large
// enough that a section with a few thousand seeded questions still gets a
// well-mixed sample, small enough to keep the query and in-memory shuffle
// cheap. Revisit upward if scripts/seed-question-bank.ts is ever run with a
// per-subtopic count that pushes a section's total past this.
const POOL_SCAN_LIMIT = 2000;

export interface AllocateExamQuestionsParams {
  supabase: SupabaseClient | null;
  section: Section;
  count: number;
  /** Clerk userId of the signed-in caller, or null for a guest — gates the
   * server-side `attempts` lookup below. Guests still get client-side dedup
   * via clientKnownSolvedIds, just not the cross-device half. */
  clerkUserId: string | null;
  /** Question ids the client already knows it has solved (its local
   * attempt log) — merged with the server-known set below. Mirrors
   * app/api/generate-question/route.ts's buildExcludeTexts pattern: the
   * client provides what it knows, the server fills in the cross-device
   * gap it alone can see. */
  clientKnownSolvedIds: string[];
}

export interface AllocateExamQuestionsResult {
  questions: Question[];
  /** How many of the returned questions were recycled from ones the
   * student already solved, because the unsolved pool ran out — the exam
   * page uses this to show a "some questions repeat" notice rather than
   * pretending every question is fresh. */
  recycledCount: number;
  /** False when the bank has zero rows for this section at all (not
   * seeded, or Supabase not configured) — distinct from "pool exhausted,
   * had to recycle." The caller falls back to live AI generation in this
   * case instead of treating it as a dedup problem. */
  bankAvailable: boolean;
}

/**
 * Draws up to `count` questions for `section`, preferring ones the student
 * has never solved. Falls back to recycling their *oldest* solved
 * questions only once the unsolved pool for this section is exhausted —
 * per Phase 18's requirement 3, this is the deliberate last resort, not
 * the default.
 */
export async function allocateExamQuestions({
  supabase,
  section,
  count,
  clerkUserId,
  clientKnownSolvedIds,
}: AllocateExamQuestionsParams): Promise<AllocateExamQuestionsResult> {
  if (!supabase) {
    return { questions: [], recycledCount: 0, bankAvailable: false };
  }

  const { data: poolRows, error: poolError } = await supabase
    .from("questions")
    .select("id, section, topic, subtopic, difficulty, body, options, correct_index, explanation, created_at")
    .eq("section", section)
    .limit(POOL_SCAN_LIMIT);

  if (poolError || !poolRows || poolRows.length === 0) {
    return { questions: [], recycledCount: 0, bankAvailable: false };
  }

  const pool = (poolRows as QuestionRow[]).map(rowToQuestion);

  // question_id -> earliest attempt timestamp for this user, so recycling
  // (below) can prefer whatever was solved longest ago.
  const solvedAt = new Map<string, number>();
  for (const id of clientKnownSolvedIds) solvedAt.set(id, 0); // unknown timing — treat as oldest

  if (clerkUserId) {
    const { data: attemptRows } = await supabase
      .from("attempts")
      .select("question_id, created_at")
      .eq("clerk_user_id", clerkUserId);

    for (const row of (attemptRows as { question_id: string; created_at: string }[] | null) ?? []) {
      const ts = new Date(row.created_at).getTime();
      const existing = solvedAt.get(row.question_id);
      if (existing === undefined || ts < existing) solvedAt.set(row.question_id, ts);
    }
  }

  const unsolved = shuffle(pool.filter((q) => !solvedAt.has(q.id)));

  if (unsolved.length >= count) {
    return { questions: unsolved.slice(0, count), recycledCount: 0, bankAvailable: true };
  }

  const needed = count - unsolved.length;
  const solvedPool = pool
    .filter((q) => solvedAt.has(q.id))
    .sort((a, b) => (solvedAt.get(a.id) ?? 0) - (solvedAt.get(b.id) ?? 0));
  const recycled = solvedPool.slice(0, needed);

  return {
    questions: shuffle([...unsolved, ...recycled]),
    recycledCount: recycled.length,
    bankAvailable: true,
  };
}
