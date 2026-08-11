import { NextResponse } from "next/server";
import { auth } from "@clerk/nextjs/server";
import { getSupabaseServerClient } from "@/lib/supabase-server";
import type { EssayAttempt } from "@/lib/essay-storage";

/**
 * Essay attempts get their own push/pull pair rather than folding into
 * app/api/sync/{push,pull}/route.ts — unlike attempts/examHistory/questions,
 * essays are created one at a time (never batched, never retroactively
 * edited), so there's no need for the dirty-id tracking that pair exists
 * for. Same auth + service-role pattern as the rest of the sync layer.
 */
export async function POST(req: Request) {
  let userId: string | null;
  try {
    ({ userId } = await auth());
  } catch {
    return NextResponse.json({ synced: false, reason: "clerk_not_configured" });
  }

  if (!userId) {
    return NextResponse.json({ synced: false, reason: "unauthenticated" }, { status: 401 });
  }

  const supabase = getSupabaseServerClient();
  if (!supabase) {
    return NextResponse.json({ synced: false, reason: "supabase_not_configured" });
  }

  const attempt = (await req.json().catch(() => null)) as EssayAttempt | null;
  if (!attempt || typeof attempt.id !== "string" || typeof attempt.essayText !== "string") {
    return NextResponse.json({ synced: false, reason: "invalid_body" }, { status: 400 });
  }

  const { error } = await supabase.from("essay_attempts").upsert(
    {
      id: attempt.id,
      clerk_user_id: userId,
      prompt_id: attempt.promptId,
      prompt_title: attempt.promptTitle,
      essay_text: attempt.essayText,
      word_count: attempt.wordCount,
      time_taken_seconds: attempt.timeTakenSeconds,
      content_score: attempt.contentScore,
      language_score: attempt.languageScore,
      estimated_psychometric_score: attempt.estimatedPsychometricScore,
      strengths: attempt.strengths,
      improvements: attempt.improvements,
      reminiscent_examples: attempt.reminiscentExamples,
      offline: attempt.offline,
      created_at: attempt.createdAt,
    },
    { onConflict: "id" }
  );

  if (error) return NextResponse.json({ synced: false, reason: "supabase_error" }, { status: 500 });
  return NextResponse.json({ synced: true });
}

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

  const { data, error } = await supabase
    .from("essay_attempts")
    .select("*")
    .eq("clerk_user_id", userId)
    .order("created_at", { ascending: false });

  if (error) return NextResponse.json({ pulled: false, reason: "supabase_error" }, { status: 500 });

  const essays: EssayAttempt[] = (data ?? []).map((r) => ({
    id: r.id as string,
    promptId: r.prompt_id as string,
    promptTitle: r.prompt_title as string,
    essayText: r.essay_text as string,
    wordCount: r.word_count as number,
    timeTakenSeconds: r.time_taken_seconds as number,
    contentScore: r.content_score as number,
    languageScore: r.language_score as number,
    estimatedPsychometricScore: r.estimated_psychometric_score as number,
    strengths: r.strengths as string[],
    improvements: r.improvements as string[],
    reminiscentExamples: r.reminiscent_examples as EssayAttempt["reminiscentExamples"],
    offline: r.offline === true,
    createdAt: r.created_at as string,
  }));

  return NextResponse.json({ pulled: true, essays });
}
