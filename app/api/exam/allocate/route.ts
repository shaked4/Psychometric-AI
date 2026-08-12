import { NextRequest, NextResponse } from "next/server";
import { auth } from "@clerk/nextjs/server";
import { getSupabaseServerClient } from "@/lib/supabase-server";
import { allocateExamQuestions } from "@/lib/exam-fetcher";
import type { Section } from "@/types";

/**
 * Draws a non-overlapping exam set from the pre-seeded `questions` bank
 * (see scripts/seed-question-bank.ts, lib/exam-fetcher.ts). This route only
 * ever returns what the bank currently has — `bankAvailable: false` (not
 * seeded / Supabase not configured) or a `questions.length < count`
 * shortfall (bank thinner than requested) are both left for the caller
 * (app/exam/[section]/page.tsx) to top up via the existing live
 * /api/generate-questions path, so exam mode never breaks or blocks on
 * this feature — same everything-degrades-independently philosophy as
 * every other integration in this app.
 */

const VALID_SECTIONS: Section[] = ["quant", "verbal", "english"];

interface AllocateRequestBody {
  section: Section;
  count: number;
  /** The caller's locally-known solved question ids (its own attempt log)
   * — merged server-side with this user's synced `attempts` history. */
  excludeQuestionIds?: string[];
}

export async function POST(req: NextRequest) {
  let body: AllocateRequestBody;
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON body" }, { status: 400 });
  }

  const { section, count } = body;
  const excludeQuestionIds = Array.isArray(body.excludeQuestionIds) ? body.excludeQuestionIds : [];

  if (!VALID_SECTIONS.includes(section) || !Number.isFinite(count) || count <= 0) {
    return NextResponse.json({ error: "Missing or invalid fields" }, { status: 400 });
  }

  let clerkUserId: string | null = null;
  try {
    ({ userId: clerkUserId } = await auth());
  } catch {
    clerkUserId = null;
  }

  const supabase = getSupabaseServerClient();

  const result = await allocateExamQuestions({
    supabase,
    section,
    count,
    clerkUserId,
    clientKnownSolvedIds: excludeQuestionIds,
  });

  return NextResponse.json(result);
}
