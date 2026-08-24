import Link from "next/link";
import { Microscope } from "lucide-react";
import { buttonVariants } from "@/components/ui/button";
import { cn } from "@/lib/utils";

interface PostMortemCardProps {
  totalIncorrect: number;
  totalTagged: number;
}

export function PostMortemCard({ totalIncorrect, totalTagged }: PostMortemCardProps) {
  return (
    <div className="surface-card-interactive flex h-full flex-col gap-4 p-6">
      <span className="flex size-10 shrink-0 items-center justify-center rounded-lg bg-gradient-brand text-primary-foreground shadow-sm">
        <Microscope className="size-5" />
      </span>
      <div className="flex-1">
        <h3 className="text-base font-semibold text-card-foreground">תחקור מעמיק</h3>
        <p className="mt-1 text-sm text-muted-foreground">
          {totalIncorrect > 0
            ? `${totalTagged} מתוך ${totalIncorrect} טעויות מתויגות — תייגו את השאר וקבלו תובנות AI על הדפוסים שלכם.`
            : "עדיין אין טעויות לתחקור. המשיכו לתרגל!"}
        </p>
      </div>

      <Link
        href="/post-mortem"
        className={cn(buttonVariants({ size: "lg", variant: totalIncorrect > 0 ? "default" : "outline" }), "self-start")}
      >
        לתחקור המעמיק
      </Link>
    </div>
  );
}
