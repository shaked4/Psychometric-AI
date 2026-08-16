import "server-only";
import type { SupabaseClient } from "@supabase/supabase-js";
import type { DiagramData, Question, Section } from "@/types";

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
 *
 * `group_id`/`group_order`/`diagram_data` (Phase 19, data interpretation
 * blocks) are a later, optional addition to this same hand-created table —
 * see supabase/schema.sql for the ALTER TABLE migration. They're queried
 * defensively below (BASE_COLUMNS vs EXTENDED_COLUMNS) so allocation still
 * works before that migration has been run, same "everything degrades
 * independently" philosophy as the rest of this app.
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
  group_id?: string | null;
  group_order?: number | null;
  diagram_data?: DiagramData | null;
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
    groupId: row.group_id ?? null,
    groupOrder: row.group_order ?? null,
    diagram: row.diagram_data ?? null,
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

const BASE_COLUMNS = "id, section, topic, subtopic, difficulty, body, options, correct_index, explanation, created_at";
const EXTENDED_COLUMNS = `${BASE_COLUMNS}, group_id, group_order, diagram_data`;

/** Postgres "column does not exist" — distinct from a real query failure,
 * meaning the group_id/group_order/diagram_data migration
 * (supabase/schema.sql) hasn't been run against this database yet. */
const UNDEFINED_COLUMN = "42703";

/**
 * A block of questions sharing one data-interpretation diagram must land in
 * the exam contiguously and in their authored order (group_order) — mixing
 * or splitting them would leave a question referencing "the table above"
 * with nothing above it. Below is where that block is carved out of the
 * pool before the remaining difficulty-curve ordering runs.
 */
const DI_BAND_FRACTION = 0.2;
const EASY_FRACTION_OF_REST = 0.25;
const HARD_FRACTION_OF_REST = 0.25;
// A 4-question diagram block eating a fixed chunk of a very short exam would
// dominate it disproportionately — below this many total questions, skip the
// data-interpretation band entirely and just apply the plain difficulty curve.
const MIN_COUNT_FOR_DI_BAND = 10;

/**
 * Reserves one contiguous data-interpretation group *before* the random
 * count-limited draw below runs — picking a group afterward (from an
 * already-count-trimmed, randomly shuffled selection) would only include it
 * by chance, and could easily include 1-3 of its 4 questions instead of the
 * whole block. Prefers a group with the fewest already-solved members
 * (ideally none), so reserving it doesn't need to eat into the recycle
 * budget unless every candidate group has some solved questions in it.
 */
function pickDiBlock(pool: Question[], solvedAt: Map<string, number>, budget: number): Question[] {
  if (budget <= 0) return [];

  const groups = new Map<string, Question[]>();
  for (const q of pool) {
    if (!q.groupId) continue;
    const arr = groups.get(q.groupId) ?? [];
    arr.push(q);
    groups.set(q.groupId, arr);
  }

  const candidates = shuffle([...groups.values()]).sort(
    (a, b) => a.filter((q) => solvedAt.has(q.id)).length - b.filter((q) => solvedAt.has(q.id)).length
  );

  const block: Question[] = [];
  for (const group of candidates) {
    if (group.length > 0 && block.length + group.length <= budget) {
      block.push(...[...group].sort((a, b) => (a.groupOrder ?? 0) - (b.groupOrder ?? 0)));
    }
  }
  return block;
}

/**
 * Orders an already-selected set of exam questions into a difficulty curve:
 * an easy warm-up band, a medium band, one contiguous data-interpretation
 * block (if the pool has a complete group that fits the budget), then a hard
 * band — e.g. for a 20-question exam this lands at questions 1–4 easy, 5–12
 * medium, 13–16 data interpretation, 17–20 hard. Every fraction is relative
 * to the actual selected count, so it degrades gracefully for shorter exams
 * (recycling shortfalls) or sections with no seeded diagram groups (verbal,
 * english) — the DI block is simply empty and its budget folds back into the
 * plain curve.
 */
function applyDifficultyCurve(selected: Question[]): Question[] {
  const groups = new Map<string, Question[]>();
  const ungrouped: Question[] = [];
  for (const q of selected) {
    if (q.groupId) {
      const arr = groups.get(q.groupId) ?? [];
      arr.push(q);
      groups.set(q.groupId, arr);
    } else {
      ungrouped.push(q);
    }
  }

  const diBudget = selected.length >= MIN_COUNT_FOR_DI_BAND ? Math.round(selected.length * DI_BAND_FRACTION) : 0;
  const diBlock: Question[] = [];
  if (diBudget > 0) {
    for (const group of shuffle([...groups.values()])) {
      if (group.length > 0 && diBlock.length + group.length <= diBudget) {
        diBlock.push(...[...group].sort((a, b) => (a.groupOrder ?? 0) - (b.groupOrder ?? 0)));
      }
    }
  }

  // Grouped questions that weren't picked for the DI block still stand on
  // their own (each row carries its own copy of `diagram`), so they simply
  // rejoin the regular pool rather than being dropped.
  const usedIds = new Set(diBlock.map((q) => q.id));
  const rest = shuffle([...ungrouped, ...selected.filter((q) => q.groupId && !usedIds.has(q.id))]).sort(
    (a, b) => a.difficulty - b.difficulty
  );

  const easyN = Math.round(rest.length * EASY_FRACTION_OF_REST);
  const hardN = Math.round(rest.length * HARD_FRACTION_OF_REST);
  const easyBand = rest.slice(0, easyN);
  const hardBand = rest.slice(rest.length - hardN);
  const mediumBand = rest.slice(easyN, rest.length - hardN);

  return [...easyBand, ...mediumBand, ...diBlock, ...hardBand];
}

