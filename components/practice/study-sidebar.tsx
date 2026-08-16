"use client";

import Link from "next/link";
import { cn } from "@/lib/utils";
import { PRACTICE_TOPIC_TREE } from "@/lib/topics";
import type { Section } from "@/types";

const SECTION_LABELS: Record<Section, string> = {
  quant: "כמותי",
  verbal: "מילולי",
  english: "אנגלית",
};

const SECTIONS: Section[] = ["quant", "verbal", "english"];

interface StudySidebarProps {
  currentSection: Section;
  currentTopic?: string;
}

/** "תוכן הלימוד" — the topic tree for all three sections, with the current
 * section's topics expanded so students can jump between units without
 * leaving the practice flow. Hidden below `lg` to keep small screens
 * distraction-free; PracticeSession only widens its layout when this is
 * actually rendered (see the `sidebar` prop there).
 *
 * Reads the fixed canonical taxonomy (lib/topics.ts), not whatever topic
 * strings happen to exist in the seeded question bank — see that file's
 * doc-comment for why. */
export function StudySidebar({ currentSection, currentTopic }: StudySidebarProps) {
  return (
    <aside className="hidden shrink-0 lg:block lg:w-60">
      <div className="sticky top-24 flex flex-col gap-4 rounded-xl border border-sidebar-border bg-sidebar p-4">
        <h2 className="px-2 text-sm font-semibold text-sidebar-foreground">תוכן הלימוד</h2>

        <div className="flex flex-col gap-3">
          {SECTIONS.map((section) => {
            const isCurrentSection = section === currentSection;
            const sectionTopics = PRACTICE_TOPIC_TREE[section];

            return (
              <div key={section} className="flex flex-col gap-1">
                <Link
                  href={`/practice/${section}`}
                  className={cn(
                    "rounded-lg px-2 py-1.5 text-sm font-medium transition",
                    isCurrentSection
                      ? "bg-sidebar-primary text-sidebar-primary-foreground"
                      : "text-sidebar-foreground hover:bg-sidebar-accent hover:text-sidebar-accent-foreground"
                  )}
                >
                  {SECTION_LABELS[section]}
                </Link>

                {isCurrentSection && (
                  <div className="flex flex-col gap-0.5 border-e-2 border-sidebar-border pe-3 ms-2">
                    {sectionTopics.map((topic) => {
                      const isActive = topic === currentTopic;
                      return (
                        <Link
                          key={topic}
                          href={`/practice/${section}?topic=${encodeURIComponent(topic)}`}
                          className={cn(
                            "rounded-lg px-2 py-1 text-sm transition",
                            isActive
                              ? "bg-sidebar-accent font-medium text-sidebar-accent-foreground"
                              : "text-muted-foreground hover:bg-sidebar-accent/60 hover:text-sidebar-accent-foreground"
                          )}
                        >
                          {topic}
                        </Link>
                      );
                    })}
                  </div>
                )}
              </div>
            );
          })}
        </div>
      </div>
    </aside>
  );
}
