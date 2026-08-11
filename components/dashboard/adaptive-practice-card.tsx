import Link from "next/link";
import { Sparkles } from "lucide-react";
import { buttonVariants } from "@/components/ui/button";

interface AdaptivePracticeCardProps {
  weakTopicCount: number;
  dueReviewCount: number;
}

/** Surfaces /practice/adaptive — the mode that combines due spaced-repetition
 * questions with freshly-generated reinforcement for subtopics under the
 * 60% accuracy threshold (lib/mastery.ts). Kept as its own card rather than
 * folded into ReviewQueueCard since it's a materially different mode
 * (injects new AI questions, not just resurfacing old ones). */
export function AdaptivePracticeCard({ weakTopicCount, dueReviewCount }: AdaptivePracticeCardProps) {
  const hasWork = weakTopicCount > 0 || dueReviewCount > 0;

  return (
    <div className="flex flex-col gap-4 rounded-xl border border-border bg-card p-6 shadow-sm sm:flex-row sm:items-center sm:justify-between">
      <div className="flex items-center gap-3">
        <Sparkles className="size-6 shrink-0 text-primary" />
        <div>
          <h3 className="text-base font-semibold text-card-foreground">תרגול אדפטיבי</h3>
          <p className="mt-1 text-sm text-muted-foreground">
            {hasWork
              ? `${weakTopicCount} נושאים עם דיוק מתחת ל-60%, ${dueReviewCount} שאלות לחזרה — מוכן לתרגול ממוקד.`
              : "אין כרגע נושאים חלשים או שאלות לחזרה — התרגול האדפטיבי יתמלא ברגע שיהיה מה לחזק."}
          </p>
        </div>
      </div>

      <Link
        href="/practice/adaptive"
        className={buttonVariants({ size: "lg", variant: hasWork ? "default" : "outline" })}
      >
        לתרגול האדפטיבי
      </Link>
    </div>
  );
}