export interface AllocateExamQuestionsParams {
  supabase: SupabaseClient | null;
  section: Section;
  count: number;
  /** Restricts the pool to one topic within the section (e.g. the
   * study-sidebar's `?topic=` filter on /practice/[section]) — omitted for
   * exam mode and quick practice, which draw from the whole section. */
  topic?: string;
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
 * has never solved. Once the unsolved pool for this section is exhausted,
 * falls back to recycling solved ones in two further tiers, oldest-first
 * within each: first questions they've never gotten *right* (still
 * genuinely unmastered — re-serving these is useful, not just filler),
 * and only once that's exhausted too, questions they've already answered
 * correctly at least once (a full pool reset). Per Phase 18's requirement
 * 3, recycling at all is the deliberate last resort, not the default.
 */
export async function allocateExamQuestions({
  supabase,
  section,
  count,
  topic,
  clerkUserId,
  clientKnownSolvedIds,
}: AllocateExamQuestionsParams): Promise<AllocateExamQuestionsResult> {
  if (!supabase) {
    return { questions: [], recycledCount: 0, bankAvailable: false };
  }

  let extendedQuery = supabase.from("questions").select(EXTENDED_COLUMNS).eq("section", section);
  if (topic) extendedQuery = extendedQuery.eq("topic", topic);
  const extendedResult = await extendedQuery.limit(POOL_SCAN_LIMIT);
  let poolRows = extendedResult.data as QuestionRow[] | null;
  let poolError = extendedResult.error;

  if (poolError?.code === UNDEFINED_COLUMN) {
    // The group_id/group_order/diagram_data migration hasn't run yet on
    // this database — fall back to the columns that definitely exist so
    // allocation (and therefore every exam) still works. Data-interpretation
    // grouping just won't be available until the migration runs.
    let baseQuery = supabase.from("questions").select(BASE_COLUMNS).eq("section", section);
    if (topic) baseQuery = baseQuery.eq("topic", topic);
    const baseResult = await baseQuery.limit(POOL_SCAN_LIMIT);
    poolRows = baseResult.data as QuestionRow[] | null;
    poolError = baseResult.error;
  }

  if (poolError || !poolRows || poolRows.length === 0) {
    return { questions: [], recycledCount: 0, bankAvailable: false };
  }

  const pool = (poolRows as QuestionRow[]).map(rowToQuestion);

  // question_id -> earliest attempt timestamp for this user, so recycling
  // (below) can prefer whatever was solved longest ago. A second map tracks
  // whether the student has *ever* gotten each question right, so recycling
  // can prefer still-unmastered questions over ones already answered
  // correctly at least once.
  const solvedAt = new Map<string, number>();
  const everCorrect = new Map<string, boolean>();
  for (const id of clientKnownSolvedIds) solvedAt.set(id, 0); // unknown timing — treat as oldest
  // clientKnownSolvedIds carries no correctness signal (it's just the
  // caller's local id list) — left unset in everCorrect, which the recycle
  // split below treats as "not known to be correct", i.e. the same tier as
  // a genuine wrong answer. Only affects guests/not-yet-synced ids; the
  // clerkUserId query below is authoritative wherever it applies.

  if (clerkUserId) {
    const { data: attemptRows } = await supabase
      .from("attempts")
      .select("question_id, created_at, is_correct")
      .eq("clerk_user_id", clerkUserId);

    for (const row of (attemptRows as { question_id: string; created_at: string; is_correct: boolean }[] | null) ??
      []) {
      const ts = new Date(row.created_at).getTime();
      const existing = solvedAt.get(row.question_id);
      if (existing === undefined || ts < existing) solvedAt.set(row.question_id, ts);
      if (row.is_correct) everCorrect.set(row.question_id, true);
    }
  }

  const diBudget = count >= MIN_COUNT_FOR_DI_BAND ? Math.round(count * DI_BAND_FRACTION) : 0;
  const reserved = pickDiBlock(pool, solvedAt, diBudget);
  const reservedIds = new Set(reserved.map((q) => q.id));
  const remainingCount = count - reserved.length;

  const unsolvedRest = shuffle(pool.filter((q) => !solvedAt.has(q.id) && !reservedIds.has(q.id)));

  let others: Question[];
  let recycledFromOthers: number;
  if (unsolvedRest.length >= remainingCount) {
    others = unsolvedRest.slice(0, remainingCount);
    recycledFromOthers = 0;
  } else {
    const needed = remainingCount - unsolvedRest.length;
    const solvedRest = pool.filter((q) => solvedAt.has(q.id) && !reservedIds.has(q.id));
    const byOldest = (a: Question, b: Question) => (solvedAt.get(a.id) ?? 0) - (solvedAt.get(b.id) ?? 0);
    // Tier 1 of the recycle fallback: still-unmastered questions (never
    // answered correctly). Tier 2, only reached once tier 1 also runs out:
    // questions already gotten right at least once — a full pool reset.
    const neverCorrectPool = solvedRest.filter((q) => everCorrect.get(q.id) !== true).sort(byOldest);
    const alreadyCorrectPool = solvedRest.filter((q) => everCorrect.get(q.id) === true).sort(byOldest);
    const solvedRestPool = [...neverCorrectPool, ...alreadyCorrectPool].slice(0, needed);
    others = [...unsolvedRest, ...solvedRestPool];
    recycledFromOthers = solvedRestPool.length;
  }

  const recycledCount = recycledFromOthers + reserved.filter((q) => solvedAt.has(q.id)).length;
  const selected = [...reserved, ...others];

  return {
    questions: applyDifficultyCurve(selected),
    recycledCount,
    bankAvailable: true,
  };
}
