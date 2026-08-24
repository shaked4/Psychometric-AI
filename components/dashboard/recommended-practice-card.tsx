import Link from "next/link";
import { ArrowLeft, Target } from "lucide-react";
import { buttonVariants } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { SECTION_LABELS } from "@/lib/stats";
import type { Section } from "@/types";

interface RecommendedPracticeCardProps {
  section: Section | null;
  topic: string | null;
  accuracy: number | null;
}

export function RecommendedPracticeCard({ section, topic, accuracy }: RecommendedPracticeCardProps) {
  return (
    <div className="flex h-full flex-col gap-4 rounded-xl border border-primary/30 bg-primary/5 p-6 shadow-sm transition-all duration-200 hover:-translate-y-0.5 hover:shadow-md">
      <span className="flex size-10 shrink-0 items-center justify-center rounded-lg bg-gradient-brand text-primary-foreground shadow-sm">
        <Target className="size-5" />
      </span>
      <div className="flex-1">
        <h3 className="text-base font-semibold text-card-foreground">ההמלצה שלנו להיום</h3>
        <p className="mt-1 text-sm text-muted-foreground">
          {section && topic ? (
            <>
              מומלץ להתמקד ב<span className="font-medium text-card-foreground">{topic}</span> (
              {SECTION_LABELS[section]}) — הדיוק שלכם שם הוא {accuracy}%.
            </>
          ) : (
            "עדיין לא תרגלתם אף שאלה. בואו נתחיל מהכמותי!"
          )}
        </p>
      </div>

      <Link href={`/practice/${section ?? "quant"}`} className={cn(buttonVariants({ size: "lg" }), "self-start")}>
        <ArrowLeft className="size-4" />
        תרגול מומלץ להיום
      </Link>
    </div>
  );
}
