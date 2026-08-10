"use client";

import { useState } from "react";
import Link from "next/link";
import { useSignIn } from "@clerk/nextjs";

function GoogleLogo() {
  return (
    <svg viewBox="0 0 18 18" className="size-4 shrink-0" aria-hidden="true">
      <path
        fill="#4285F4"
        d="M17.64 9.2c0-.64-.06-1.25-.16-1.84H9v3.48h4.84a4.14 4.14 0 0 1-1.8 2.72v2.26h2.92c1.7-1.57 2.68-3.88 2.68-6.62z"
      />
      <path
        fill="#34A853"
        d="M9 18c2.43 0 4.47-.8 5.96-2.18l-2.92-2.26c-.81.54-1.85.86-3.04.86-2.34 0-4.32-1.58-5.03-3.7H.96v2.33A9 9 0 0 0 9 18z"
      />
      <path
        fill="#FBBC05"
        d="M3.97 10.72A5.4 5.4 0 0 1 3.68 9c0-.6.1-1.18.29-1.72V4.95H.96A9 9 0 0 0 0 9c0 1.45.35 2.83.96 4.05l3.01-2.33z"
      />
      <path
        fill="#EA4335"
        d="M9 3.58c1.32 0 2.51.46 3.44 1.35l2.59-2.59C13.46.89 11.43 0 9 0A9 9 0 0 0 .96 4.95l3.01 2.33C4.68 5.16 6.66 3.58 9 3.58z"
      />
    </svg>
  );
}

/** One-click Google OAuth, bypassing the full <SignIn/> form — completes at
 * /sso-callback (see app/sso-callback/page.tsx). Falls back to a link to the
 * full /sign-in page (which offers Google too, alongside other methods) if
 * the redirect itself fails to start, e.g. Google isn't enabled yet in the
 * Clerk dashboard for this project.
 *
 * Uses the Signals-based `useSignIn()` API (`{ signIn, fetchStatus }`, with
 * `signIn.sso(...)`) — this installed Clerk version's `useSignIn()` no
 * longer returns the older `{ isLoaded, signIn }` shape with
 * `signIn.authenticateWithRedirect(...)`; `npm run build`'s TypeScript pass
 * caught the mismatch against the real installed types. */
export function GoogleSignInButton() {
  const { signIn, fetchStatus } = useSignIn();
  const [failed, setFailed] = useState(false);
  const loading = fetchStatus === "fetching";

  async function handleClick() {
    setFailed(false);
    try {
      const { error } = await signIn.sso({
        strategy: "oauth_google",
        redirectCallbackUrl: "/sso-callback",
        redirectUrl: "/dashboard",
      });
      if (error) setFailed(true);
    } catch {
      setFailed(true);
    }
  }

  return (
    <div className="flex flex-col items-end gap-1">
      <button
        type="button"
        onClick={handleClick}
        disabled={loading}
        className="flex items-center gap-2 rounded-lg border border-border bg-background px-3.5 py-2 text-sm font-medium text-foreground transition hover:bg-muted disabled:opacity-60"
      >
        <GoogleLogo />
        {loading ? "מעביר להתחברות..." : "התחברות עם Google"}
      </button>
      {failed && (
        <Link href="/sign-in" className="text-xs text-muted-foreground underline underline-offset-2">
          לא הצלחנו לפתוח את Google — נסו דרך עמוד ההתחברות
        </Link>
      )}
    </div>
  );
}
