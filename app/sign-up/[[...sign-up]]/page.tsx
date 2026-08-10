import Link from "next/link";
import { SignUp } from "@clerk/nextjs";
import { CLERK_ENABLED } from "@/lib/config";
import { AuthUnavailable } from "@/components/auth/auth-unavailable";

export default function SignUpPage() {
  if (!CLERK_ENABLED) return <AuthUnavailable />;

  return (
    <main dir="rtl" className="flex min-h-screen flex-col items-center justify-center gap-6 px-6 py-12">
      <Link href="/" className="text-lg font-bold tracking-tight">
        פסיכומטרי <span className="text-primary">AI</span>
      </Link>
      <SignUp path="/sign-up" routing="path" signInUrl="/sign-in" fallbackRedirectUrl="/dashboard" />
    </main>
  );
}
