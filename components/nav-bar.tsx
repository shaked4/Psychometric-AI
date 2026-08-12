"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { MoreHorizontal } from "lucide-react";
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

/** Only the destinations a brand-new student needs on day one stay in the
 * always-visible row. Everything more advanced (analytics, raw history,
 * AI-custom/adaptive/spaced-repetition practice variants, essay) collapses
 * into the "עוד" menu below — most of it is reachable from the Dashboard's
 * own cards anyway, so nothing is actually lost, just decluttered. */
const CORE_ROUTES = [
  { href: "/", label: "בית", match: (p: string) => p === "/" },
  {
    href: "/practice/quant",
    label: "תרגול",
    match: (p: string) => p.startsWith("/practice") && !MORE_ROUTES_MATCH.some((r) => p.startsWith(r)),
  },
  { href: "/exam/quant", label: "בחינות", match: (p: string) => p.startsWith("/exam") },
  { href: "/dashboard", label: "לוח בקרה", match: (p: string) => p.startsWith("/dashboard") },
];

const MORE_ROUTES_MATCH = ["/practice/review", "/practice/adaptive", "/practice/custom"];

const MORE_ROUTES = [
  { href: "/cheatsheets", label: "גיליון נוסחאות" },
  { href: "/practice/review", label: "חזרה מרווחת" },
  { href: "/practice/adaptive", label: "תרגול אדפטיבי" },
  { href: "/practice/custom", label: "תרגול מותאם AI" },
  { href: "/essay", label: "מטלת כתיבה" },
  { href: "/history", label: "תחקור שאלות" },
  { href: "/post-mortem", label: "תחקור מעמיק" },
  { href: "/profile", label: "פרופיל" },
];

function DueBadge({ count }: { count: number }) {
  if (count <= 0) return null;
  return (
    <span className="ms-1.5 inline-flex min-w-5 items-center justify-center rounded-full bg-primary px-1.5 py-0.5 text-[10px] font-bold leading-none text-primary-foreground">
      {count}
    </span>
  );
}

export function NavBar() {
  const pathname = usePathname();
  const attempts = useAttempts();
  const dueCount = computeReviewQueue(attempts).dueToday.length;
  const moreActive = MORE_ROUTES.some((item) => pathname.startsWith(item.href));

  return (
    <header className="sticky top-0 z-10 border-b border-border bg-background/95 backdrop-blur">
      <div className="mx-auto flex max-w-5xl flex-wrap items-center justify-between gap-3 px-6 py-4">
        <Link href="/" className="text-lg font-bold tracking-tight">
          פסיכומטרי <span className="text-primary">AI</span>
        </Link>

        <nav className="flex flex-wrap items-center gap-1">
          {CORE_ROUTES.map((item) => (
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
            </Link>
          ))}

          <DropdownMenu>
            <DropdownMenuTrigger
              className={cn(
                "flex items-center rounded-lg px-3.5 py-2 text-sm font-medium transition",
                moreActive
                  ? "bg-primary/10 font-semibold text-primary"
                  : "text-muted-foreground hover:bg-muted/60 hover:text-foreground"
              )}
            >
              <MoreHorizontal className="size-4" />
              <span className="sr-only">עוד</span>
              <DueBadge count={dueCount} />
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end" className="min-w-44">
              {MORE_ROUTES.map((item) => (
                <DropdownMenuItem key={item.href} render={<Link href={item.href} />}>
                  {item.label}
                  {(item.href === "/practice/review" || item.href === "/practice/adaptive") && (
                    <DueBadge count={dueCount} />
                  )}
                </DropdownMenuItem>
              ))}
            </DropdownMenuContent>
          </DropdownMenu>
        </nav>

        <div className="flex shrink-0 items-center gap-3">
          {CLERK_ENABLED ? <ClerkAuthSection /> : <GuestModeBadge />}
        </div>
      </div>
    </header>
  );
}
