import Link from "next/link";

export interface BreadcrumbItem {
  label: string;
  href?: string;
}

/** Plain "/" separators (matching "בית / חשיבה כמותית / תרגול נושאי")
 * deliberately avoid directional chevron icons, which need mirroring in
 * RTL and are easy to get backwards. */
export function Breadcrumbs({ items }: { items: BreadcrumbItem[] }) {
  return (
    <nav aria-label="ניווט פירורי לחם" className="flex flex-wrap items-center gap-1.5 text-sm">
      {items.map((item, i) => (
        <span key={i} className="flex items-center gap-1.5">
          {i > 0 && <span className="text-border">/</span>}
          {item.href ? (
            <Link href={item.href} className="text-muted-foreground underline-offset-4 hover:text-primary hover:underline">
              {item.label}
            </Link>
          ) : (
            <span className="font-medium text-foreground">{item.label}</span>
          )}
        </span>
      ))}
    </nav>
  );
}
