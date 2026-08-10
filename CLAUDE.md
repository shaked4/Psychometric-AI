# Psychometric AI

A modern, AI-native web platform to help students prepare for the Israeli Psychometric
Entrance Test (הפסיכומטרי). Unlike a traditional question bank, the product acts as a
personal psychometric coach: it tracks a student's practice history, builds a data-backed
learner profile (strengths, weaknesses, recurring error patterns), and uses that profile to
recommend what to practice next.

## Product loop

```
Practice → Answer → Analyze performance → Understand weaknesses → Personalized practice → Improve → Repeat
```

The system covers three exam sections: **Quantitative**, **Verbal** (Hebrew), and **English**.

## Architecture principle: stats layer vs. narrative layer

This is the most important architectural rule in the codebase.

- **Stats layer (source of truth)**: deterministic, computed from `attempts` data — accuracy
  per topic/subtopic, average time per topic, timed vs. untimed performance deltas,
  self-reported error reasons. Lives in SQL/application code. This is what is actually true
  about a student.
- **Narrative layer (communication only)**: the Claude API turns stats-layer output into
  natural language (learner profile summaries, tutor chat responses). It never invents
  performance claims — it is always grounded in stats-layer data passed into its context.

Never let the LLM be the source of truth for what a student is good or bad at. It explains
and converses; the stats layer decides.

## Tech stack

- **Framework**: Next.js (App Router), TypeScript
- **Styling**: Tailwind CSS, using **logical CSS properties** (`ps-*`, `pe-*`, `ms-*`, `me-*`,
  `text-start`, `text-end`, `rounded-s-*`, etc.) instead of physical left/right utilities,
  so layouts flip correctly between RTL (Hebrew) and LTR (English/math content)
- **UI components**: shadcn/ui
- **Math rendering**: KaTeX via `react-katex`
- **Auth**: Clerk (`@clerk/nextjs`)
- **Backend/DB/Storage**: Supabase (Postgres, Storage) — see "Auth & cloud sync architecture"
  below for why Supabase Auth itself isn't used
- **AI**: Claude API (Anthropic) — tutor chat and learner-profile narrative generation
- **Hosting**: Vercel

## Data model (MVP)

- **Users** — id, email, display name, target exam date, created_at
- **Questions** — id, section (`quant` | `verbal` | `english`), topic, subtopic, difficulty,
  type (`mcq` | `mcq_with_passage`), body, passage (nullable), choices, correct_answer,
  explanation, media (nullable), created_at
- **Sessions** — id, user_id, section, mode (`timed` | `untimed`), started_at, ended_at
- **Attempts** — id, session_id, user_id, question_id, chosen_answer, is_correct,
  time_taken_seconds, self_reported_error (`careless` | `didnt_know` | `ran_out_of_time` |
  null), created_at
- **LearnerProfile** — id, user_id, per-topic aggregated stats (accuracy, avg time, timed
  vs. untimed delta), latest AI-generated narrative summary, updated_at (recomputed
  asynchronously after each session, not on every request)

Future (post-MVP): Simulations, StudyPlans, TutorChatHistory, RecommendationLog.

## Spaced repetition & analytics (Phase 9)

- **Question cache (`lib/question-cache.ts`)**: AI-generated questions (exam mode,
  `/practice/custom`) only ever existed in the fetching component's memory — nothing else
  could resolve their id back to a `Question` afterward, so their attempts silently dropped
  out of topic stats. Every generated batch is now cached in localStorage keyed by id, and
  `getQuestion()` in `lib/stats.ts` falls back to it after the static mock bank. Simulates
  what a real backend's `questions` table would do (persist generated content permanently);
  this is the local-only stand-in for that.
- **Spaced repetition (`lib/spaced-repetition.ts`)**: like the stats layer, the review
  schedule is *derived*, not stored — `computeReviewQueue(attempts)` replays each question's
  attempts chronologically. A wrong answer or a flagged attempt (`Attempt.flagged`, currently
  only set by exam mode) resets it to the first interval; a correct, unflagged answer while
  already in the queue advances it (1 day → 3 days → 7 days), and clearing the last interval
  graduates the question out entirely. No second mutable store to drift from what actually
  happened — recording a normal attempt via the shared `PracticeSession` engine during a
  review session is enough to reschedule it, with zero review-specific write path.
- **`/practice/review`** ("חזרה מרווחת") surfaces `computeReviewQueue(attempts).dueToday`,
  resolved back to full `Question` objects via `getQuestion()`, and reuses `PracticeSession`
  unchanged — mixed-section review works because `QuestionCard` already picks RTL/LTR
  per-question rather than per-session.
- **Exam history (`lib/exam-history.ts`)**: a small permanent localStorage log (score,
  accuracy, section, timestamp) separate from the ephemeral, single-exam `ExamResultPayload`
  in `lib/exam-result.ts` (sessionStorage, full per-question detail, overwritten every exam) —
  needed because the dashboard's score-progression chart needs every past exam, not just the
  last one.
