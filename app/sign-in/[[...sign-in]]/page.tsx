import Link from "next/link";
import { SignIn } from "@clerk/nextjs";
import { CLERK_ENABLED } from "@/lib/config";
import { AuthUnavailable } from "@/components/auth/auth-unavailable";

export default function SignInPage() {
  if (!CLERK_ENABLED) return <AuthUnavailable />;

  return (
    <main dir="rtl" className="flex min-h-screen flex-col items-center justify-center gap-6 px-6 py-12">
      <Link href="/" className="text-lg font-bold tracking-tight">
        פסיכומטרי <span className="text-primary">AI</span>
      </Link>
      <SignIn path="/sign-in" routing="path" signUpUrl="/sign-up" fallbackRedirectUrl="/dashboard" />
    </main>
  );
}
