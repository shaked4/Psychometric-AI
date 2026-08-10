"use client";

import { SignInButton, UserButton, useAuth } from "@clerk/nextjs";

export function ClerkAuthSection() {
  const { isLoaded, isSignedIn } = useAuth();

  if (!isLoaded) {
    return <div className="size-8 animate-pulse rounded-full bg-muted" aria-hidden />;
  }

  if (isSignedIn) {
    return <UserButton />;
  }

  return (
    <SignInButton mode="modal">
      <button
        type="button"
        className="rounded-lg border border-border px-3.5 py-2 text-sm font-medium text-foreground transition hover:bg-muted"
      >
        התחברות
      </button>
    </SignInButton>
  );
}
