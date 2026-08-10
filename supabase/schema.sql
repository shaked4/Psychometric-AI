-- Psychometric AI — cloud persistence schema (Phase 8)
--
-- Security model: RLS is enabled with ZERO policies, so this table is
-- unreachable via the public anon key under any circumstance — reads and
-- writes only ever happen through app/api/sync/push/route.ts, a Next.js
-- API route that verifies the caller's Clerk session server-side and then
-- writes using the service-role key (lib/supabase-server.ts), which
-- bypasses RLS entirely. There is deliberately no client-side Supabase
-- write path.
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
  created_at timestamptz not null,
  synced_at timestamptz not null default now()
);

create index if not exists attempts_clerk_user_id_idx on public.attempts (clerk_user_id);

alter table public.attempts enable row level security;
-- No policies defined: every request is denied by default, including ones
-- authenticated with the anon key. Only the service-role key (server-only,
-- see lib/supabase-server.ts) can read or write this table.
