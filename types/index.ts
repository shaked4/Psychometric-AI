export type Section = "quant" | "verbal" | "english";

export type QuestionType = "mcq" | "mcq_with_passage";

export type SessionMode = "timed" | "untimed";

/** Root-cause tag a student assigns to a mistake — either inline right
 * after answering (components/practice/feedback-panel.tsx) or later during
 * a deep post-mortem review (app/(main)/post-mortem/page.tsx). See
 * lib/stats.ts's ERROR_REASON_LABELS for the Hebrew labels. */
export type SelfReportedError =
  | "misread_question"
  | "calculation_error"
  | "time_pressure"
  | "knowledge_gap"
  | "guessed";

/**
 * A structured dataset a "data interpretation" (הסקת מתרשים) question block
 * refers to — a plain table (row/column headers + values), not an image, so
 * it renders natively via components/practice/data-interpretation-table.tsx
 * with no risk of misreading a rasterized chart. `union type` on purpose:
 * this is meant to grow (e.g. a `"bar-chart"` variant) without touching
 * every existing consumer of DiagramData.
 */
export interface DataTableDiagram {
  type: "table";
  title: string;
  /** Column headers, in display order (row-label column not included). */
  columns: string[];
  rows: { label: string; values: (string | number)[] }[];
  /** Optional short note explaining how to read a cell, shown under the table. */
  legend?: string;
}

export type DiagramData = DataTableDiagram;

export interface Question {
  id: string;
  section: Section;
  topic: string;
  subtopic: string;
  difficulty: number;
  type: QuestionType;
  body: string;
  passage: string | null;
  choices: string[];
  correctAnswer: number;
  explanation: string;
  media: string | null;
  createdAt: string;
  /** Set only for "data interpretation" question blocks (lib/exam-fetcher.ts's
   * difficulty-curve ordering, scripts/seed-quant-data-interpretation.ts) —
   * every question sharing the same groupId refers to the same `diagram`
   * (denormalized onto each row, not a separate table, since the bank has no
   * join target for it — see supabase/schema.sql). Absent/undefined on every
   * question produced before this feature (mock bank, AI generation), same
   * optional-field backward-compat pattern as Attempt.flagged. */
  groupId?: string | null;
  /** Position within its group (0-based) — how the shared block of questions
   * should be ordered/numbered relative to each other, independent of the
   * overall exam's difficulty-curve ordering. */
  groupOrder?: number | null;
  diagram?: DiagramData | null;
}

export interface PracticeSession {
  id: string;
  userId: string;
  section: Section;
  mode: SessionMode;
  startedAt: string;
  endedAt: string | null;
}

export interface Attempt {
  id: string;
  sessionId: string;
  userId: string;
  questionId: string;
  chosenAnswer: number;
  isCorrect: boolean;
  timeTakenSeconds: number;
  selfReportedError: SelfReportedError | null;
  /** Set when the question was flagged for follow-up (currently only exam
   * mode has a flagging UI). Feeds the spaced-repetition queue in
   * lib/spaced-repetition.ts alongside wrong answers. Absent on attempts
   * recorded before Phase 9, which is why every read treats it as `!== true`
   * rather than assuming the field exists. */
  flagged?: boolean;
  createdAt: string;
}

export interface TopicStats {
  topic: string;
  subtopic: string;
  accuracy: number;
  avgTimeSeconds: number;
  timedVsUntimedDelta: number | null;
  attemptCount: number;
}

export interface LearnerProfile {
  id: string;
  userId: string;
  topicStats: TopicStats[];
  narrativeSummary: string | null;
  updatedAt: string;
}

export interface User {
  id: string;
  email: string;
  displayName: string;
  targetExamDate: string | null;
  createdAt: string;
}
