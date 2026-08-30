/**
 * The homepage's "התחילו תרגול יומי קצר" (quick daily practice) CTA serves a
 * short, deliberately cross-section set rather than a single-section batch —
 * this is what makes it "get to know you" across the whole exam, not just
 * whichever section a student happens to click into. Read directly by
 * app/practice/quick/page.tsx, which calls /api/exam/allocate once per
 * section listed here.
 *
 * Scoped to quant/verbal only, matching the Dec 2026 NITE format — English
 * is now assessed exclusively through the separate, explicitly-launched
 * AMIRNET track (/practice/english), the same scoping already applied to
 * /practice/adaptive's question pool. Not a Record<Section, number> for
 * exactly that reason: this type intentionally can't accept an "english"
 * key, so a future edit can't silently reintroduce it here the way it did
 * before this fix.
 */
export const QUICK_PRACTICE_MIX: Record<"quant" | "verbal", number> = { quant: 2, verbal: 2 };

export const QUICK_PRACTICE_TOTAL = Object.values(QUICK_PRACTICE_MIX).reduce((sum, n) => sum + n, 0);
