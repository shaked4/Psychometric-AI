import Link from "next/link";

/** Shown by /sign-in, /sign-up, and /sso-callback when Clerk isn't
 * configured — reached only by direct navigation, since the NavBar never
 * links here in that state (see lib/config.ts's CLERK_ENABLED). */
export function AuthUnavailable() {
  return (
    <main dir="rtl" className="flex min-h-screen flex-col items-center justify-center gap-4 px-6 text-center">
      <p className="text-lg font-medium">התחברות אינה זמינה בסביבה הזו</p>
      <p className="max-w-sm text-sm text-muted-foreground">
        האפליקציה פועלת כרגע במצב אורח / מקומי בלבד. כדי להפעיל התחברות, יש להגדיר את מפתחות
        Clerk בסביבת השרת.
      </p>
      <Link href="/" className="text-sm font-medium text-primary underline underline-offset-4">
        חזרה לדף הבית
      </Link>
    </main>
  );
}
