import { NextResponse } from "next/server";
import { auth } from "@clerk/nextjs/server";
import { getSupabaseServerClient } from "@/lib/supabase-server";
import type { Attempt, Question } from "@/types";
import type { ExamHistoryEntry } from "@/lib/exam-history";

interface PushBody {
  attempts?: Attempt[];
  examHistory?: ExamHistoryEntry[];
  questions?: Question[];
}

export async function POST(req: Request) {
  let userId: string | null;
  try {
    ({ userId } = await auth());
  } catch {
    // auth() throws if clerkMiddleware() never ran (Clerk not configured
    // in this environment) — treat that the same as "not signed in".
    return NextResponse.json({ synced: false, reason: "clerk_not_configured" });
  }

  if (!userId) {
    return NextResponse.json({ synced: false, reason: "unauthenticated" }, { status: 401 });
  }

  const supabase = getSupabaseServerClient();
  if (!supabase) {
    return NextResponse.json({ synced: false, reason: "supabase_not_configured" });
  }

  const body = (await req.json().catch(() => null)) as PushBody | null;
  const attempts = Array.isArray(body?.attempts) ? body.attempts : [];
  const examHistory = Array.isArray(body?.examHistory) ? body.examHistory : [];
  const questions = Array.isArray(body?.questions) ? body.questions : [];

  if (attempts.length > 0) {
    const rows = attempts.map((a) => ({
      id: a.id,
      clerk_user_id: userId,
      session_id: a.sessionId,
      question_id: a.questionId,
      chosen_answer: a.chosenAnswer,
      is_correct: a.isCorrect,
      time_taken_seconds: a.timeTakenSeconds,
      self_reported_error: a.selfReportedError,
      flagged: a.flagged === true,
      created_at: a.createdAt,
    }));
    const { error } = await supabase.from("attempts").upsert(rows, { onConflict: "id" });
    if (error) return NextResponse.json({ synced: false, reason: "supabase_error" }, { status: 500 });
  }

  if (examHistory.length > 0) {
    const rows = examHistory.map((e) => ({
      session_id: e.sessionId,
      clerk_user_id: userId,
      section: e.section,
      score: e.score,
      accuracy_pct: e.accuracyPct,
      total_time_seconds: e.totalTimeSeconds,
      question_count: e.questionCount,
      completed_at: e.completedAt,
    }));
    const { error } = await supabase.from("exam_history").upsert(rows, { onConflict: "session_id" });
    if (error) return NextResponse.json({ synced: false, reason: "supabase_error" }, { status: 500 });
  }

  if (questions.length > 0) {
    const rows = questions.map((q) => ({
      id: q.id,
      clerk_user_id: userId,
      section: q.section,
      topic: q.topic,
      subtopic: q.subtopic,
      difficulty: q.difficulty,
      type: q.type,
      body: q.body,
      passage: q.passage,
      choices: q.choices,
      correct_answer: q.correctAnswer,
      explanation: q.explanation,
      media: q.media,
      created_at: q.createdAt,
    }));
    const { error } = await supabase.from("question_cache").upsert(rows, { onConflict: "id" });
    if (error) return NextResponse.json({ synced: false, reason: "supabase_error" }, { status: 500 });
  }

  return NextResponse.json({
    synced: true,
    counts: { attempts: attempts.length, examHistory: examHistory.length, questions: questions.length },
  });
}
