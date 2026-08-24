"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { cn } from "@/lib/utils";
import { CLERK_ENABLED } from "@/lib/config";
import { ClerkAuthSection } from "@/components/auth/clerk-auth-section";
import { GuestModeBadge } from "@/components/auth/guest-mode-badge";
import { useAttempts } from "@/lib/use-attempts";
import { computeReviewQueue } from "@/lib/spaced-repetition";

/** Every top-level destination, laid out horizontally with no collapsed
 * "עוד" menu — flex-wrap is the only concession to narrow windows (the ask
 * was specifically "no dropdown on desktop," not "never wrap"), so at
 * normal desktop widths this reads as one clean row and only wraps to a
 * second line if the viewport genuinely can't fit all of it. */
const NAV_ROUTES = [
  { href: "/", label: "בית", match: (p: string) => p === "/" },
  {
    href: "/practice/quant",
    label: "תרגול",
    match: (p: string) => p.startsWith("/practice") && !PRACTICE_VARIANT_ROUTES.some((r) => p.startsWith(r)),
  },
  { href: "/practice/review", label: "חזרה מרווחת", match: (p: string) => p.startsWith("/practice/review") },
  { href: "/practice/adaptive", label: "תרגול אדפטיבי", match: (p: string) => p.startsWith("/practice/adaptive") },
  { href: "/practice/custom", label: "תרגול מותאם AI", match: (p: string) => p.startsWith("/practice/custom") },
  { href: "/exam/quant", label: "בחינות", match: (p: string) => p.startsWith("/exam") },
  { href: "/essay", label: "מטלת כתיבה", match: (p: string) => p.startsWith("/essay") },
  { href: "/cheatsheets", label: "גיליון נוסחאות", match: (p: string) => p.startsWith("/cheatsheets") },
  { href: "/history", label: "תחקור שאלות", match: (p: string) => p.startsWith("/history") },
  { href: "/post-mortem", label: "תחקור מעמיק", match: (p: string) => p.startsWith("/post-mortem") },
  { href: "/dashboard", label: "לוח בקרה", match: (p: string) => p.startsWith("/dashboard") },
  { href: "/profile", label: "פרופיל", match: (p: string) => p.startsWith("/profile") },
];

const PRACTICE_VARIANT_ROUTES = ["/practice/review", "/practice/adaptive", "/practice/custom"];

function DueBadge({ count }: { count: number }) {
  if (count <= 0) return null;
  return (
    <span className="ms-1.5 inline-flex min-w-5 items-center justify-center rounded-full bg-gradient-brand px-1.5 py-0.5 text-[10px] font-bold leading-none text-primary-foreground shadow-sm">
      {count}
    </span>
  );
}

export function NavBar() {
  const pathname = usePathname();
  const attempts = useAttempts();
  const dueCount = computeReviewQueue(attempts).dueToday.length;

  return (
    <header className="sticky top-0 z-10 border-b border-border bg-background/95 backdrop-blur">
      <div className="mx-auto flex max-w-6xl flex-wrap items-center justify-between gap-x-6 gap-y-3 px-6 py-4">
        <Link href="/" className="text-lg font-bold tracking-tight">
          פסיכומטרי <span className="text-primary">AI</span>
        </Link>

        <nav className="flex flex-wrap items-center gap-1">
          {NAV_ROUTES.map((item) => {
            const isActive = item.match(pathname);
            return (
              <Link
                key={item.href}
                href={item.href}
                className={cn(
                  "relative rounded-full px-3 py-2 text-sm font-medium transition-all duration-200",
                  isActive
                    ? "bg-primary/10 font-semibold text-primary"
                    : "text-muted-foreground hover:-translate-y-px hover:bg-muted/60 hover:text-foreground"
                )}
              >
                {item.label}
                {(item.href === "/practice/review" || item.href === "/practice/adaptive") && (
                  <DueBadge count={dueCount} />
                )}
                {isActive && (
                  <span className="absolute inset-x-3 -bottom-[calc(1rem+1px)] h-0.5 rounded-full bg-gradient-brand" />
                )}
              </Link>
            );
          })}
        </nav>

        <div className="flex shrink-0 items-center gap-3">
          {CLERK_ENABLED ? <ClerkAuthSection /> : <GuestModeBadge />}
        </div>
      </div>
    </header>
  );
}
