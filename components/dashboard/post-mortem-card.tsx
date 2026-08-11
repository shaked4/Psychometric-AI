import Link from "next/link";
import { Microscope } from "lucide-react";
import { buttonVariants } from "@/components/ui/button";

interface PostMortemCardProps {
  totalIncorrect: number;
  totalTagged: number;
}

export function PostMortemCard({ totalIncorrect, totalTagged }: PostMortemCardProps) {
  return (
    <div className="flex flex-col gap-4 rounded-xl border border-border bg-card p-6 shadow-sm sm:flex-row sm:items-center sm:justify-between">
      <div className="flex items-center gap-3">
        <Microscope className="size-6 shrink-0 text-primary" />
        <div>
          <h3 className="text-base font-semibold text-card-foreground">תחקור מעמיק</h3>
          <p className="mt-1 text-sm text-muted-foreground">
            {totalIncorrect > 0
              ? `${totalTagged} מתוך ${totalIncorrect} טעויות מתויגות — תייגו את השאר וקבלו תובנות AI על הדפוסים שלכם.`
              : "עדיין אין טעויות לתחקור. המשיכו לתרגל!"}
          </p>
        </div>
      </div>

      <Link
        href="/post-mortem"
        className={buttonVariants({ size: "lg", variant: totalIncorrect > 0 ? "default" : "outline" })}
      >
        לתחקור המעמיק
      </Link>
    </div>
  );
}
