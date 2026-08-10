"use client";

import { UserButton, useAuth } from "@clerk/nextjs";
import { GoogleSignInButton } from "@/components/auth/google-sign-in-button";

export function ClerkAuthSection() {
  const { isLoaded, isSignedIn } = useAuth();

  if (!isLoaded) {
    return <div className="size-8 animate-pulse rounded-full bg-muted" aria-hidden />;
  }

  if (isSignedIn) {
    return <UserButton showName />;
  }

  return <GoogleSignInButton />;
}
