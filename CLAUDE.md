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
- **Backend/DB/Auth/Storage**: Supabase (Postgres, Auth, Storage)
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
