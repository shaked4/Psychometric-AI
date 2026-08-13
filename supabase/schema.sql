-- Psychometric AI — cloud persistence schema (Phase 8, extended Phase 11)
--
-- Security model: RLS is enabled with ZERO policies on every table, so none
-- of them are reachable via the public anon key under any circumstance —
-- reads and writes only ever happen through app/api/sync/push/route.ts and
-- app/api/sync/pull/route.ts, Next.js API routes that verify the caller's
-- Clerk session server-side and then read/write using the service-role key
-- (lib/supabase-server.ts), which bypasses RLS entirely. There is
-- deliberately no client-side Supabase read or write path.
--
-- `clerk_user_id` stores Clerk's userId directly rather than joining to a
-- separate Supabase auth.users row, since auth is fully owned by Clerk here.

create table if not exists public.attempts (
  id uuid primary key,
  clerk_user_id text not null,
  session_id uuid not null,
  question_id text not null,
  chosen_answer integer not null,
  is_correct boolean not null,
  time_taken_seconds integer not null,
  self_reported_error text,
  flagged boolean not null default false,
  created_at timestamptz not null,
  synced_at timestamptz not null default now()
);

create index if not exists attempts_clerk_user_id_idx on public.attempts (clerk_user_id);

alter table public.attempts enable row level security;

-- One row per completed exam simulation — permanent and lightweight
-- (score, section, timestamp), unlike the ephemeral per-question exam
-- result kept client-side in sessionStorage (see lib/exam-result.ts). Feeds
-- the dashboard's score-progression chart across devices.
create table if not exists public.exam_history (
  session_id uuid primary key,
  clerk_user_id text not null,
  section text not null,
  score integer not null,
  accuracy_pct integer not null,
  total_time_seconds integer not null,
  question_count integer not null,
  completed_at timestamptz not null,
  synced_at timestamptz not null default now()
);

create index if not exists exam_history_clerk_user_id_idx on public.exam_history (clerk_user_id);

alter table public.exam_history enable row level security;

-- Full content of every AI-generated question (exam mode, custom AI
-- practice) a user has ever attempted, mirroring the local
-- lib/question-cache.ts localStorage cache. Needed because attempts only
-- store a question_id — without this, attempts synced from another device
-- would reference questions with no content to resolve them against
-- (topic stats and the spaced-repetition queue would silently drop them,
-- exactly the bug lib/question-cache.ts fixed for the single-device case).
-- Static mock-bank questions are never written here since every device
-- already has them built in (see lib/mock-data.ts).
create table if not exists public.question_cache (
  id text primary key,
  clerk_user_id text not null,
  section text not null,
  topic text not null,
  subtopic text not null,
  difficulty integer not null,
  type text not null,
  body text not null,
  passage text,
  choices jsonb not null,
  correct_answer integer not null,
  explanation text not null,
  media text,
  created_at timestamptz not null,
  synced_at timestamptz not null default now()
);

create index if not exists question_cache_clerk_user_id_idx on public.question_cache (clerk_user_id);

alter table public.question_cache enable row level security;

-- One row per completed and evaluated essay (מטלת כתיבה, Phase 16). Stores
-- the full essay text and the full evaluation (scores, feedback, sentence
-- suggestions) rather than just a score, since — unlike MCQ attempts —
-- there is no compact question bank to re-resolve this content against on
-- another device; the row itself is the only record of what was written.
create table if not exists public.essay_attempts (
  id uuid primary key,
  clerk_user_id text not null,
  prompt_id text not null,
  prompt_title text not null,
  essay_text text not null,
  word_count integer not null,
  time_taken_seconds integer not null,
  content_score integer not null,
  language_score integer not null,
  estimated_psychometric_score integer not null,
  strengths jsonb not null,
  improvements jsonb not null,
  reminiscent_examples jsonb not null,
  offline boolean not null default false,
  created_at timestamptz not null,
  synced_at timestamptz not null default now()
);

create index if not exists essay_attempts_clerk_user_id_idx on public.essay_attempts (clerk_user_id);

alter table public.essay_attempts enable row level security;

-- Shared, pre-generated exam question bank (Phase 18) — populated by
-- scripts/seed-question-bank.ts / scripts/seed-hardcoded-questions.ts, read
-- by app/api/exam/allocate/route.ts (lib/exam-fetcher.ts). Unlike
-- `question_cache` above (which stores, per user, the AI questions *that
-- specific user* was already served, purely so their own attempts stay
-- resolvable across devices), this table is one global pool every
-- signed-in user draws non-overlapping exam sets from — there is no
-- clerk_user_id column here on purpose, since the content isn't scoped to
-- any one student. Deduping "have I already solved this one" still happens
-- per-user, but against `attempts`, not against this table.
--
-- Column names/set below match what's actually deployed, not the original
-- Phase 18 design: this table was first hand-created via the Supabase
-- Table Editor before this migration existed, using `options`/
-- `correct_index` instead of `choices`/`correct_answer`, and without
-- `type`/`passage`/`media` at all. Rather than fight that with more ALTERs,
-- lib/exam-fetcher.ts and both seed scripts were adapted to match reality —
-- every row is treated as a plain MCQ, with any reading-comprehension
-- passage folded into `body` at write time since there's no separate
-- column for it. If real passage support is ever wanted, add a `passage
-- text` column and update all three of those files together.
create table if not exists public.questions (
  id uuid primary key,
  section text not null,
  topic text not null,
  subtopic text not null,
  difficulty integer not null,
  body text not null,
  options jsonb not null,
  correct_index integer not null,
  explanation text not null,
  created_at timestamptz not null default now()
);

-- The allocation engine's core query is "give me N unused rows for this
-- section" — a composite index matches that access pattern directly, rather
-- than relying on the primary key alone.
create index if not exists questions_section_topic_idx on public.questions (section, topic);

alter table public.questions enable row level security;

-- No policies defined on any table above: every request is denied by
-- default, including ones authenticated with the anon key. Only the
-- service-role key (server-only, see lib/supabase-server.ts) can read or
-- write these tables. `questions` is no exception even though its content
-- isn't user-specific — the seed script and the allocation route are both
-- server-side, so the client never needs direct access.
