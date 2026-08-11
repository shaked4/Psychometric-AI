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
