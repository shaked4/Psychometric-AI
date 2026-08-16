import type { Section } from "@/types";

/**
 * The homepage's "התחילו תרגול יומי קצר" (quick daily practice) CTA serves a
 * short, deliberately cross-section set rather than a single-section batch —
 * this is what makes it "get to know you" across the whole exam, not just
 * whichever section a student happens to click into. Shared between
 * app/api/practice/quick/route.ts (draws it) and app/practice/quick/page.tsx
 * (displays the mix) so the two can't drift apart.
 */
export const QUICK_PRACTICE_MIX: Record<Section, number> = { quant: 2, verbal: 2, english: 1 };

export const QUICK_PRACTICE_TOTAL = Object.values(QUICK_PRACTICE_MIX).reduce((sum, n) => sum + n, 0);
