import { NextRequest, NextResponse } from "next/server";
import Anthropic from "@anthropic-ai/sdk";
import { zodOutputFormat } from "@anthropic-ai/sdk/helpers/zod";
import { z } from "zod";
import type { Section, SelfReportedError } from "@/types";
import type { PostMortemStats } from "@/lib/post-mortem";
import { MIN_TAGGED_FOR_ANALYSIS } from "@/lib/post-mortem";

const MODEL = "claude-sonnet-5";

const SECTION_LABELS: Record<Section, string> = {
  quant: "כמותי",
  verbal: "מילולי",
  english: "אנגלית",
};

const ERROR_REASON_LABELS: Record<SelfReportedError, string> = {
  misread_question: "טעות בהבנת השאלה",
  calculation_error: "טעות חישוב / אלגברה",
  time_pressure: "ניהול זמנים / לחץ",
  knowledge_gap: "חוסר ידע בנושא",
  guessed: "ניחוש מושכל / ניחוש פראי",
};

const AnalysisSchema = z.object({
  summary: z.string(),
  recurringPatterns: z.array(z.object({ topic: z.string(), insight: z.string() })),
  timeLossWarnings: z.array(z.string()),
  actionItems: z.array(z.string()),
});

function formatMinutes(seconds: number): string {
  return (seconds / 60).toFixed(1);
}

/** Plain-Hebrew template narrator over the exact same stats-layer data the
 * AI path uses — the offline/no-key fallback, but a genuinely useful one:
 * every sentence is a direct readout of a computed number, not a generic
 * "AI unavailable" placeholder. Matches CLAUDE.md's stats/narrative-layer
 * principle even with no LLM in the loop. */
function buildTemplateAnalysis(stats: PostMortemStats): z.infer<typeof AnalysisSchema> {
  const recurringPatterns = stats.topicProfiles.slice(0, 4).map((p) => ({
    topic: `${p.topic} (${SECTION_LABELS[p.section]})`,
    insight: p.dominantTag
      ? `${p.dominantPct}% מהטעויות המתויגות שלכם ב${p.topic} הן מסוג "${ERROR_REASON_LABELS[p.dominantTag]}" (מתוך ${p.taggedCount} מתויגות מתוך ${p.incorrectCount} טעויות).`
      : `יש ${p.incorrectCount} טעויות ב${p.topic} שעדיין לא תויגו — תייגו אותן כדי לזהות כאן דפוס.`,
  }));

  const timeLossWarnings = stats.timeLossWarnings
    .slice(0, 3)
    .map(
      (w) =>
        `בנושא ${w.topic} (${SECTION_LABELS[w.section]}) אתם מבלים בממוצע ${formatMinutes(w.avgTimeSeconds)} דקות לשאלה — שקלו לסמן שאלות כאלה מוקדם יותר במקום להיתקע.`
    );

  const dominantOverall = stats.overallTagBreakdown[0] ?? null;
  const actionItems: string[] = [];
  if (dominantOverall) {
    actionItems.push(
      `הסיבה השכיחה ביותר לטעויות שלכם היא "${ERROR_REASON_LABELS[dominantOverall.tag]}" (${dominantOverall.pct}% מהמתויגות) — התאימו את התרגול הבא סביב זה.`
    );
  }
  if (stats.timeLossWarnings.length > 0) {
    actionItems.push("תרגלו עם טיימר קצר יותר כדי לתרגל קבלת החלטות מהירה בנושאים האיטיים שזוהו למעלה.");
  }
  if (stats.totalTagged < stats.totalIncorrect) {
    actionItems.push(
      `תייגו את שאר ${stats.totalIncorrect - stats.totalTagged} הטעויות הלא-מתויגות כדי לקבל תחקור מדויק יותר בפעם הבאה.`
    );
  }
  if (actionItems.length === 0) {
    actionItems.push("המשיכו לתרגל ולתייג טעויות — ככל שיצטברו יותר נתונים, התחקור כאן יהיה מדויק יותר.");
  }

  return {
    summary: `נותחו ${stats.totalIncorrect} טעויות (${stats.totalTagged} מהן מתויגות) על פני ${stats.topicProfiles.length} נושאים.`,
    recurringPatterns,
    timeLossWarnings,
    actionItems,
  };
}

