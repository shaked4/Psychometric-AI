"use client";

import { Button } from "@/components/ui/button";

interface SubmitConfirmModalProps {
  open: boolean;
  unansweredCount: number;
  onCancel: () => void;
  onConfirm: () => void;
}

/** Shared early-submission confirmation — used by both the exam simulation
 * (app/exam/[section]/page.tsx) and practice sessions
 * (components/practice/practice-session.tsx) so "submit even though you
 * haven't answered everything" has one consistent UI and wording instead of
 * two flows drifting apart. Only ever shown when there's at least one
 * unanswered question — callers submit immediately with no prompt otherwise. */
export function SubmitConfirmModal({ open, unansweredCount, onCancel, onConfirm }: SubmitConfirmModalProps) {
  if (!open) return null;

  return (
    <div
      className="fixed inset-0 z-40 flex items-center justify-center bg-black/40 p-4"
      onClick={onCancel}
    >
      <div
        role="alertdialog"
        aria-modal="true"
        className="flex w-full max-w-sm flex-col gap-4 rounded-xl border border-border bg-card p-6 shadow-xl"
        onClick={(e) => e.stopPropagation()}
      >
        <p className="text-base font-medium text-card-foreground">
          ישנן {unansweredCount} שאלות שלא נענו. האם אתה בטוח שברצונך להגיש?
        </p>
        <div className="flex justify-end gap-2">
          <Button variant="outline" onClick={onCancel}>
            המשך בתרגול
          </Button>
          <Button onClick={onConfirm}>הגש מכל מקום</Button>
        </div>
      </div>
    </div>
  );
}
