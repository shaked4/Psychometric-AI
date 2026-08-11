import { Clock } from "lucide-react";
import { cn } from "@/lib/utils";
import { SECTION_LABELS, getStrengthLevel, type StrengthLevel } from "@/lib/stats";
import type { TopicMasteryEntry } from "@/lib/mastery";
import type { Section } from "@/types";

const STRENGTH_EMOJI: Record<StrengthLevel, string> = {
  high: "🟢",
  medium: "🟡",
  low: "🔴",
  none: "⚪",
};

const BAR_COLOR: Record<StrengthLevel, string> = {
  high: "bg-green-500",
  medium: "bg-yellow-500",
  low: "bg-red-500",
  none: "bg-muted-foreground/20",
};

interface TopicMasteryCardProps {
  section: Section;
  topics: TopicMasteryEntry[];
}

export function TopicMasteryCard({ section, topics }: TopicMasteryCardProps) {
  return (
    <div className="flex flex-col gap-4 rounded-xl border border-border bg-card p-5 shadow-sm">
      <h3 className="text-base font-semibold text-card-foreground">{SECTION_LABELS[section]}</h3>

      <div className="flex flex-col gap-3">
        {topics.map((topic) => {
          const level = getStrengthLevel(topic.accuracy, topic.attemptCount);
          return (
            <div key={topic.subtopic} className="flex flex-col gap-1.5">
              <div className="flex items-center justify-between gap-2 text-sm">
                <span className="flex items-center gap-1.5 text-card-foreground">
                  <span>{STRENGTH_EMOJI[level]}</span>
                  {topic.subtopic}
                </span>
                <span className="flex items-center gap-1.5 text-xs text-muted-foreground">
                  {topic.dueReviewCount > 0 && (
                    <span className="flex items-center gap-1 rounded-full bg-primary/10 px-1.5 py-0.5 text-primary">
                      <Clock className="size-3" />
                      {topic.dueReviewCount} לחזרה
                    </span>
                  )}
                  {topic.attemptCount === 0 ? "טרם תורגל" : `${topic.accuracy}%`}
                </span>
              </div>
              <div className="h-1.5 w-full overflow-hidden rounded-full bg-muted">
                <div
                  className={cn("h-full rounded-full transition-[width] duration-300", BAR_COLOR[level])}
                  style={{ width: `${topic.attemptCount === 0 ? 0 : topic.accuracy}%` }}
                />
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
