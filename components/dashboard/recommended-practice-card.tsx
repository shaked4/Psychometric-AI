import Link from "next/link";
import { ArrowLeft } from "lucide-react";
import { buttonVariants } from "@/components/ui/button";
import { SECTION_LABELS } from "@/lib/stats";
import type { Section } from "@/types";

interface RecommendedPracticeCardProps {
  section: Section | null;
  topic: string | null;
  accuracy: number | null;
}

export function RecommendedPracticeCard({ section, topic, accuracy }: RecommendedPracticeCardProps) {
  return (
    <div className="flex flex-col gap-4 rounded-xl border border-primary/30 bg-primary/5 p-6 shadow-sm sm:flex-row sm:items-center sm:justify-between">
      <div>
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

      <Link href={`/practice/${section ?? "quant"}`} className={buttonVariants({ size: "lg" })}>
        <ArrowLeft className="size-4" />
        תרגול מומלץ להיום
      </Link>
    </div>
  );
}
