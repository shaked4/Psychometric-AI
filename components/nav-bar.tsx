"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { cn } from "@/lib/utils";
import { CLERK_ENABLED } from "@/lib/config";
import { ClerkAuthSection } from "@/components/auth/clerk-auth-section";
import { GuestModeBadge } from "@/components/auth/guest-mode-badge";
import { useAttempts } from "@/lib/use-attempts";
import { computeReviewQueue } from "@/lib/spaced-repetition";

/** Grouped into visually-separated clusters (core / practice / review)
 * rather than one flat row — a calmer scan pattern for a study portal with
 * this many top-level destinations. */
const NAV_GROUPS = [
  [
    { href: "/", label: "בית", match: (p: string) => p === "/" },
    { href: "/dashboard", label: "לוח בקרה", match: (p: string) => p.startsWith("/dashboard") },
  ],
  [
    {
      href: "/practice/quant",
      label: "תרגול",
      match: (p: string) =>
        p.startsWith("/practice") && !p.startsWith("/practice/custom") && !p.startsWith("/practice/review"),
    },
    { href: "/practice/review", label: "חזרה מרווחת", match: (p: string) => p.startsWith("/practice/review") },
    { href: "/practice/custom", label: "תרגול מותאם AI", match: (p: string) => p.startsWith("/practice/custom") },
    { href: "/exam/quant", label: "סימולציית פרק", match: (p: string) => p.startsWith("/exam") },
    { href: "/essay", label: "מטלת כתיבה", match: (p: string) => p.startsWith("/essay") },
  ],
  [
    { href: "/history", label: "תחקור שאלות", match: (p: string) => p.startsWith("/history") },
    { href: "/post-mortem", label: "תחקור מעמיק", match: (p: string) => p.startsWith("/post-mortem") },
  ],
];

export function NavBar() {
  const pathname = usePathname();
  const attempts = useAttempts();
  const dueCount = computeReviewQueue(attempts).dueToday.length;

  return (
    <header className="sticky top-0 z-10 border-b border-border bg-background/95 backdrop-blur">
      <div className="mx-auto flex max-w-5xl flex-wrap items-center justify-between gap-3 px-6 py-4">
        <Link href="/" className="text-lg font-bold tracking-tight">
          פסיכומטרי <span className="text-primary">AI</span>
        </Link>

        <nav className="flex flex-wrap items-center gap-1">
          {NAV_GROUPS.map((group, groupIndex) => (
            <div key={groupIndex} className="flex flex-wrap items-center gap-1">
              {groupIndex > 0 && <span className="mx-1.5 h-5 w-px shrink-0 bg-border" aria-hidden />}
              {group.map((item) => (
                <Link
                  key={item.href}
                  href={item.href}
                  className={cn(
                    "rounded-lg px-3.5 py-2 text-sm font-medium transition",
                    item.match(pathname)
                      ? "bg-primary/10 font-semibold text-primary"
                      : "text-muted-foreground hover:bg-muted/60 hover:text-foreground"
                  )}
                >
                  {item.label}
                  {item.href === "/practice/review" && dueCount > 0 && (
                    <span className="ms-1.5 inline-flex min-w-5 items-center justify-center rounded-full bg-primary px-1.5 py-0.5 text-[10px] font-bold leading-none text-primary-foreground">
                      {dueCount}
                    </span>
                  )}
                </Link>
              ))}
            </div>
          ))}
        </nav>

        <div className="flex shrink-0 items-center gap-3">
          {CLERK_ENABLED ? <ClerkAuthSection /> : <GuestModeBadge />}
        </div>
      </div>
    </header>
  );
}
