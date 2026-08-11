"use client";

import { PenLine } from "lucide-react";
import { Button } from "@/components/ui/button";
import { ESSAY_CATEGORY_LABELS, ESSAY_PROMPTS, type EssayCategory } from "@/lib/essay-prompts";

const CATEGORY_ORDER: EssayCategory[] = ["social", "ethical", "philosophical", "technological"];

interface EssayPromptPickerProps {
  onSelect: (promptId: string) => void;
}

export function EssayPromptPicker({ onSelect }: EssayPromptPickerProps) {
  return (
    <div className="flex flex-col gap-8">
      {CATEGORY_ORDER.map((category) => {
        const prompts = ESSAY_PROMPTS.filter((p) => p.category === category);
        return (
          <div key={category} className="flex flex-col gap-3">
            <h2 className="text-lg font-semibold">{ESSAY_CATEGORY_LABELS[category]}</h2>
            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
              {prompts.map((p) => (
                <div
                  key={p.id}
                  className="flex flex-col gap-3 rounded-xl border border-border bg-card p-5 shadow-sm"
                >
                  <p className="text-sm font-semibold text-card-foreground">{p.title}</p>
                  <p className="line-clamp-3 text-sm leading-relaxed text-muted-foreground">{p.prompt}</p>
                  <Button size="sm" className="gap-1.5 self-start" onClick={() => onSelect(p.id)}>
                    <PenLine className="size-3.5" />
                    התחילו כתיבה
                  </Button>
                </div>
              ))}
            </div>
          </div>
        );
      })}
    </div>
  );
}
