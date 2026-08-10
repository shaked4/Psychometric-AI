import { ClerkProvider } from "@clerk/nextjs";
import { CLERK_ENABLED } from "@/lib/config";

/**
 * Only mounts <ClerkProvider> when a publishable key is configured, so the
 * rest of the tree (including useAuth()-based components) is never forced
 * to run inside a Clerk context that doesn't actually exist in local/offline
 * dev.
 */
export function ClerkAuthProvider({ children }: { children: React.ReactNode }) {
  if (!CLERK_ENABLED) return <>{children}</>;
  return <ClerkProvider>{children}</ClerkProvider>;
}
