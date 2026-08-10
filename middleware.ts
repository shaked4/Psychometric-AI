import { NextResponse } from "next/server";
import { clerkMiddleware } from "@clerk/nextjs/server";

// clerkMiddleware() requires both keys at module load time; if either is
// missing (local/offline dev with no Clerk project set up), fall back to a
// plain passthrough so the app keeps working without Clerk entirely.
const CLERK_CONFIGURED = Boolean(
  process.env.NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY && process.env.CLERK_SECRET_KEY
);

export default CLERK_CONFIGURED ? clerkMiddleware() : () => NextResponse.next();

export const config = {
  matcher: ["/((?!_next/static|_next/image|favicon.ico).*)"],
};
