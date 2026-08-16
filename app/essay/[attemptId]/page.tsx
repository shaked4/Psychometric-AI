"use client";

import { useEffect, useRef, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import Link from "next/link";
import { Loader2 } from "lucide-react";
import { NavBar } from "@/components/nav-bar";
import { EssayResults } from "@/components/essay/essay-results";
import { buttonVariants } from "@/components/ui/button";
import { useEssayAttempts } from "@/lib/use-essay-attempts";
import { pullEssayAttempts } from "@/lib/essay-cloud";

/**
 * A submitted essay's results, addressed by its own URL — split out of
 * app/essay/page.tsx so that opening, refreshing, or directly linking to a
 * past submission actually works: that page's phase/resultView used to be
 * plain useState, which a page reload silently drops back to "browse" with
 * no way to recover which essay you were looking at. Reading straight from
 * useEssayAttempts() (localStorage, reactive) means a fresh submission is
 * visible immediately — saveEssayAttempt() already ran before the redirect
 * here — and pullEssayAttempts() below covers the case this id only exists
 * in Supabase (a past essay written on another device, or this device's
 * localStorage was cleared).
 */
export default function EssayResultPage() {
  const params = useParams<{ attemptId: string }>();
  const router = useRouter();
  const attempts = useEssayAttempts();
  const pulledRef = useRef(false);
  const [pullDone, setPullDone] = useState(false);

  useEffect(() => {
    if (pulledRef.current) return;
    pulledRef.current = true;
    pullEssayAttempts().finally(() => setPullDone(true));
  }, []);

  const attempt = attempts.find((a) => a.id === params.attemptId);

  if (!attempt) {
    // Not yet resolved: could be a genuinely unknown id, or (opening a
    // direct link on a device whose localStorage doesn't have it yet) the
    // Supabase pull above just hasn't finished. Only show "not found" once
    // that pull has actually completed and it's still missing.
    if (!pullDone) {
      return (
        <>
          <NavBar />
          <main className="mx-auto flex w-full max-w-3xl flex-col items-center gap-3 px-6 py-20 text-center text-muted-foreground">
            <Loader2 className="size-6 animate-spin" />
            <p>טוענים את החיבור...</p>
          </main>
        </>
      );
    }

    return (
      <>
        <NavBar />
        <main className="mx-auto flex w-full max-w-3xl flex-col items-center gap-4 px-6 py-20 text-center">
          <p className="text-muted-foreground">לא מצאנו את החיבור המבוקש.</p>
          <Link href="/essay" className={buttonVariants({ variant: "outline" })}>
            חזרה לבנק הנושאים
          </Link>
        </main>
      </>
    );
  }

  return (
    <>
      <NavBar />
      <main className="mx-auto flex w-full max-w-3xl flex-col gap-6 px-6 py-10">
        <EssayResults
          promptTitle={attempt.promptTitle}
          essayText={attempt.essayText}
          evaluation={attempt}
          wordCount={attempt.wordCount}
          offline={attempt.offline}
          onDone={() => router.push("/essay")}
        />
      </main>
    </>
  );
}
