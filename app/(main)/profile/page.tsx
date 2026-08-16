"use client";

import { useState } from "react";
import Link from "next/link";
import { useAuth, useUser } from "@clerk/nextjs";
import { AlertTriangle, CheckCircle2, CloudOff, Loader2, RefreshCw } from "lucide-react";
import { Button, buttonVariants } from "@/components/ui/button";
import { CLERK_ENABLED } from "@/lib/config";
import { useAttempts } from "@/lib/use-attempts";
import { useExamHistory } from "@/lib/use-exam-history";
import { useEssayAttempts } from "@/lib/use-essay-attempts";
import { getAttempts } from "@/lib/storage";
import { getExamHistory } from "@/lib/exam-history";
import { pullRemoteData, pushUnsyncedData } from "@/lib/cloud-sync";
import { pullEssayAttempts } from "@/lib/essay-cloud";
import { computeOverallStats } from "@/lib/stats";
import { computeReadinessIndex } from "@/lib/readiness";

function formatSyncTime(date: Date): string {
  return date.toLocaleTimeString("he-IL", { hour: "2-digit", minute: "2-digit" });
}

/** Cross-device profile view — this page's entire job is to make the
 * pull-on-sign-in that CloudSyncBridge already does on every page
 * observable and re-triggerable, not to introduce a second sync mechanism.
 * The stats below read from the same local stores every other page reads
 * from (useAttempts/useExamHistory/useEssayAttempts); by the time this page
 * is visited after signing in on a new device, CloudSyncBridge has already
 * merged Supabase's copy in, so "cross-device continuity" is just: land
 * here, see the same numbers you saw on the other device. */
export default function ProfilePage() {
  const attempts = useAttempts();
  const examHistory = useExamHistory();
  const essays = useEssayAttempts();
  const overall = computeOverallStats(attempts);
  const readiness = computeReadinessIndex(attempts);

  const [syncing, setSyncing] = useState(false);
  const [lastSyncedAt, setLastSyncedAt] = useState<Date | null>(null);
  const [syncError, setSyncError] = useState(false);

  async function handleSyncNow() {
    setSyncing(true);
    setSyncError(false);
    try {
      await Promise.all([pullRemoteData(), pullEssayAttempts()]);
      const pushResult = await pushUnsyncedData(getAttempts(), getExamHistory());
      if (!pushResult.synced) setSyncError(true);
      setLastSyncedAt(new Date());
    } catch {
      setSyncError(true);
    } finally {
      setSyncing(false);
    }
  }

  if (!CLERK_ENABLED) {
    return (
      <main className="mx-auto flex w-full max-w-2xl flex-col items-center gap-4 px-6 py-16 text-center">
        <CloudOff className="size-8 text-muted-foreground" />
        <h1 className="text-2xl font-bold tracking-tight">פרופיל וסנכרון ענן</h1>
        <p className="max-w-sm text-muted-foreground">
          סנכרון ענן אינו מוגדר בסביבה הזו — כל הנתונים שלכם נשמרים מקומית במכשיר זה בלבד (מצב אורח).
        </p>
        <Link href="/dashboard" className={buttonVariants({ variant: "outline" })}>
          ללוח הבקרה
        </Link>
      </main>
    );
  }

  return <ProfileSignedInGate {...{ examHistory, essays, overall, readiness, syncing, lastSyncedAt, syncError, handleSyncNow }} />;
}

interface ProfileSignedInGateProps {
  examHistory: ReturnType<typeof useExamHistory>;
  essays: ReturnType<typeof useEssayAttempts>;
  overall: ReturnType<typeof computeOverallStats>;
  readiness: ReturnType<typeof computeReadinessIndex>;
  syncing: boolean;
  lastSyncedAt: Date | null;
  syncError: boolean;
  handleSyncNow: () => void;
}

