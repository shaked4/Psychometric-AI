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
  `components/auth/guest-mode-badge.tsx` ("מצב אורח / מקומי") otherwise. Signed-in state shows
  `<UserButton showName />`; signed-out shows `components/auth/google-sign-in-button.tsx`.
- **Google OAuth**: `GoogleSignInButton` is a one-click trigger — `useSignIn().signIn.sso({
  strategy: "oauth_google", redirectCallbackUrl: "/sso-callback", redirectUrl: "/dashboard"
  })` — that bypasses Clerk's full `<SignIn/>` form. This SDK version's `useSignIn()` returns
  the newer Signals-based Future API (`{ signIn, fetchStatus }`, `signIn.sso(...)`), not the
  older `{ isLoaded, signIn }` shape with `signIn.authenticateWithRedirect(...)` — verified
  against the installed `.d.ts` files after `npm run build`'s TypeScript pass caught the
  mismatch against a first draft written from memory. Its redirect completes at
  `app/sso-callback/page.tsx`, which mounts
  `<AuthenticateWithRedirectCallback />`. Dedicated `/sign-in` and `/sign-up` catch-all routes
  (`app/sign-in/[[...sign-in]]`, `app/sign-up/[[...sign-up]]`) render Clerk's full `<SignIn/>`/
  `<SignUp/>` components — these also offer Google (plus any other method enabled in the
  project) and are where `GoogleSignInButton` sends users if the direct redirect itself fails
  to start. All three routes render `components/auth/auth-unavailable.tsx` instead of the
  Clerk component when `CLERK_ENABLED` is false, since navigating to them directly is possible
  even though the NavBar never links there in that state. **Actually enabling Google is a
  one-time step in the Clerk Dashboard** (Configure → SSO Connections) — no amount of code
  here turns it on; this app only calls the standard `oauth_google` strategy Clerk exposes
  once a project has it configured.
- **Localization**: `components/auth/clerk-auth-provider.tsx` passes `localization={heIL}`
  (`@clerk/localizations`) to `<ClerkProvider>`, translating Clerk's own UI text (forms,
  `UserButton` menu) to Hebrew, plus a light `appearance.variables` nudge toward this app's
  near-black primary and Rubik font — deliberately just the documented `variables` API, not
  hand-overridden `elements` selectors, which drift more across Clerk versions.
- **Cloud persistence**: Supabase (`@supabase/supabase-js`), but **never written to (or read
  from) directly from the browser**. All three tables (`attempts`, `exam_history`,
  `question_cache` — `supabase/schema.sql`) have Row Level Security enabled with zero
  policies, making them unreachable via the public anon key under any circumstance. All reads
  and writes go through `app/api/sync/push/route.ts` and `app/api/sync/pull/route.ts`, which
  verify the caller's Clerk session server-side via `auth()` and then use the service-role key
  (`lib/supabase-server.ts`, `SUPABASE_SERVICE_ROLE_KEY`, server-only), which bypasses RLS by
  design. This avoids needing to design and audit RLS policies for the MVP while keeping every
  table fully closed to clients.
- **`question_cache` table**: attempts only store a `question_id`; for AI-generated questions
  (exam mode, custom AI practice) nothing else can resolve that id back to content on a
  *different* device — unlike the static mock bank, which is baked into every build. This
  table is the cloud counterpart of the local `lib/question-cache.ts` cache, storing full
  question content so a synced attempt is actually resolvable (topic stats, spaced-repetition
  queue) wherever it's pulled. Mock-bank questions are never pushed here — every device
  already has them built in.
- **Bidirectional sync (`lib/cloud-sync.ts`, `components/auth/cloud-sync-bridge.tsx`)**:
  mounted once at the root, only when `CLERK_ENABLED`.
  - **Pull** (`pullRemoteData()`): fires once per sign-in. Fetches this user's `attempts`,
    `exam_history`, and `question_cache` rows and merges them into the matching local
    localStorage stores (`mergeRemoteAttempts()`, `mergeRemoteExamHistory()`,
    `cacheQuestions()`) — each merge only adds ids/sessionIds not already present locally.
    This is what restores the dashboard and review queue on a new device, since the
    spaced-repetition queue (`lib/spaced-repetition.ts`) is *derived* from the attempt log
    with no separate store of its own — once attempts are back, the queue is automatically
    correct with no dedicated sync path for it.
  - **Push** (`pushUnsyncedData()`): fires after every pull, and again on every subsequent
    local attempt/exam-history change. Tracks synced ids in three localStorage sets
    (`synced-attempt-ids`, `synced-exam-session-ids`, `synced-question-ids`) and only ever
    sends what's new, including the AI-generated question content those new attempts
    reference. Pulled items are marked synced immediately so they're never pushed straight
    back.
  - The pull-then-push chain in `CloudSyncBridge` is written as an explicit promise chain
    (`pullRemoteData().then(() => pushUnsyncedData(...))`) rather than relying on a second
    effect re-firing off the re-render the merge functions trigger — the latter raced React's
    batching timing in practice.
- **Everything degrades independently**: no Clerk keys → guest mode, fully functional app, no
  sync attempted. Clerk configured but no Supabase keys → sign-in works, pull/push both
  silently no-op (`{ synced: false, reason: "supabase_not_configured" }` /
  `{ pulled: false, reason: "supabase_not_configured" }`). This mirrors the offline-fallback
  pattern used for the Claude API integration above.

## Continuous AI question stream (`/practice/custom`)

- **Retry before mock fallback**: `app/api/generate-questions/route.ts` only falls back to
  the mock bank after `MAX_GENERATION_ATTEMPTS` (2) full attempts at real generation fail — a
  single refusal, parse failure, or transient API error no longer immediately dumps a
  key-holding user into mock content. The response always flags `offline: true` when it *did*
  fall back, which is what the client below reacts to.
- **Streaming UX**: `/practice/custom` no longer serves one fixed batch and returns to the
  config form. `PracticeSession`'s `onFinish` is wired to `handleBatchFinish()`, which
  requests a fresh batch with the same config and feeds it straight back into
  `PracticeSession` (remounted via a batch-numbered `key`) — an unbroken chain of real-time
  Claude API calls for as long as the user keeps going. The moment a batch comes back with
  `offline: true` (mock fallback), the stream deliberately stops auto-continuing after that
  batch — otherwise it would loop the same 4 mock questions indefinitely, which is exactly
  what this feature exists to avoid — and shows a Hebrew notice explaining why.

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