- **Readiness Index (`lib/readiness.ts`)**: a single deterministic 0-100 number — accuracy
  (40%), pace vs. the exam's own 60s/question target (20%), practice-day streak capped at 7
  days (15%), and spaced-repetition "review mastery" — the fraction of ever-wrong/flagged
  questions since graduated out of the queue (25%). Never an LLM guess, same stats-layer
  principle as everything else here.

## AI tutor integration

`app/api/tutor/route.ts` is the single grounding point for all Claude calls (used by both
the "הסבר בדרך אחרת" button and the tutor chat drawer). Every request is grounded with the
full question context (body, choices, correct answer, official explanation, the student's
chosen answer, and self-reported error reason) via the system prompt — the model never
answers from a bare question with no context.

- **Model**: `claude-sonnet-5`. If asked to change models, check `shared/models.md`-style
  guidance rather than assuming an older name still resolves — retired model IDs 404.
- **Offline/no-key fallback**: if `ANTHROPIC_API_KEY` is unset (see `.env.local.example`) or
  the API call fails for any reason, the route returns a static Hebrew fallback message
  instead of erroring, so the practice flow never breaks because of the AI layer.

## Auth & cloud sync architecture

- **Auth**: Clerk (`@clerk/nextjs`). `middleware.ts` only calls `clerkMiddleware()` when both
  `NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY` and `CLERK_SECRET_KEY` are set; otherwise it's a plain
  passthrough. `components/auth/clerk-auth-provider.tsx` mirrors this at the React level: it
  only mounts `<ClerkProvider>` when `NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY` is present
  (`lib/config.ts`'s `CLERK_ENABLED`), so `useAuth()`-based components are never rendered
  inside a Clerk context that doesn't exist.
- **NavBar auth UI**: this Clerk version does not export `<SignedIn>`/`<SignedOut>` — the
  signed-in/out split is done manually via `useAuth()` in
  `components/auth/clerk-auth-section.tsx` (rendered when `CLERK_ENABLED`), falling back to
  `components/auth/guest-mode-badge.tsx` ("מצב אורח / מקומי") otherwise.
- **Cloud persistence**: Supabase (`@supabase/supabase-js`), but **never written to directly
  from the browser**. The `attempts` table (`supabase/schema.sql`) has Row Level Security
  enabled with zero policies, making it unreachable via the public anon key under any
  circumstance. All writes go through `app/api/sync/push/route.ts`, which verifies the
  caller's Clerk session server-side via `auth()` and then writes using the service-role key
  (`lib/supabase-server.ts`, `SUPABASE_SERVICE_ROLE_KEY`, server-only), which bypasses RLS by
  design. This avoids needing to design and audit RLS policies for the MVP while keeping the
  table fully closed to clients.
- **Sync mechanism**: `components/auth/cloud-sync-bridge.tsx` is mounted once at the root
  (only when `CLERK_ENABLED`) and watches `useAuth()` + `useAttempts()`. Whenever the attempt
  log changes or sign-in state flips to true, it calls `lib/cloud-sync.ts`'s
  `syncUnsyncedAttempts()`, which pushes any attempt ID not yet recorded in a local
  `synced-attempt-ids` localStorage set. This single mechanism covers both ongoing sync of new
  attempts and the one-time login migration: a freshly signed-in browser has an empty
  synced-ids set, so every attempt accumulated while offline gets pushed on first login.
- **Everything degrades independently**: no Clerk keys → guest mode, fully functional app, no
  sync attempted. Clerk configured but no Supabase keys → sign-in works, sync silently no-ops
  (`{ synced: false, reason: "supabase_not_configured" }`). This mirrors the offline-fallback
  pattern used for the Claude API integration above.

## Coding rules

- **RTL-first**: the app defaults to `dir="rtl"` and `lang="he"`. Build and test layouts in
  RTL first; do not hardcode `left`/`right` — always use logical properties so the layout
  is correct by construction.
- **LTR wrapping**: English-section content and math/numeric expressions (KaTeX output,
  English passages, English answer choices) must be wrapped in an explicit `dir="ltr"`
  container so they render correctly inside an RTL page.
- **Hebrew typography**: use a modern Hebrew-supporting webfont (Rubik or Heebo) as the
  primary UI font, loaded via `next/font/google`. Do not fall back to a font without proper
  Hebrew glyph support.
- **No hardcoded performance claims**: any text describing a student's strengths/weaknesses
  must be derived from stats-layer data, never fabricated or inferred ad hoc by prompting an
  LLM without grounding data.
- Keep the question-rendering engine generic across sections (a question may or may not have
  a passage) rather than building section-specific UI — this is what lets Quant, Verbal, and
  English share one practice engine.

## Notes for AI agents

`AGENTS.md` in this repo is auto-managed by Next.js tooling (`next dev`/`next build`) and
contains version-specific Next.js guidance — consult it too, but do not hand-edit its
managed block.
