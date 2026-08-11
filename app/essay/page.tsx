"use client";

import { useEffect, useRef, useState } from "react";
import { AlertTriangle, Loader2, X } from "lucide-react";
import { NavBar } from "@/components/nav-bar";
import { EssayPromptPicker } from "@/components/essay/essay-prompt-picker";
import { EssayEditor, countEssayWords } from "@/components/essay/essay-editor";
import { EssayTimer } from "@/components/essay/essay-timer";
import { EssayResults } from "@/components/essay/essay-results";
import { EssayHistoryList } from "@/components/essay/essay-history-list";
import { Button } from "@/components/ui/button";
import { getEssayPrompt } from "@/lib/essay-prompts";
import {
  clearEssayDraft,
  getEssayDraft,
  saveEssayAttempt,
  saveEssayDraft,
  type EssayAttempt,
  type EssayEvaluation,
} from "@/lib/essay-storage";
import { useEssayAttempts } from "@/lib/use-essay-attempts";
import { pullEssayAttempts, pushEssayAttempt } from "@/lib/essay-cloud";

const ESSAY_DURATION_SECONDS = 30 * 60;
const DRAFT_SAVE_DEBOUNCE_MS = 600;

type Phase = "browse" | "writing" | "evaluating" | "results";

interface ResultView {
  evaluation: EssayEvaluation;
  wordCount: number;
  offline: boolean;
}

