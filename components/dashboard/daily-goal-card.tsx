"use client";

import { Flame, Minus, Plus, Target } from "lucide-react";
import { cn } from "@/lib/utils";
import { useDailyGoalTargets } from "@/lib/use-daily-goal";
import { setDailyGoalTargets } from "@/lib/daily-goal";

interface DailyGoalCardProps {
  questionsToday: number;
  essaysToday: number;
  streakDays: number;
}

const RING_SIZE = 88;
const RING_STROKE = 8;
const RING_RADIUS = (RING_SIZE - RING_STROKE) / 2;
const RING_CIRCUMFERENCE = 2 * Math.PI * RING_RADIUS;

function Stepper({
  label,
  done,
  target,
  onDecrease,
  onIncrease,
}: {
  label: string;
  done: number;
  target: number;
  onDecrease: () => void;
  onIncrease: () => void;
}) {
  return (
    <div className="flex flex-wrap items-center justify-between gap-2 text-sm">
      <span className="text-muted-foreground">{label}</span>
      <div className="flex items-center gap-2">
        <button
          type="button"
          onClick={onDecrease}
          aria-label={`הפחתת יעד — ${label}`}
          className="flex size-6 items-center justify-center rounded-full border border-border text-muted-foreground transition hover:bg-muted"
        >
          <Minus className="size-3" />
        </button>
        <span dir="ltr" className="w-12 text-center font-medium tabular-nums">
          {done}/{target}
        </span>
        <button
          type="button"
          onClick={onIncrease}
          aria-label={`הגדלת יעד — ${label}`}
          className="flex size-6 items-center justify-center rounded-full border border-border text-muted-foreground transition hover:bg-muted"
        >
          <Plus className="size-3" />
        </button>
      </div>
    </div>
  );
}

/** Dependency-free SVG progress ring — same "no chart library" philosophy
 * as components/dashboard/score-progression-chart.tsx. Only the questions
 * goal drives the ring (the primary daily metric); the essay goal gets its
 * own compact stepper since it's usually a 0/1 binary rather than a
 * meaningful percentage. */
export function DailyGoalCard({ questionsToday, essaysToday, streakDays }: DailyGoalCardProps) {
  const targets = useDailyGoalTargets();
  const questionPct = targets.questions > 0 ? Math.min(100, (questionsToday / targets.questions) * 100) : 100;
  const dashOffset = RING_CIRCUMFERENCE * (1 - questionPct / 100);
  const goalMet = questionsToday >= targets.questions && essaysToday >= targets.essays;

  return (
    <div className="flex flex-col gap-5 rounded-xl border border-border bg-card p-6 shadow-sm sm:flex-row sm:items-center sm:gap-8">
      <div className="flex shrink-0 items-center gap-5">
        <div className="relative flex shrink-0 items-center justify-center" style={{ width: RING_SIZE, height: RING_SIZE }}>
          <svg width={RING_SIZE} height={RING_SIZE} className="-rotate-90">
            <circle
              cx={RING_SIZE / 2}
              cy={RING_SIZE / 2}
              r={RING_RADIUS}
              strokeWidth={RING_STROKE}
              className="fill-none stroke-muted"
            />
            <circle
              cx={RING_SIZE / 2}
              cy={RING_SIZE / 2}
              r={RING_RADIUS}
              strokeWidth={RING_STROKE}
              strokeLinecap="round"
              strokeDasharray={RING_CIRCUMFERENCE}
              strokeDashoffset={dashOffset}
              className={cn(
                "fill-none transition-[stroke-dashoffset] duration-500",
                goalMet ? "stroke-green-500" : "stroke-primary"
              )}
            />
          </svg>
          <span dir="ltr" className="absolute text-sm font-bold tabular-nums text-card-foreground">
            {questionsToday}/{targets.questions}
          </span>
        </div>

        {streakDays > 0 && (
          <div className="flex items-center gap-1.5 text-sm font-medium text-amber-600 dark:text-amber-400">
            <Flame className="size-4" />
            {streakDays} ימים ברצף
          </div>
        )}
      </div>

      <div className="flex flex-1 flex-col gap-3">
        <div className="flex items-center gap-2 text-sm font-semibold text-card-foreground">
          <Target className="size-4 text-primary" />
          יעד יומי
        </div>

        <Stepper
          label="שאלות היום"
          done={questionsToday}
          target={targets.questions}
          onDecrease={() => setDailyGoalTargets({ ...targets, questions: targets.questions - 5 })}
          onIncrease={() => setDailyGoalTargets({ ...targets, questions: targets.questions + 5 })}
        />
        <Stepper
          label="מטלות כתיבה היום"
          done={essaysToday}
          target={targets.essays}
          onDecrease={() => setDailyGoalTargets({ ...targets, essays: targets.essays - 1 })}
          onIncrease={() => setDailyGoalTargets({ ...targets, essays: targets.essays + 1 })}
        />

        {goalMet && (
          <p className="text-sm font-medium text-green-700 dark:text-green-400">
            כל הכבוד — עמדתם ביעד היומי! 🎉
          </p>
        )}
      </div>
    </div>
  );
}
