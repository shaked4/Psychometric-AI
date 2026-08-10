import Link from "next/link";
import { Brain } from "lucide-react";
import { buttonVariants } from "@/components/ui/button";

export function ReviewQueueCard({ dueCount }: { dueCount: number }) {
  return (
    <div className="flex flex-col gap-4 rounded-xl border border-border bg-card p-6 shadow-sm sm:flex-row sm:items-center sm:justify-between">
      <div className="flex items-center gap-3">
        <Brain className="size-6 shrink-0 text-primary" />
        <div>
          <h3 className="text-base font-semibold text-card-foreground">חזרה מרווחת</h3>
          <p className="mt-1 text-sm text-muted-foreground">
            {dueCount > 0
              ? `${dueCount} שאלות שטעיתם בהן בעבר ממתינות לחזרה היום.`
              : "אין כרגע שאלות שממתינות לחזרה — המשיכו לתרגל כרגיל."}
          </p>
        </div>
      </div>

      <Link href="/practice/review" className={buttonVariants({ size: "lg", variant: dueCount > 0 ? "default" : "outline" })}>
        {dueCount > 0 ? "לתרגול החזרה" : "לתור החזרה"}
      </Link>
    </div>
  );
}
