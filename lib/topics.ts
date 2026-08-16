import type { Section } from "@/types";

/**
 * The canonical practice topic tree — the fixed set of categories a student
 * should see in the study sidebar (components/practice/study-sidebar.tsx)
 * and be able to drill into via /practice/[section]?topic=. Deliberately a
 * static, curated list rather than something derived from whatever topic
 * strings happen to exist in the seeded Supabase `questions` bank: the bank
 * accumulated overlapping/fragmented topic names across several seed
 * scripts over time (e.g. quant's "אחוזים"/"יחס ופרופורציה"/"בעיות תנועה
 * ועבודה" were three separate topics that are really all "word problems";
 * verbal's "חשיבה לוגית" and "הבנה והסקה לוגית" were two names for the same
 * critical-reasoning category) — showing that raw list in the sidebar is
 * exactly the "lacks depth, feels fragmented" problem this fixes.
 *
 * scripts/migrate-consolidate-topics.ts retags existing rows in Supabase
 * onto these exact topic strings so a click in the sidebar actually surfaces
 * everything that belongs to it, not just whatever happened to be seeded
 * under that literal string. Topics seeded under a name outside this list
 * (e.g. quant's "הסתברות וקומבינטוריקה"/"קריפטואריתמטיקה", English's
 * "Vocabulary") are deliberately left alone rather than force-fitted into a
 * category they don't belong in — they simply aren't their own sidebar
 * entry, though their questions still count toward whole-section pools
 * (exam mode, quick practice, and /practice/[section] with no ?topic=).
 */
export const PRACTICE_TOPIC_TREE: Record<Section, string[]> = {
  quant: ["אלגברה", "גיאומטריה", "בעיות מילוליות", "הסקת מתרשים"],
  verbal: ["אנלוגיות", "השלמת משפטים", "הבנה והסקה לוגית", "הבנת הנקרא"],
  english: ["Sentence Completion", "Restatement", "Reading Comprehension"],
};
