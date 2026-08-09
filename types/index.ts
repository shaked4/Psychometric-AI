export type Section = "quant" | "verbal" | "english";

export type QuestionType = "mcq" | "mcq_with_passage";

export type SessionMode = "timed" | "untimed";

export type SelfReportedError = "careless" | "didnt_know" | "ran_out_of_time";

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
