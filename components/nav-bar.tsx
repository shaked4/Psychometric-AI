"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { ChevronDown } from "lucide-react";
import { cn } from "@/lib/utils";
import { CLERK_ENABLED } from "@/lib/config";
import { ClerkAuthSection } from "@/components/auth/clerk-auth-section";
import { GuestModeBadge } from "@/components/auth/guest-mode-badge";
import { useAttempts } from "@/lib/use-attempts";
import { computeReviewQueue } from "@/lib/spaced-repetition";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";

const PRACTICE_VARIANT_ROUTES = ["/practice/review", "/practice/adaptive", "/practice/custom"];

/** The four destinations that earn a permanent slot in the bar itself —
 * everything else lives one click away behind the "עוד" menu below, so the
 * bar reads as one clean row instead of the previous flat 12-item list. */
const PRIMARY_ROUTES = [
  { href: "/", label: "בית", match: (p: string) => p === "/" },
  {
    href: "/practice/quant",
    label: "תרגול",
    match: (p: string) => p.startsWith("/practice") && !PRACTICE_VARIANT_ROUTES.some((r) => p.startsWith(r)),
  },
  { href: "/exam/quant", label: "בחינות", match: (p: string) => p.startsWith("/exam") },
  { href: "/essay", label: "מטלת כתיבה", match: (p: string) => p.startsWith("/essay") },
];

/** Practice variants, review/analysis tools, and account pages — grouped
 * behind the "עוד" trigger instead of each competing for a slot up top. */
const SECONDARY_ROUTES = [
  { href: "/practice/adaptive", label: "תרגול אדפטיבי", match: (p: string) => p.startsWith("/practice/adaptive") },
  { href: "/practice/custom", label: "תרגול מותאם AI", match: (p: string) => p.startsWith("/practice/custom") },
  { href: "/practice/review", label: "חזרה מרווחת", match: (p: string) => p.startsWith("/practice/review") },
  { href: "/dashboard", label: "לוח בקרה", match: (p: string) => p.startsWith("/dashboard") },
  { href: "/cheatsheets", label: "גיליון נוסחאות", match: (p: string) => p.startsWith("/cheatsheets") },
  { href: "/history", label: "תחקור שאלות", match: (p: string) => p.startsWith("/history") },
  { href: "/post-mortem", label: "תחקור מעמיק", match: (p: string) => p.startsWith("/post-mortem") },
  { href: "/profile", label: "פרופיל", match: (p: string) => p.startsWith("/profile") },
];

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
  const isSecondaryActive = SECONDARY_ROUTES.some((item) => item.match(pathname));

  return (
    <header className="sticky top-0 z-10 border-b border-border bg-background/95 backdrop-blur">
      <div className="mx-auto flex max-w-6xl flex-wrap items-center justify-between gap-x-6 gap-y-3 px-6 py-4">
        <Link href="/" className="text-lg font-bold tracking-tight">
          פסיכומטרי <span className="text-primary">AI</span>
        </Link>

        <nav className="flex flex-wrap items-center gap-1">
          {PRIMARY_ROUTES.map((item) => {
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
                {isActive && (
                  <span className="absolute inset-x-3 -bottom-[calc(1rem+1px)] h-0.5 rounded-full bg-gradient-brand" />
                )}
              </Link>
            );
          })}

          <DropdownMenu>
            <DropdownMenuTrigger
              className={cn(
                "relative flex items-center gap-1 rounded-full px-3 py-2 text-sm font-medium outline-none transition-all duration-200",
                isSecondaryActive
                  ? "bg-primary/10 font-semibold text-primary"
                  : "text-muted-foreground hover:-translate-y-px hover:bg-muted/60 hover:text-foreground"
              )}
            >
              עוד
              <DueBadge count={dueCount} />
              <ChevronDown className="size-3.5" />
              {isSecondaryActive && (
                <span className="absolute inset-x-3 -bottom-[calc(1rem+1px)] h-0.5 rounded-full bg-gradient-brand" />
              )}
            </DropdownMenuTrigger>
            <DropdownMenuContent className="min-w-48">
              {SECONDARY_ROUTES.map((item) => {
                const isActive = item.match(pathname);
                return (
                  <DropdownMenuItem
                    key={item.href}
                    render={<Link href={item.href} />}
                    className={cn("justify-between", isActive && "bg-primary/10 font-semibold text-primary")}
                  >
                    {item.label}
                    {(item.href === "/practice/review" || item.href === "/practice/adaptive") && (
                      <DueBadge count={dueCount} />
                    )}
                  </DropdownMenuItem>
                );
              })}
            </DropdownMenuContent>
          </DropdownMenu>
        </nav>

        <div className="flex h-9 shrink-0 items-center ms-2">
          {CLERK_ENABLED ? <ClerkAuthSection /> : <GuestModeBadge />}
        </div>
      </div>
    </header>
  );
}