export default function EssayPage() {
  const [phase, setPhase] = useState<Phase>("browse");
  const [promptId, setPromptId] = useState<string | null>(null);
  const [essayText, setEssayText] = useState("");
  const [timeExpired, setTimeExpired] = useState(false);
  const [submitError, setSubmitError] = useState<string | null>(null);
  const [resultView, setResultView] = useState<ResultView | null>(null);

  const startedAtRef = useRef<number>(0);
  const draftSaveTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const essayAttempts = useEssayAttempts();
  const pulledRef = useRef(false);

  useEffect(() => {
    if (pulledRef.current) return;
    pulledRef.current = true;
    pullEssayAttempts();
  }, []);

  const prompt = promptId ? getEssayPrompt(promptId) : undefined;

  function handleSelectPrompt(id: string) {
    setPromptId(id);
    setEssayText(getEssayDraft(id));
    setTimeExpired(false);
    setSubmitError(null);
    startedAtRef.current = Date.now();
    setPhase("writing");
  }

  function handleEssayChange(text: string) {
    setEssayText(text);
    if (!promptId) return;
    if (draftSaveTimeoutRef.current) clearTimeout(draftSaveTimeoutRef.current);
    draftSaveTimeoutRef.current = setTimeout(() => saveEssayDraft(promptId, text), DRAFT_SAVE_DEBOUNCE_MS);
  }

  function handleExit() {
    setPhase("browse");
    setPromptId(null);
    setEssayText("");
  }

  async function handleSubmit() {
    if (!prompt || !promptId) return;
    setSubmitError(null);
    setPhase("evaluating");

    const timeTakenSeconds = Math.max(1, Math.round((Date.now() - startedAtRef.current) / 1000));

    try {
      const res = await fetch("/api/evaluate-essay", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ promptTitle: prompt.title, promptText: prompt.prompt, essayText }),
      });
      const data = await res.json();

      if (data.insufficientContent) {
        setSubmitError(`החיבור קצר מדי להערכה (${data.wordCount ?? 0} מילים) — כתבו לפחות 50 מילים ונסו שוב.`);
        setPhase("writing");
        return;
      }

      const evaluation: EssayEvaluation = data.evaluation;
      const wordCount: number = data.wordCount ?? countEssayWords(essayText);
      const offline = data.offline === true;

      const attempt: EssayAttempt = {
        id: crypto.randomUUID(),
        promptId,
        promptTitle: prompt.title,
        essayText,
        wordCount,
        timeTakenSeconds,
        offline,
        createdAt: new Date().toISOString(),
        ...evaluation,
      };

      saveEssayAttempt(attempt);
      pushEssayAttempt(attempt);
      clearEssayDraft(promptId);

      setResultView({ evaluation, wordCount, offline });
      setPhase("results");
    } catch {
      setSubmitError("אירעה שגיאה בהערכת החיבור. נסו שוב.");
      setPhase("writing");
    }
  }

  function handleViewPastEssay(attempt: EssayAttempt) {
    setResultView({ evaluation: attempt, wordCount: attempt.wordCount, offline: attempt.offline });
    setPhase("results");
  }

  function handleDoneWithResults() {
    setResultView(null);
    setPromptId(null);
    setEssayText("");
    setPhase("browse");
  }

  if (phase === "writing" && prompt) {
    const wordCount = countEssayWords(essayText);
    return (
      <div className="flex min-h-screen flex-col">
        <header className="sticky top-0 z-10 border-b border-border bg-background/95 backdrop-blur">
          <div className="mx-auto flex max-w-3xl flex-wrap items-center justify-between gap-3 px-6 py-4">
            <button
              type="button"
              onClick={handleExit}
              aria-label="יציאה ממטלת הכתיבה"
              className="flex size-8 shrink-0 items-center justify-center rounded-full text-muted-foreground transition hover:bg-muted hover:text-foreground"
            >
              <X className="size-5" />
            </button>
            <div className="min-w-0 truncate text-sm font-medium">{prompt.title}</div>
            <div className="flex items-center gap-2">
              <EssayTimer totalSeconds={ESSAY_DURATION_SECONDS} onExpire={() => setTimeExpired(true)} />
              <Button size="sm" onClick={handleSubmit}>
                הגישו
              </Button>
            </div>
          </div>
        </header>

        <main className="mx-auto flex w-full max-w-3xl flex-1 flex-col gap-6 px-6 py-8">
          <div className="rounded-xl border border-border bg-card p-5 shadow-sm">
            <p className="text-base leading-relaxed text-card-foreground">{prompt.prompt}</p>
          </div>

          {timeExpired && (
            <div className="flex items-center gap-2 rounded-lg border border-red-600/30 bg-red-500/10 p-3 text-sm text-red-700 dark:text-red-400">
              <AlertTriangle className="size-4 shrink-0" />
              הזמן שהוקצב הסתיים — ניתן עדיין להגיש את החיבור כפי שהוא.
            </div>
          )}

          {submitError && (
            <div className="flex items-center gap-2 rounded-lg border border-red-600/30 bg-red-500/10 p-3 text-sm text-red-700 dark:text-red-400">
              <AlertTriangle className="size-4 shrink-0" />
              {submitError}
            </div>
          )}

          <EssayEditor value={essayText} onChange={handleEssayChange} disabled={timeExpired} />

          <Button size="lg" onClick={handleSubmit} disabled={wordCount === 0} className="self-end">
            הגישו לבדיקה
          </Button>
        </main>
      </div>
    );
  }

  if (phase === "evaluating") {
    return (
      <div className="flex min-h-screen flex-col items-center justify-center gap-3 px-6 text-center text-muted-foreground">
        <Loader2 className="size-6 animate-spin" />
        <p>מעריכים את החיבור שלכם...</p>
      </div>
    );
  }

  if (phase === "results" && resultView) {
    return (
      <>
        <NavBar />
        <main className="mx-auto flex w-full max-w-3xl flex-col gap-6 px-6 py-10">
          <EssayResults
            evaluation={resultView.evaluation}
            wordCount={resultView.wordCount}
            offline={resultView.offline}
            onDone={handleDoneWithResults}
          />
        </main>
      </>
    );
  }

  return (
    <>
      <NavBar />
      <main className="mx-auto flex w-full max-w-4xl flex-col gap-10 px-6 py-10">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">מטלת כתיבה מילולית</h1>
          <p className="mt-1 text-muted-foreground">
            בחרו נושא חיבור מהבנק שלמטה, כתבו תוך 30 דקות (יעד: 300–500 מילים), והגישו לקבלת הערכה מבוססת
            AI לפי הצירים של מימד התוכן ומימד הלשון.
          </p>
        </div>

        {essayAttempts.length > 0 && (
          <div className="flex flex-col gap-3">
            <h2 className="text-lg font-semibold">חיבורים קודמים</h2>
            <EssayHistoryList attempts={essayAttempts} onSelect={handleViewPastEssay} />
          </div>
        )}

        <div className="flex flex-col gap-3">
          <h2 className="text-lg font-semibold">בחרו נושא</h2>
          <EssayPromptPicker onSelect={handleSelectPrompt} />
        </div>
      </main>
    </>
  );
}
