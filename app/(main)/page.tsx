import Link from "next/link";
import { InlineMath } from "react-katex";
import { BookOpenCheck, Gauge, PenLine, Sparkles } from "lucide-react";
import { buttonVariants } from "@/components/ui/button";
import { cn } from "@/lib/utils";

const FEATURE_TILES = [
  {
    href: "/practice/adaptive",
    icon: Sparkles,
    title: "תרגול אדפטיבי מבוסס AI",
    description: "שאלות שנוצרות ומותאמות במיוחד לנקודות החולשה שלכם, בזמן אמת.",
  },
  {
    href: "/exam/quant",
    icon: BookOpenCheck,
    title: "3 מקצועות, סימולציה אחת",
    description: "כמותי, מילולי ואנגלית בתנאי זמן אמיתיים, בדיוק כמו במבחן.",
  },
  {
    href: "/essay",
    icon: PenLine,
    title: "מטלת כתיבה עם משוב AI",
    description: "הערכה מיידית על תוכן ולשון, כולל הצעות ניסוח ברמת המשפט.",
  },
  {
    href: "/dashboard",
    icon: Gauge,
    title: "מדד מוכנות אישי",
    description: "מעקב אחר דיוק, קצב ורציפות תרגול — במקום אחד, מתעדכן כל הזמן.",
  },
];

export default function Home() {
  return (
    <main className="flex flex-1 flex-col items-center gap-16 px-6 py-20">
      <div className="flex flex-col items-center gap-6 text-center">
        <span className="inline-flex items-center gap-1.5 rounded-full border border-primary/20 bg-gradient-to-l from-primary/10 to-[var(--chart-2)]/10 px-4 py-1.5 text-sm font-medium text-primary">
          <Sparkles className="size-3.5" />
          מאמן פסיכומטרי מבוסס בינה מלאכותית
        </span>

        <h1 className="max-w-2xl text-4xl font-bold tracking-tight sm:text-5xl">
          המאמן הפסיכומטרי{" "}
          <span className="text-glow-brand bg-gradient-brand bg-clip-text text-transparent">
            האישי שלך
          </span>
        </h1>

        <p className="max-w-xl text-balance text-lg text-muted-foreground">
          לא עוד בנק שאלות. פסיכומטרי AI לומד איך אתם חושבים, מזהה נקודות חוזק
          וחולשה, ובונה עבורכם תוכנית תרגול אישית — כמותי, מילולי ואנגלית.
        </p>

        <div className="flex flex-col items-center gap-2">
          <Link
            href="/practice/quick"
            className={cn(buttonVariants({ size: "lg" }), "px-6 text-base")}
          >
            התחילו תרגול יומי קצר
          </Link>
          <p className="text-sm text-muted-foreground">
            כמה שאלות, בלי לחץ, בלי שעון — רק כדי להתחיל להכיר אתכם
          </p>
        </div>
      </div>

      <div className="grid w-full max-w-4xl grid-cols-1 gap-4 sm:grid-cols-2">
        {FEATURE_TILES.map(({ href, icon: Icon, title, description }) => (
          <Link
            key={href}
            href={href}
            className="surface-card-interactive flex flex-col gap-3 p-5 text-start"
          >
            <span className="flex size-10 items-center justify-center rounded-lg bg-gradient-brand text-primary-foreground shadow-sm">
              <Icon className="size-5" />
            </span>
            <div>
              <p className="font-semibold text-card-foreground">{title}</p>
              <p className="mt-1 text-sm text-muted-foreground">{description}</p>
            </div>
          </Link>
        ))}
      </div>

      <div className="w-full max-w-md rounded-xl border border-border bg-card p-6 text-start shadow-sm">
        <p className="mb-3 text-sm font-medium text-muted-foreground">
          דוגמה: שאלה כמותית
        </p>
        <p className="mb-4 text-base text-card-foreground">
          מהו הפתרון הכללי של משוואה ריבועית מהצורה{" "}
          <bdi dir="ltr" className="inline-block">
            <InlineMath math="ax^2 + bx + c = 0" />
          </bdi>
          ?
        </p>
        <div dir="ltr" className="rounded-lg bg-muted px-4 py-3 text-start">
          <InlineMath math="x = \dfrac{-b \pm \sqrt{b^2 - 4ac}}{2a}" />
        </div>
      </div>
    </main>
  );
}
