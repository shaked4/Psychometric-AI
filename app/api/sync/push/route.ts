import { NextResponse } from "next/server";
import { auth } from "@clerk/nextjs/server";
import { getSupabaseServerClient } from "@/lib/supabase-server";
import type { Attempt } from "@/types";

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

  const body = await req.json().catch(() => null);
  const attempts = (body?.attempts ?? []) as Attempt[];
  if (!Array.isArray(attempts) || attempts.length === 0) {
    return NextResponse.json({ synced: true, count: 0 });
  }

  const rows = attempts.map((a) => ({
    id: a.id,
    clerk_user_id: userId,
    session_id: a.sessionId,
    question_id: a.questionId,
    chosen_answer: a.chosenAnswer,
    is_correct: a.isCorrect,
    time_taken_seconds: a.timeTakenSeconds,
    self_reported_error: a.selfReportedError,
    created_at: a.createdAt,
  }));

  const { error } = await supabase.from("attempts").upsert(rows, { onConflict: "id" });
  if (error) {
    return NextResponse.json({ synced: false, reason: "supabase_error" }, { status: 500 });
  }

  return NextResponse.json({ synced: true, count: rows.length });
}