function buildUserPrompt(stats: PostMortemStats): string {
  const lines: string[] = [];
  lines.push(`סה"כ שאלות שגויות: ${stats.totalIncorrect}, מתוכן מתויגות עם סיבת טעות: ${stats.totalTagged}.`);
  lines.push("");
  lines.push("פירוט טעויות לפי נושא (רק נושאים עם מספיק נתונים):");
  for (const p of stats.topicProfiles) {
    const breakdown = p.tagBreakdown.map((t) => `${ERROR_REASON_LABELS[t.tag]} ${t.pct}%`).join(", ");
    lines.push(
      `- ${p.topic} (${SECTION_LABELS[p.section]}): ${p.incorrectCount} טעויות, זמן ממוצע ${formatMinutes(p.avgTimeOnIncorrectSeconds)} דק' לטעות, תיוגים: ${breakdown || "אין תיוגים עדיין"}`
    );
  }
  lines.push("");
  lines.push("נושאים עם בזבוז זמן ניכר (זמן ממוצע גבוה לשאלה, כולל תשובות נכונות איטיות):");
  if (stats.timeLossWarnings.length === 0) lines.push("- אין נושאים כאלה כרגע.");
  for (const w of stats.timeLossWarnings) {
    lines.push(`- ${w.topic} (${SECTION_LABELS[w.section]}): ${formatMinutes(w.avgTimeSeconds)} דק' בממוצע, ${w.slowCount} שאלות`);
  }
  lines.push("");
  lines.push("התפלגות סיבות טעות כוללת (מתוך הטעויות המתויגות):");
  for (const t of stats.overallTagBreakdown) {
    lines.push(`- ${ERROR_REASON_LABELS[t.tag]}: ${t.pct}%`);
  }
  return lines.join("\n");
}

function buildSystemPrompt(): string {
  return `אתה מאמן פסיכומטרי אישי המנתח דפוסי טעויות של תלמיד/ה על סמך נתונים סטטיסטיים אמיתיים בלבד.

כללים מחייבים:
- הנתונים שתקבל הם מקור האמת היחיד. אסור לך להמציא נושאים, אחוזים או דפוסים שלא מופיעים בנתונים שסופקו.
- כתוב הכל בעברית חמה, מעודדת ותומכת — לעולם לא שיפוטית או מייאשת.
- recurringPatterns: עד 4 תובנות על דפוסי טעויות חוזרים, מבוססות אך ורק על הנתונים שסופקו. שדה topic יכלול את שם הנושא.
- timeLossWarnings: עד 3 משפטים על בזבוז זמן, מבוססים אך ורק על הנתונים שסופקו.
- actionItems: 3-5 צעדים מעשיים וממוקדים שהתלמיד/ה יכול/ה לנקוט כבר בתרגול הבא.
- summary: משפט אחד או שניים שמסכמים את התמונה הכללית בטון תומך.
- אם אין מספיק נתונים לתחום מסוים (למשל אין נושאים עם בזבוז זמן), החזר מערך ריק לשדה הזה במקום להמציא תוכן.`;
}

export async function POST(req: NextRequest) {
  let stats: PostMortemStats | undefined;
  try {
    const body = await req.json();
    stats = body?.stats;
  } catch {
    return NextResponse.json({ error: "Invalid JSON body" }, { status: 400 });
  }

  if (!stats || !Array.isArray(stats.topicProfiles) || !Array.isArray(stats.overallTagBreakdown)) {
    return NextResponse.json({ error: "Missing stats" }, { status: 400 });
  }

  if (stats.totalTagged < MIN_TAGGED_FOR_ANALYSIS) {
    return NextResponse.json({ insufficientData: true });
  }

  const apiKey = process.env.ANTHROPIC_API_KEY;
  if (!apiKey) {
    return NextResponse.json({ analysis: buildTemplateAnalysis(stats), offline: true });
  }

  const client = new Anthropic({ apiKey });

  try {
    const response = await client.messages.parse({
      model: MODEL,
      max_tokens: 2048,
      system: buildSystemPrompt(),
      messages: [{ role: "user", content: buildUserPrompt(stats) }],
      output_config: { format: zodOutputFormat(AnalysisSchema) },
    });

    if (response.stop_reason === "refusal" || !response.parsed_output) {
      return NextResponse.json({ analysis: buildTemplateAnalysis(stats), offline: true });
    }

    return NextResponse.json({ analysis: response.parsed_output });
  } catch (error) {
    console.error("Analyze mistakes error:", error);
    return NextResponse.json({ analysis: buildTemplateAnalysis(stats), offline: true });
  }
}
