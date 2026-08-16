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
  /** Restricts the draw to one topic within the section — the
   * study-sidebar's `?topic=` filter on /practice/[section]. Omitted for a
   * whole-section draw (exam mode, quick practice). */
  topic?: string;
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

  const { section, count, topic } = body;
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
  // Temporary diagnostic (see CLAUDE.md-adjacent debugging notes, remove
  // once Vercel env vars are confirmed live): getSupabaseServerClient()
  // returns null whenever either env var is falsy, and NEXT_PUBLIC_* values
  // are inlined at build time — so if this logs "resolved: false" with
  // "url present: false" even after redeploying with the var set in the
  // Vercel dashboard, the deployment didn't actually rebuild.
  console.log(
    `[exam/allocate] Supabase client resolved: ${supabase !== null} — NEXT_PUBLIC_SUPABASE_URL present: ${Boolean(process.env.NEXT_PUBLIC_SUPABASE_URL)}, SUPABASE_SERVICE_ROLE_KEY present: ${Boolean(process.env.SUPABASE_SERVICE_ROLE_KEY)}`
  );

  const result = await allocateExamQuestions({
    supabase,
    section,
    count,
    topic: typeof topic === "string" && topic.length > 0 ? topic : undefined,
    clerkUserId,
    clientKnownSolvedIds: excludeQuestionIds,
  });

  return NextResponse.json(result);
}
