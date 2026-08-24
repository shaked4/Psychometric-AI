import Link from "next/link";
import { Sparkles } from "lucide-react";
import { buttonVariants } from "@/components/ui/button";
import { cn } from "@/lib/utils";

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
    <div className="surface-card-interactive flex h-full flex-col gap-4 p-6">
      <span className="flex size-10 shrink-0 items-center justify-center rounded-lg bg-gradient-brand text-primary-foreground shadow-sm">
        <Sparkles className="size-5" />
      </span>
      <div className="flex-1">
        <h3 className="text-base font-semibold text-card-foreground">תרגול אדפטיבי</h3>
        <p className="mt-1 text-sm text-muted-foreground">
          {hasWork
            ? `${weakTopicCount} נושאים עם דיוק מתחת ל-60%, ${dueReviewCount} שאלות לחזרה — מוכן לתרגול ממוקד.`
            : "אין כרגע נושאים חלשים או שאלות לחזרה — התרגול האדפטיבי יתמלא ברגע שיהיה מה לחזק."}
        </p>
      </div>

      <Link
        href="/practice/adaptive"
        className={cn(buttonVariants({ size: "lg", variant: hasWork ? "default" : "outline" }), "self-start")}
      >
        לתרגול האדפטיבי
      </Link>
    </div>
  );
}
