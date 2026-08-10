"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { cn } from "@/lib/utils";

const NAV_ITEMS = [
  { href: "/", label: "בית", match: (p: string) => p === "/" },
  { href: "/dashboard", label: "לוח בקרה", match: (p: string) => p.startsWith("/dashboard") },
  { href: "/history", label: "תחקור שאלות", match: (p: string) => p.startsWith("/history") },
  { href: "/practice/quant", label: "תרגול", match: (p: string) => p.startsWith("/practice") },
];

export function NavBar() {
  const pathname = usePathname();

  return (
    <header className="sticky top-0 z-10 border-b border-border bg-background/95 backdrop-blur">
      <div className="mx-auto flex max-w-5xl items-center justify-between px-6 py-4">
        <Link href="/" className="text-lg font-bold tracking-tight">
          פסיכומטרי <span className="text-primary">AI</span>
        </Link>

        <nav className="flex items-center gap-1">
          {NAV_ITEMS.map((item) => (
            <Link
              key={item.href}
              href={item.href}
              className={cn(
                "rounded-lg px-3.5 py-2 text-sm font-medium transition",
                item.match(pathname)
                  ? "bg-muted text-foreground"
                  : "text-muted-foreground hover:bg-muted/60 hover:text-foreground"
              )}
            >
              {item.label}
            </Link>
          ))}
        </nav>
      </div>
    </header>
  );
}
