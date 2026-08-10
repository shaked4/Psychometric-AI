import { AuthenticateWithRedirectCallback } from "@clerk/nextjs";
import { CLERK_ENABLED } from "@/lib/config";
import { AuthUnavailable } from "@/components/auth/auth-unavailable";

/** Completion route for the NavBar's direct Google button (see
 * components/auth/google-sign-in-button.tsx), which calls
 * signIn.authenticateWithRedirect() and bypasses the <SignIn/> component's
 * own built-in OAuth handling — that flow needs an explicit callback route
 * to finish. Not used by <SignIn>/<SignUp> themselves, which handle their
 * own OAuth callback internally via their catch-all route. */
export default function SSOCallbackPage() {
  if (!CLERK_ENABLED) return <AuthUnavailable />;
  return <AuthenticateWithRedirectCallback />;
}
