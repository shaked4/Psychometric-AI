"use client";

import { useState } from "react";
import type { Question, SelfReportedError } from "@/types";

const GENERIC_ERROR = "אירעה שגיאה בטעינת ההסבר. נסו שוב מאוחר יותר.";

/** Shared client for the "explain differently" one-shot call to /api/tutor —
 * used by both the in-session feedback panel and the history page, so the
 * request shape and error handling live in exactly one place. */
export function useTutorExplain(
  question: Question,
  chosenAnswer: number,
  selfReportedError: SelfReportedError | null
) {
  const [reply, setReply] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  async function explainDifferently() {
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
          messages: [{ role: "user", content: "תסביר לי את זה בדרך אחרת, בבקשה." }],
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

  return { reply, loading, explainDifferently };
}
