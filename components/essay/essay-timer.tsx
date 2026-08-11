"use client";

import { useEffect, useRef, useState } from "react";
import { Pause, Play, RotateCcw } from "lucide-react";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";

interface EssayTimerProps {
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

/** Unlike ExamTimer (which auto-starts and only ever counts down), this one
 * starts paused with explicit Start/Pause/Reset controls — a writing task
 * benefits from letting the student plan before the clock is actually
 * running, per this feature's spec. */
export function EssayTimer({ totalSeconds, onExpire }: EssayTimerProps) {
  const [remaining, setRemaining] = useState(totalSeconds);
  const [running, setRunning] = useState(false);

  const onExpireRef = useRef(onExpire);
  useEffect(() => {
    onExpireRef.current = onExpire;
  }, [onExpire]);

  useEffect(() => {
    if (!running) return;
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
  }, [running]);

  const expired = remaining === 0;
  const isLow = expired || remaining <= LOW_TIME_THRESHOLD_SECONDS;

  return (
    <div className="flex items-center gap-2">
      <div
        dir="ltr"
        className={cn(
          "rounded-full px-3 py-1 text-sm font-semibold tabular-nums transition-colors",
          isLow ? "bg-red-500/10 text-red-600 dark:text-red-400" : "bg-muted text-foreground"
        )}
      >
        {formatTime(remaining)}
      </div>

      {!expired && (
        <>
          <Button
            size="icon-sm"
            variant="outline"
            onClick={() => setRunning((r) => !r)}
            aria-label={running ? "השהה" : "התחל"}
          >
            {running ? <Pause className="size-3.5" /> : <Play className="size-3.5" />}
          </Button>
          <Button
            size="icon-sm"
            variant="outline"
            onClick={() => {
              setRunning(false);
              setRemaining(totalSeconds);
            }}
            aria-label="איפוס טיימר"
          >
            <RotateCcw className="size-3.5" />
          </Button>
        </>
      )}
    </div>
  );
}
