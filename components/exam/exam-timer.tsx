"use client";

import { useEffect, useRef, useState } from "react";
import { cn } from "@/lib/utils";

interface ExamTimerProps {
  totalSeconds: number;
  onExpire: () => void;
}

function formatTime(totalSeconds: number) {
  const m = Math.floor(totalSeconds / 60)
    .toString()
    .padStart(2, "0");
  const s = (totalSeconds % 60).toString().padStart(2, "0");
  return `${m}:${s}`;
}

const LOW_TIME_THRESHOLD_SECONDS = 120;

export function ExamTimer({ totalSeconds, onExpire }: ExamTimerProps) {
  const [remaining, setRemaining] = useState(totalSeconds);
  // Keeps the interval effect stable (empty deps) while always calling the
  // latest onExpire — a fresh closure every render otherwise. Refs must only
  // be written outside render, so the sync happens in its own effect.
  const onExpireRef = useRef(onExpire);
  useEffect(() => {
    onExpireRef.current = onExpire;
  }, [onExpire]);

  useEffect(() => {
    const interval = setInterval(() => {
      setRemaining((r) => {
        if (r <= 1) {
          clearInterval(interval);
          onExpireRef.current();
          return 0;
        }
        return r - 1;
      });
    }, 1000);
    return () => clearInterval(interval);
  }, []);

  const isLow = remaining <= LOW_TIME_THRESHOLD_SECONDS;

  return (
    <div
      dir="ltr"
      className={cn(
        "rounded-full px-3 py-1 text-sm font-semibold tabular-nums transition-colors",
        isLow ? "bg-red-500/10 text-red-600 dark:text-red-400" : "bg-muted text-foreground"
      )}
    >
      {formatTime(remaining)}
    </div>
  );
}
