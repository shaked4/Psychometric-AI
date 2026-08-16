# Psychometric Question Generation Guide

## Scope and provenance

This guide distills **structural and stylistic conventions** of the Israeli
Psychometric Entrance Test (הפסיכומטרי), for use by this app's AI question
generator (`lib/question-generation.ts`, consumed by
`app/api/generate-questions/route.ts`, `app/api/generate-question/route.ts`,
and `scripts/seed-question-bank.ts`).

It was written after reviewing a real, copyrighted NITE (המרכז הארצי לבחינות
ולהערכה) exam a user supplied. That source is **not reproduced here** — no
passage, question body, answer choice, or explanation from it is quoted or
closely paraphrased anywhere below. What follows is:

- **Format facts** that are independently public knowledge about the exam
  (published by NITE itself and every prep-book publisher): section names,
  rough timing/question counts, the increasing-difficulty-within-section
  rule, and the standard formula-reference sheet's contents (ordinary
  mathematical facts, not exam-specific creative content).
- **Abstracted structural/stylistic patterns** — question archetypes,
  difficulty-calibration heuristics, and distractor-design principles —
  described generically rather than tied to any specific real question.
  These are standard standardized-testing design techniques, not unique
  expression belonging to any one exam.
- **Original illustrative examples**, written fresh for this document, in
  the same style/structure as the patterns described. None are drawn from
  the reviewed exam.

If a future contributor wants to deepen this guide by reviewing more real
exams, keep following that same rule: extract the *pattern*, never the
*text*.

## Exam-wide structural facts

- **Timed, per-section format**: each section (Quant, Verbal, English) is
  independently timed at roughly 20 minutes, with a fixed question count per
  section (this app's own `EXAM_QUESTION_COUNTS` in
  `app/exam/[section]/page.tsx` — 20/20/22 — already reflects this).
- **Increasing difficulty within a section**: every section explicitly
  orders its questions from easiest to hardest. This app already implements
  this via `applyDifficultyCurve()` in `lib/exam-fetcher.ts` for bank-drawn
  exams — the AI generator should assign a `difficulty` value consistent
  with that same curve (see "Difficulty calibration" below) rather than
  defaulting everything to one level.
- **A shared reference/formula sheet is available to test-takers during the
  Quant section** — ordinary mathematical facts (not exam-specific
  content), covering: percentages, exponent/root rules, `(a±b)²` and
  difference-of-squares identities, permutations and factorial, the
  Thales/similar-triangles proportionality theorem, the Pythagorean
  theorem and the 30-60-90 special right triangle, rectangle-diagonal via
  Pythagoras, circle circumference/area/sector-area, cylinder volume and
  surface area, cone volume, and trapezoid area. Because test-takers have
  this available, Quant questions can and should assume familiarity with
  these exact formulas and test *application* of them (often in combined,
  multi-step ways) rather than re-deriving basic identities from scratch.
- **A data-interpretation block**: quant sections typically include one
  contiguous block of several questions reasoning over one shared dataset
  (a table, not a chart-image) — this app already models this exactly via
  `Question.groupId`/`groupOrder`/`diagram` and
  `applyDifficultyCurve()`'s DI-band reservation.

## Difficulty calibration

Map difficulty deliberately, not just by "feel":

| Level | Quant | Verbal | English |
|---|---|---|---|
| Easy (2) | 1-2 direct steps, no combined concepts | common connector (because/but), common vocabulary | plain collocation, everyday vocabulary |
| Medium (3) | 2-3 steps, one combined concept (e.g. percent-of-percent) | a reason clause that must be tracked to disambiguate | a less-common but not obscure word; grammar plays a role |
| Hard (4) | multiple combined concepts, or a "must be true given all constraints" style item | a logic puzzle needing full case elimination, or an argument needing an implicit-assumption check | precise, sophisticated vocabulary; or a restatement whose original sentence bundles two relationships |
| Hardest (5) | a fully worked multi-stage word problem (rates/work/mixtures) or coordinate/3D geometry requiring two theorems in sequence | a puzzle with 4+ constraints, or a "weaken/strengthen via confound" critical-reasoning item | a restatement/RC item with a scope or causal-direction subtlety in a single word choice |

## Section-specific patterns

### Quantitative (כמותי)

