"use client";

import { useState } from "react";
import type { Question, SelfReportedError } from "@/types";

const GENERIC_ERROR = "אירעה שגיאה בטעינת ההסבר. נסו שוב מאוחר יותר.";

const EXPLAIN_DIFFERENTLY_PROMPT = "תסביר לי את זה בדרך אחרת, בבקשה.";

const TRAP_ANALYSIS_PROMPT =
  "אני רוצה להבין בדיוק מה המלכודת בשאלה הזו: למה התשובה שבחרתי הייתה מפתה, ומה סוג המלכודת " +
  "הספציפית כאן (הסחת דעת מכוונת, ניסוח שגורם לפרשנות שגויה, שאלה שגוזלת הרבה זמן, טעות חישוב " +
  "נפוצה וכו'). תן שם קצר וברור לסוג המלכודת, ואז הסבר בקצרה איך לזהות ולהימנע ממנה בפעם הבאה.";

export type TutorInsightMode = "explain" | "trap";

/** Shared client for one-shot calls to /api/tutor — used by the in-session
 * feedback panel and the post-mortem review list, so the request shape and
 * error handling live in exactly one place. Two prompt variants share the
 * same reply/loading state (only one insight is ever open at a time in the
 * UI, same as before this was generalized) — `mode` just lets callers label
 * whichever one produced the current reply. Both reuse /api/tutor's
 * existing system prompt unchanged: it's already grounded in the full
 * question context (chosen vs. correct answer, official explanation), so a
 * differently-framed user question needs no server-side changes. */
export function useTutorExplain(
  question: Question,
  chosenAnswer: number,
  selfReportedError: SelfReportedError | null
) {
  const [reply, setReply] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [mode, setMode] = useState<TutorInsightMode | null>(null);

  async function ask(nextMode: TutorInsightMode, userMessage: string) {
    setMode(nextMode);
    setLoading(true);
    setReply(null);
    try {
      const res = await fetch("/api/tutor", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          question: {
            section: question.section,
            topic: question.topic,
            subtopic: question.subtopic,
            body: question.body,
            passage: question.passage,
            choices: question.choices,
            correctAnswer: question.correctAnswer,
            explanation: question.explanation,
          },
          studentAnswer: chosenAnswer,
          selfReportedError,
          messages: [{ role: "user", content: userMessage }],
        }),
      });
      const data = await res.json();
      setReply(data.reply ?? GENERIC_ERROR);
    } catch {
      setReply(GENERIC_ERROR);
    } finally {
      setLoading(false);
    }
  }

  return {
    reply,
    loading,
    mode,
    explainDifferently: () => ask("explain", EXPLAIN_DIFFERENTLY_PROMPT),
    analyzeTrap: () => ask("trap", TRAP_ANALYSIS_PROMPT),
  };
}
