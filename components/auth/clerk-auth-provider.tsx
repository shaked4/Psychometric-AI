import { ClerkProvider } from "@clerk/nextjs";
import { heIL } from "@clerk/localizations";
import { CLERK_ENABLED } from "@/lib/config";

/**
 * Only mounts <ClerkProvider> when a publishable key is configured, so the
 * rest of the tree (including useAuth()-based components) is never forced
 * to run inside a Clerk context that doesn't actually exist in local/offline
 * dev. `localization={heIL}` translates Clerk's own UI text (SignIn/SignUp
 * forms, UserButton menu) to Hebrew; `appearance.variables` nudges its
 * default theme toward this app's near-black primary and Rubik font without
 * hand-overriding Clerk's internal element selectors, which drift more
 * often across versions than the documented `variables` API.
 */
export function ClerkAuthProvider({ children }: { children: React.ReactNode }) {
  if (!CLERK_ENABLED) return <>{children}</>;
  return (
    <ClerkProvider
      localization={heIL}
      appearance={{
        variables: {
          colorPrimary: "#171717",
          fontFamily: "var(--font-sans)",
          borderRadius: "0.75rem",
        },
      }}
    >
      {children}
    </ClerkProvider>
  );
}