function ProfileSignedInGate({
  examHistory,
  essays,
  overall,
  readiness,
  syncing,
  lastSyncedAt,
  syncError,
  handleSyncNow,
}: ProfileSignedInGateProps) {
  const { isLoaded, isSignedIn } = useAuth();
  const { user } = useUser();

  if (!isLoaded) {
    return (
      <main className="flex min-h-[50vh] items-center justify-center">
        <Loader2 className="size-6 animate-spin text-muted-foreground" />
      </main>
    );
  }

  if (!isSignedIn) {
    return (
      <main className="mx-auto flex w-full max-w-2xl flex-col items-center gap-4 px-6 py-16 text-center">
        <CloudOff className="size-8 text-muted-foreground" />
        <h1 className="text-2xl font-bold tracking-tight">פרופיל וסנכרון ענן</h1>
        <p className="max-w-sm text-muted-foreground">
          התחברו כדי לראות פרופיל אישי ולסנכרן את היסטוריית התרגול שלכם בין מכשירים.
        </p>
        <Link href="/sign-in" className={buttonVariants({ size: "lg" })}>
          התחברות
        </Link>
      </main>
    );
  }

  return (
    <main className="mx-auto flex w-full max-w-3xl flex-col gap-6 px-6 py-10">
      <div className="flex flex-wrap items-center justify-between gap-4">
        <div className="flex items-center gap-4">
          {user?.imageUrl && (
            // eslint-disable-next-line @next/next/no-img-element
            <img src={user.imageUrl} alt="" className="size-14 shrink-0 rounded-full" />
          )}
          <div>
            <h1 className="text-xl font-bold tracking-tight">
              {user?.fullName ?? user?.primaryEmailAddress?.emailAddress ?? "המשתמש שלי"}
            </h1>
            <p className="text-sm text-muted-foreground">
              {user?.primaryEmailAddress?.emailAddress}
            </p>
          </div>
        </div>

        <Button size="sm" onClick={handleSyncNow} disabled={syncing} className="gap-1.5">
          {syncing ? <Loader2 className="size-4 animate-spin" /> : <RefreshCw className="size-4" />}
          סנכרון עכשיו
        </Button>
      </div>

      <div className="flex items-center gap-2 rounded-lg border border-border bg-card p-3 text-sm">
        {syncError ? (
          <>
            <AlertTriangle className="size-4 shrink-0 text-amber-600 dark:text-amber-400" />
            <span className="text-amber-700 dark:text-amber-400">
              הסנכרון האחרון לא הושלם במלואו — ייתכן שהמידע אינו מעודכן מכל המכשירים.
            </span>
          </>
        ) : lastSyncedAt ? (
          <>
            <CheckCircle2 className="size-4 shrink-0 text-green-600" />
            <span className="text-muted-foreground">
              סונכרן לאחרונה בשעה <bdi dir="ltr">{formatSyncTime(lastSyncedAt)}</bdi>
            </span>
          </>
        ) : (
          <>
            <CheckCircle2 className="size-4 shrink-0 text-green-600" />
            <span className="text-muted-foreground">
              המידע מסונכרן אוטומטית מרגע ההתחברות — לחצו &quot;סנכרון עכשיו&quot; לרענון ידני.
            </span>
          </>
        )}
      </div>

      <div className="grid grid-cols-2 gap-4 sm:grid-cols-4">
        <StatCard label="תשובות בסה״כ" value={String(overall.totalAnswered)} />
        <StatCard label="דיוק כללי" value={`${overall.accuracyPct}%`} />
        <StatCard label="סימולציות שהושלמו" value={String(examHistory.length)} />
        <StatCard label="חיבורים שהוגשו" value={String(essays.length)} />
      </div>

      <div className="rounded-xl border border-primary/30 bg-primary/5 p-5">
        <div className="flex items-center justify-between">
          <span className="text-sm font-medium">מדד מוכנות למבחן</span>
          <span className="text-2xl font-bold tabular-nums">{readiness.index}</span>
        </div>
        <p className="mt-1 text-xs text-muted-foreground">
          מבוסס על דיוק, קצב פתרון ורציפות תרגול — מחושב מההיסטוריה המלאה שלכם, בין אם נצברה במכשיר
          הזה או סונכרנה ממכשיר אחר.
        </p>
      </div>

      <p className="text-xs text-muted-foreground">
        * הנתונים כאן זהים לנתוני לוח הבקרה — עמוד זה מציג בעיקר את מצב הסנכרון עצמו.{" "}
        <Link href="/dashboard" className="font-medium text-primary underline underline-offset-4">
          עברו ללוח הבקרה המלא
        </Link>
        .
      </p>
    </main>
  );
}

function StatCard({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-xl border border-border bg-card p-5 text-center shadow-sm">
      <p dir="ltr" className="text-2xl font-bold tracking-tight text-card-foreground">
        {value}
      </p>
      <p className="mt-1 text-sm text-muted-foreground">{label}</p>
    </div>
  );
}
