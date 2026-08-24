import Link from "next/link";
import { Brain } from "lucide-react";
import { buttonVariants } from "@/components/ui/button";
import { cn } from "@/lib/utils";

export function ReviewQueueCard({ dueCount }: { dueCount: number }) {
  return (
    <div className="surface-card-interactive flex h-full flex-col gap-4 p-6">
      <span className="flex size-10 shrink-0 items-center justify-center rounded-lg bg-gradient-brand text-primary-foreground shadow-sm">
        <Brain className="size-5" />
      </span>
      <div className="flex-1">
        <h3 className="text-base font-semibold text-card-foreground">חזרה מרווחת</h3>
        <p className="mt-1 text-sm text-muted-foreground">
          {dueCount > 0
            ? `${dueCount} שאלות שטעיתם בהן בעבר ממתינות לחזרה היום.`
            : "אין כרגע שאלות שממתינות לחזרה — המשיכו לתרגל כרגיל."}
        </p>
      </div>

      <Link
        href="/practice/review"
        className={cn(buttonVariants({ size: "lg", variant: dueCount > 0 ? "default" : "outline" }), "self-start")}
      >
        {dueCount > 0 ? "לתרגול החזרה" : "לתור החזרה"}
      </Link>
    </div>
  );
}
