"use client";

import { useEffect, useState } from "react";
import { Loader2 } from "lucide-react";

const STEPS = [
  "קוראים ומנתחים את טקסט החיבור...",
  "בודקים את הלוגיקה ואת איכות הטיעונים...",
  "מעריכים אוצר מילים ומבנה תחבירי...",
  "מנסחים המלצות וציון סופי...",
];

const STEP_INTERVAL_MS = 2500;

/**
 * Cycles through STEPS one at a time instead of a single static line — a
 * live Claude evaluation regularly takes 20-40s end-to-end, so a loader
 * that visibly progresses through what's actually happening reads as
 * working, not stuck. Deliberately holds on the last step (and ~90%
 * progress) rather than looping back to the first once the interval
 * outlasts the steps — restarting the sequence mid-wait would read as the
 * process having reset, not continued; the bar only ever reaches 100% by
 * this component unmounting once the real response arrives.
 */
export function EssayEvaluationLoader() {
  const [stepIndex, setStepIndex] = useState(0);

  useEffect(() => {
    const interval = setInterval(() => {
      setStepIndex((i) => Math.min(i + 1, STEPS.length - 1));
    }, STEP_INTERVAL_MS);
    return () => clearInterval(interval);
  }, []);

  const progressPct = Math.round(((stepIndex + 1) / STEPS.length) * 90);

  return (
    <div className="flex min-h-screen flex-col items-center justify-center gap-4 px-6 text-center">
      <Loader2 className="size-6 animate-spin text-primary" />
      <p key={stepIndex} className="animate-in fade-in text-muted-foreground duration-500">
        {STEPS[stepIndex]}
      </p>
      <div className="h-1.5 w-56 overflow-hidden rounded-full bg-muted">
        <div
          className="h-full rounded-full bg-primary transition-[width] duration-700 ease-out"
          style={{ width: `${progressPct}%` }}
        />
      </div>
    </div>
  );
}
