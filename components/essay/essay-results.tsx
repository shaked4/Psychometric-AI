"use client";

import { CheckCircle2, MessageSquareQuote, Sparkles, Target, WifiOff } from "lucide-react";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import type { EssayEvaluation } from "@/lib/essay-storage";

function scoreTone(score: number): { border: string; text: string } {
  if (score >= 5) return { border: "border-green-600/30 bg-green-500/5", text: "text-green-700 dark:text-green-400" };
  if (score >= 3) return { border: "border-amber-500/30 bg-amber-500/5", text: "text-amber-700 dark:text-amber-400" };
  return { border: "border-red-600/30 bg-red-500/5", text: "text-red-700 dark:text-red-400" };
}

function ScoreBadge({ label, score }: { label: string; score: number }) {
  const tone = scoreTone(score);
  return (
    <div className={cn("flex flex-col items-center gap-2 rounded-xl border p-5 text-center", tone.border)}>
      <span className="text-sm font-medium text-muted-foreground">{label}</span>
      <span className={cn("text-3xl font-bold tabular-nums", tone.text)}>
        {score}
        <span className="text-lg text-muted-foreground">/6</span>
      </span>
    </div>
  );
}

interface EssayResultsProps {
  promptTitle: string;
  essayText: string;
  evaluation: EssayEvaluation;
  wordCount: number;
  offline: boolean;
  onDone: () => void;
}

export function EssayResults({ promptTitle, essayText, evaluation, wordCount, offline, onDone }: EssayResultsProps) {
  const { contentScore, languageScore, estimatedPsychometricScore, strengths, improvements, reminiscentExamples } =
    evaluation;

  return (
    <div className="flex flex-col gap-6">
      <div className="flex flex-col gap-2">
        <h2 className="text-sm font-medium text-muted-foreground">{promptTitle}</h2>
        {/* Read-only, scrollable — lets the student cross-reference their
            own writing against the feedback/scores below without the
            editable-textarea affordance (cursor, focus ring) of the
            writing phase, which no longer applies once submitted. */}
        <div className="max-h-96 overflow-y-auto whitespace-pre-wrap rounded-xl border border-border bg-card p-5 text-sm leading-relaxed text-card-foreground shadow-sm">
          {essayText}
        </div>
      </div>

      {offline && (
        <div className="flex items-center gap-2 rounded-lg border border-amber-500/30 bg-amber-500/10 p-3 text-sm text-amber-700 dark:text-amber-400">
          <WifiOff className="size-4 shrink-0" />
          לא זיהינו מפתח Claude API פעיל, כך שההערכה שלהלן מבוססת על ניתוח היוריסטי (אורך, מבנה פסקאות, מילות
          קישור) במקום הערכת AI מלאה. ציוני התוכן והלשון הם קירוב גס בלבד ועשויים להיות שונים משמעותית
          מהערכה מלאה — הם לא בודקים את איכות הטיעון עצמו (הגיון, דיוק בדוגמאות, דיוק לשוני).
        </div>
      )}

      <div className="flex flex-col gap-4 rounded-xl border border-primary/30 bg-primary/5 p-6 shadow-sm">
        <div className="flex items-center gap-2 text-lg font-bold">
          <Target className="size-5 text-primary" />
          תוצאות מטלת הכתיבה
        </div>
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
          <ScoreBadge label="מימד התוכן" score={contentScore} />
          <ScoreBadge label="מימד הלשון" score={languageScore} />
          <div className="flex flex-col items-center gap-2 rounded-xl border border-border bg-card p-5 text-center">
            <span className="text-sm font-medium text-muted-foreground">ציון פסיכומטרי משוער</span>
            <span className="text-3xl font-bold tabular-nums">{estimatedPsychometricScore}</span>
          </div>
        </div>
        <p className="text-xs text-muted-foreground">
          * הציון המשוער הוא הערכה בלבד, המבוססת על קירוב ליניארי פשוט של שני צירי ההערכה (50-150) — לא ציון רשמי.
          החיבור כלל {wordCount} מילים.
        </p>
      </div>

      <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
        <div className="flex flex-col gap-3 rounded-xl border border-green-600/20 bg-card p-5 shadow-sm">
          <div className="flex items-center gap-2 text-base font-semibold text-green-700 dark:text-green-400">
            <CheckCircle2 className="size-5" />
            נקודות חוזק
          </div>
          <ul className="flex flex-col gap-2 text-sm text-card-foreground">
            {strengths.map((s, i) => (
              <li key={i} className="flex items-start gap-2">
                <span className="mt-1.5 size-1.5 shrink-0 rounded-full bg-green-600" />
                <span>{s}</span>
              </li>
            ))}
          </ul>
        </div>

        <div className="flex flex-col gap-3 rounded-xl border border-amber-500/20 bg-card p-5 shadow-sm">
          <div className="flex items-center gap-2 text-base font-semibold text-amber-700 dark:text-amber-400">
            <Sparkles className="size-5" />
            נקודות לשיפור
          </div>
          <ul className="flex flex-col gap-2 text-sm text-card-foreground">
            {improvements.map((s, i) => (
              <li key={i} className="flex items-start gap-2">
                <span className="mt-1.5 size-1.5 shrink-0 rounded-full bg-amber-500" />
                <span>{s}</span>
              </li>
            ))}
          </ul>
        </div>
      </div>

      {reminiscentExamples.length > 0 && (
        <div className="flex flex-col gap-3">
          <div className="flex items-center gap-2 text-base font-semibold">
            <MessageSquareQuote className="size-5 text-primary" />
            משוב ברמת המשפט
          </div>
          <div className="flex flex-col gap-3">
            {reminiscentExamples.map((ex, i) => (
              <div key={i} className="flex flex-col gap-2 rounded-xl border border-border bg-card p-4 text-sm shadow-sm">
                <p className="text-muted-foreground">
                  <span className="font-medium text-card-foreground">מהטקסט שלכם: </span>
                  &ldquo;{ex.original}&rdquo;
                </p>
                <p className="text-primary">
                  <span className="font-medium">הצעה: </span>
                  &ldquo;{ex.suggestion}&rdquo;
                </p>
                <p className="text-muted-foreground">{ex.comment}</p>
              </div>
            ))}
          </div>
        </div>
      )}

      <Button size="lg" onClick={onDone} className="self-end">
        חזרה לבנק הנושאים
      </Button>
    </div>
  );
}
