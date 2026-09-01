"use client";

import { useEffect, useRef, useState } from "react";
import { Loader2, MessageCircle, Send, X } from "lucide-react";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { MathText } from "@/components/practice/math-text";
import { MarkdownText } from "@/components/practice/markdown-text";
import type { Question, SelfReportedError } from "@/types";

interface ChatMessage {
  role: "user" | "assistant";
  content: string;
}

interface TutorChatDrawerProps {
  question: Question;
  chosenAnswer: number | null;
  selfReportedError: SelfReportedError | null;
}

export function TutorChatDrawer({ question, chosenAnswer, selfReportedError }: TutorChatDrawerProps) {
  const [open, setOpen] = useState(false);
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [input, setInput] = useState("");
  const [loading, setLoading] = useState(false);
  const scrollRef = useRef<HTMLDivElement>(null);
  // Unlike question.body/explanation, the tutor always replies in Hebrew
  // regardless of question.section (see app/api/tutor/route.ts's system
  // prompt) — no dir="ltr" needed here even for English-section questions.

  useEffect(() => {
    scrollRef.current?.scrollTo({ top: scrollRef.current.scrollHeight, behavior: "smooth" });
  }, [messages, loading]);

  async function handleSend() {
    const text = input.trim();
    if (!text || loading) return;

    const nextMessages: ChatMessage[] = [...messages, { role: "user", content: text }];
    setMessages(nextMessages);
    setInput("");
    setLoading(true);

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
          messages: nextMessages,
        }),
      });
      const data = await res.json();
      setMessages((prev) => [...prev, { role: "assistant", content: data.reply ?? "אירעה שגיאה. נסו שוב." }]);
    } catch {
      setMessages((prev) => [...prev, { role: "assistant", content: "אירעה שגיאה. נסו שוב." }]);
    } finally {
      setLoading(false);
    }
  }

  return (
    <>
      <Button
        onClick={() => setOpen(true)}
        size="lg"
        className="fixed bottom-6 end-6 z-20 gap-2 rounded-full shadow-lg"
      >
        <MessageCircle className="size-5" />
        שאלו את המאמן
      </Button>

      {open && (
        <div
          className="fixed inset-0 z-30 flex justify-end bg-black/20"
          onClick={() => setOpen(false)}
        >
          <div
            className="flex h-full w-full max-w-md flex-col bg-background shadow-xl"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-center justify-between border-b border-border px-4 py-3">
              <h2 className="text-base font-semibold">מאמן ה-AI האישי שלך</h2>
              <button
                onClick={() => setOpen(false)}
                aria-label="סגירה"
                className="flex size-8 items-center justify-center rounded-full text-muted-foreground transition hover:bg-muted hover:text-foreground"
              >
                <X className="size-5" />
              </button>
            </div>

            <div ref={scrollRef} className="flex-1 overflow-y-auto px-4 py-4">
              {messages.length === 0 && (
                <p className="text-sm text-muted-foreground">
                  שאלו כל שאלה על השאלה הנוכחית — למשל &quot;למה התשובה הזו לא
                  נכונה?&quot; או &quot;תסביר לי את זה שוב&quot;.
                </p>
              )}
              <div className="flex flex-col gap-3">
                {messages.map((m, i) => (
                  <div
                    key={i}
                    className={cn(
                      "max-w-[85%] rounded-xl px-3 py-2 text-sm",
                      m.role === "user"
                        ? "self-end bg-primary text-primary-foreground"
                        : "self-start bg-muted text-foreground"
                    )}
                  >
                    {m.role === "assistant" ? <MarkdownText text={m.content} /> : <MathText text={m.content} />}
                  </div>
                ))}
                {loading && (
                  <div className="flex items-center gap-2 self-start rounded-xl bg-muted px-3 py-2 text-sm text-muted-foreground">
                    <Loader2 className="size-4 animate-spin" />
                    חושב...
                  </div>
                )}
              </div>
            </div>

            <div className="flex items-center gap-2 border-t border-border p-3">
              <input
                value={input}
                onChange={(e) => setInput(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === "Enter" && !e.shiftKey) {
                    e.preventDefault();
                    handleSend();
                  }
                }}
                placeholder="שאלו את המאמן..."
                className="flex-1 rounded-lg border border-border bg-background px-3 py-2 text-sm outline-none focus:border-primary"
              />
              <Button size="icon" onClick={handleSend} disabled={loading || !input.trim()}>
                <Send className="size-4" />
              </Button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