**Archetypes**: number-property/arithmetic warm-ups; algebra (equations,
sequences, inequalities); geometry (plane and solid, often combining two
formulas); word problems (percentages, rate/work/mixture, motion); one
data-interpretation block over a shared table.

**Distractor principles** (each wrong choice should correspond to one
specific, nameable mistake):
- Right formula, wrong variable slot (e.g. used diameter where radius was needed)
- Off-by-one in an index or count (e.g. counting intervals vs. terms in a sequence)
- Forgot to convert a unit, or reversed a percent-of vs. percent-off base
- Correct partial computation, but stopped one step early (e.g. gave `x` when the question asked for `x²`)
- Applied the right operation to the wrong row/column of a table
- Reversed which quantity is being compared to which (e.g. `A:B` instead of `B:A`)

**Original illustrative example** (not from the reviewed exam):
> A tank is filled by pipe A in 6 hours and drained by pipe B in 10 hours.
> If both are opened together on an empty tank, how long until it's full?
> Choices calibrated to: (correct) combining rates via LCM; (distractor)
> subtracting the times directly (6−... instead of combining rates);
> (distractor) adding the times; (distractor) using only pipe A's rate.

### Verbal (מילולי)

**Archetypes**: word-pair analogies (relation stated explicitly, find the
parallel pair); sentence completion (a logical connector plus a
justifying clause that uniquely determines the answer); critical
reasoning (strengthen/weaken an argument, identify an assumption); logic
puzzles solved by exhaustive case elimination; reading comprehension with
a short original passage.

**Distractor principles**:
- Analogies: the exact relation reversed in order; a superficially similar but structurally different relation; a part-of-speech mismatch
- Sentence completion: a word that fits grammatically but contradicts the clause that justifies the answer; a word matching the wrong half of a contrast
- Critical reasoning: a fact irrelevant to the causal claim; a fact that would strengthen when weakening was asked (or vice versa); an overreaching restatement of the passage
- Reading comprehension: a true supporting detail mistaken for the main idea; an unsupported overgeneralization; a reversal of the passage's actual claim

*(Hebrew-specific phrasing nuance couldn't be reliably extracted from the
reviewed source due to a text-encoding problem in the copy that was
supplied — the hand-authored Hebrew seed content already in this repo,
e.g. `scripts/seed-verbal-questions.ts` and
`scripts/seed-verbal-analogies-sentences-logic.ts`, remains the best
in-repo style reference for tone and phrasing.)*

### English

**Archetypes**: sentence completion (single blank, testing precise
vocabulary/collocation more than complex grammar at easier levels, and
either sophisticated vocabulary or a grammatical construction — a mixed
conditional, a correlative pair — at harder levels); restatement (one
original sentence expressing exactly one relationship — contrast, cause,
concession, scope — four candidate paraphrases where exactly one preserves
it exactly); reading comprehension (a short original passage, alternating
narrative/human-interest register and informational/technical register
across a set, with questions on main idea, a paragraph's purpose,
inference, vocabulary-in-context, and author's tone or purpose).

**Distractor principles**:
- Sentence completion: a word of the right part of speech but wrong connotation/register; a word that would fit a different (unstated) context
- Restatement: reversed cause/effect; a modifier's magnitude changed (e.g. "marginally" → "dramatically"); a concession dropped and stated as unqualified fact; an added claim the original never makes
- Reading comprehension: same four principles as Verbal RC above, applied in English

**Original illustrative example** (not from the reviewed exam):
> Original: "Although the startup's first product failed commercially, its
> underlying technology attracted several acquisition offers."
> Correct restatement preserves both halves (commercial failure *and*
> acquisition interest in the tech) via "despite"/"even though". Distractors:
> one drops the concession and states unqualified success; one reverses
> which half is the cause; one changes "several offers" to "no offers".

## How this feeds the live generator

The condensed version of the above (see `EXAM_STYLE_GUIDELINES` in
`lib/question-generation.ts`) is spliced directly into
`buildSystemPrompt()`, which both `app/api/generate-question/route.ts`
(singular, session-aware) and `app/api/generate-questions/route.ts`
(plural, batch) call — as of this guide, both routes share the same
prompt-building module, so updating it once updates every live AI
generation path (and `scripts/seed-question-bank.ts`, which uses the same
module for offline bulk seeding) without drift between them.
