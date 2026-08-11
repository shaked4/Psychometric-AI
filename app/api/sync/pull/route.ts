import { NextResponse } from "next/server";
import { auth } from "@clerk/nextjs/server";
import { getSupabaseServerClient } from "@/lib/supabase-server";
import type { Attempt, Question } from "@/types";
import type { ExamHistoryEntry } from "@/lib/exam-history";

/** Fetches everything this Clerk user has ever synced — attempts, exam
 * history, and the AI-generated question content those attempts reference
 * (see supabase/schema.sql) — so a new device can fully restore the
 * dashboard and spaced-repetition review queue. Called once per sign-in by
 * lib/cloud-sync.ts's pullRemoteData(). */
export async function GET() {
  let userId: string | null;
  try {
    ({ userId } = await auth());
  } catch {
    return NextResponse.json({ pulled: false, reason: "clerk_not_configured" });
  }

  if (!userId) {
    return NextResponse.json({ pulled: false, reason: "unauthenticated" }, { status: 401 });
  }

  const supabase = getSupabaseServerClient();
  if (!supabase) {
    return NextResponse.json({ pulled: false, reason: "supabase_not_configured" });
  }

  const [attemptsRes, examHistoryRes, questionsRes] = await Promise.all([
    supabase.from("attempts").select("*").eq("clerk_user_id", userId),
    supabase.from("exam_history").select("*").eq("clerk_user_id", userId),
    supabase.from("question_cache").select("*").eq("clerk_user_id", userId),
  ]);

  if (attemptsRes.error || examHistoryRes.error || questionsRes.error) {
    return NextResponse.json({ pulled: false, reason: "supabase_error" }, { status: 500 });
  }

  const attempts: Attempt[] = (attemptsRes.data ?? []).map((r) => ({
    id: r.id as string,
    sessionId: r.session_id as string,
    userId: r.clerk_user_id as string,
    questionId: r.question_id as string,
    chosenAnswer: r.chosen_answer as number,
    isCorrect: r.is_correct as boolean,
    timeTakenSeconds: r.time_taken_seconds as number,
    selfReportedError: r.self_reported_error as Attempt["selfReportedError"],
    flagged: r.flagged === true,
    createdAt: r.created_at as string,
  }));

  const examHistory: ExamHistoryEntry[] = (examHistoryRes.data ?? []).map((r) => ({
    sessionId: r.session_id as string,
    section: r.section as ExamHistoryEntry["section"],
    score: r.score as number,
    accuracyPct: r.accuracy_pct as number,
    totalTimeSeconds: r.total_time_seconds as number,
    questionCount: r.question_count as number,
    completedAt: r.completed_at as string,
  }));

  const questions: Question[] = (questionsRes.data ?? []).map((r) => ({
    id: r.id as string,
    section: r.section as Question["section"],
    topic: r.topic as string,
    subtopic: r.subtopic as string,
    difficulty: r.difficulty as number,
    type: r.type as Question["type"],
    body: r.body as string,
    passage: r.passage as string | null,
    choices: r.choices as string[],
    correctAnswer: r.correct_answer as number,
    explanation: r.explanation as string,
    media: r.media as string | null,
    createdAt: r.created_at as string,
  }));

  return NextResponse.json({ pulled: true, attempts, examHistory, questions });
}
