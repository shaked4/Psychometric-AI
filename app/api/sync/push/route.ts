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
  try {
    let userId: string | null;
    try {
      ({ userId } = await auth());
    } catch (error) {
      // auth() throws if clerkMiddleware() never ran (Clerk not configured
      // in this environment) — treat that the same as "not signed in".
      // Still logged: a real Clerk misconfiguration in production would
      // also land here, and silently swallowing it is exactly what made
      // this class of bug invisible in Vercel logs before.
      console.error("[sync/push] auth() failed, treating as clerk_not_configured:", error);
      return NextResponse.json({ synced: false, reason: "clerk_not_configured" });
    }

    if (!userId) {
      // Guest / signed-out caller — nothing to sync yet, not a server
      // error, so this is a clean 200 rather than a 401 that would show up
      // as a failure in logs/monitoring for entirely expected guest usage.
      return NextResponse.json({ synced: false, reason: "unauthenticated" });
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
      if (error) {
        console.error("[sync/push] attempts upsert failed:", error);
        return NextResponse.json({ synced: false, reason: "supabase_error" }, { status: 500 });
      }
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
      if (error) {
        console.error("[sync/push] exam_history upsert failed:", error);
        return NextResponse.json({ synced: false, reason: "supabase_error" }, { status: 500 });
      }
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
      if (error) {
        console.error("[sync/push] question_cache upsert failed:", error);
        return NextResponse.json({ synced: false, reason: "supabase_error" }, { status: 500 });
      }
    }

    return NextResponse.json({
      synced: true,
      counts: { attempts: attempts.length, examHistory: examHistory.length, questions: questions.length },
    });
  } catch (error) {
    // Catch-all for anything not already handled above (a thrown error from
    // the Supabase client itself, an unexpected shape in the request body,
    // etc.) — previously this would surface in Vercel as a bare 500 with no
    // way to tell what actually happened.
    console.error("[sync/push] Unhandled error:", error);
    return NextResponse.json({ synced: false, reason: "unexpected_error" }, { status: 500 });
  }
}
