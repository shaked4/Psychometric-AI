import type { Question } from "@/types";

export const MOCK_QUESTIONS: Question[] = [
  // --- Quantitative ---
  {
    id: "quant-1",
    section: "quant",
    topic: "ממוצעים",
    subtopic: "ממוצע משוקלל",
    difficulty: 3,
    type: "mcq",
    body: "בכיתה יש 30 תלמידים. ציון הבנים הממוצע הוא 80, וציון הבנות הממוצע הוא 90. אם הממוצע הכללי של הכיתה הוא 84, כמה בנות יש בכיתה?",
    passage: null,
    choices: ["10", "12", "15", "18"],
    correctAnswer: 1,
    explanation:
      "נשתמש בשיטת המרחקים לממוצע משוקלל: המרחק בין הממוצע הכללי לממוצע הבנות הוא $90 - 84 = 6$, והמרחק בין הממוצע הכללי לממוצע הבנים הוא $84 - 80 = 4$. היחס בין מספר הבנים למספר הבנות שווה ליחס ההפוך של המרחקים: $\\dfrac{\\text{בנים}}{\\text{בנות}} = \\dfrac{6}{4} = \\dfrac{3}{2}$. מחלקים את 30 התלמידים ל-5 חלקים שווים ($3+2$), כך שכל חלק שווה ל-6 תלמידים: $3 \\times 6 = 18$ בנים ו-$2 \\times 6 = 12$ בנות. בדיקה: $\\dfrac{18 \\times 80 + 12 \\times 90}{30} = \\dfrac{2520}{30} = 84$. טעות נפוצה היא להפוך את היחס ולחשב לפי המרחקים ישירות במקום ההפוך שלהם.",
    media: null,
    createdAt: "2026-08-01T00:00:00.000Z",
  },
  {
    id: "quant-2",
    section: "quant",
    topic: "אלגברה",
    subtopic: "חזקות ושורשים",
    difficulty: 3,
    type: "mcq",
    body: "מהו הערך של $2^{3} \\cdot 2^{-1} \\cdot 4^{2}$?",
    passage: null,
    choices: ["$32$", "$64$", "$128$", "$16$"],
    correctAnswer: 1,
    explanation:
      "יש להעביר את כל הביטויים לבסיס משותף $2$: $4^2 = (2^2)^2 = 2^4$. כעת הביטוי הוא $2^{3} \\cdot 2^{-1} \\cdot 2^{4} = 2^{3-1+4} = 2^{6} = 64$. טעות נפוצה היא לחבר את החזקות בלי להמיר קודם את $4^2$ לבסיס $2$.",
    media: null,
    createdAt: "2026-08-01T00:00:00.000Z",
  },

  // --- Verbal (Hebrew) ---
  {
    id: "verbal-1",
    section: "verbal",
    topic: "הבנה והבעה",
    subtopic: "השלמת משפטים",
    difficulty: 3,
    type: "mcq",
    body: "השלימו את המשפט: למרות שהמומחים __________ את התכנית, ראש העירייה החליט __________ אותה וליישם אותה כמות שהיא.",
    passage: null,
    choices: [
      "שיבחו / לדחות",
      "מתחו ביקורת על / לאמץ",
      "תמכו / לבטל",
      "התעלמו מ / לשנות",
    ],
    correctAnswer: 1,
    explanation:
      "המילה 'כמות שהיא' בסוף המשפט מרמזת שהתכנית יושמה ללא שינויים — כלומר הפועל השני חייב להיות עקבי עם 'אימוץ', ולא עם דחייה, ביטול או שינוי. מכיוון שיש ניגוד ('למרות ש'), הפועל הראשון חייב לבטא עמדה שלילית כלפי התכנית. רק התשובה 'מתחו ביקורת על / לאמץ' עומדת בשני התנאים.",
    media: null,
    createdAt: "2026-08-01T00:00:00.000Z",
  },
  {
    id: "verbal-2",
    section: "verbal",
    topic: "חשיבה לוגית",
    subtopic: "היסק",
    difficulty: 3,
    type: "mcq",
    body: "בכיתה מסוימת, כל התלמידים שאוהבים מתמטיקה אוהבים גם פיזיקה. ידוע שדני לא אוהב פיזיקה. מה ניתן להסיק בוודאות?",
    passage: null,
    choices: ["דני אוהב מתמטיקה", "דני לא אוהב מתמטיקה", "דני אוהב פיזיקה", "לא ניתן להסיק דבר"],
    correctAnswer: 1,
    explanation:
      "הטענה 'כל מי שאוהב מתמטיקה אוהב גם פיזיקה' שקולה לוגית לטענה ההפוכה-נגדית: 'מי שלא אוהב פיזיקה, לא אוהב מתמטיקה'. מכיוון שדני לא אוהב פיזיקה, נובע בהכרח שדני לא אוהב מתמטיקה. זהו כלל יסוד בהיגיון (modus tollens) שחוזר הרבה בפרק ההיגיון.",
    media: null,
    createdAt: "2026-08-01T00:00:00.000Z",
  },

  // --- English ---
  {
    id: "english-1",
    section: "english",
    topic: "Sentence Completion",
    subtopic: "Contrast Structures",
    difficulty: 3,
    type: "mcq",
    body: "Despite the committee's initial ______, they eventually approved the proposal after minor revisions.",
    passage: null,
    choices: ["enthusiasm", "reluctance", "certainty", "indifference"],
    correctAnswer: 1,
    explanation:
      "The word 'Despite' signals a contrast between the blank and the outcome ('eventually approved'). Only 'reluctance' creates a logical contrast — the committee was hesitant at first, but approved the proposal anyway. 'Enthusiasm' or 'certainty' would not require the word 'Despite', and 'indifference' does not logically lead to eventual approval.",
    media: null,
    createdAt: "2026-08-01T00:00:00.000Z",
  },
  {
    id: "english-2",
    section: "english",
    topic: "Restatement",
    subtopic: "Meaning Preservation",
    difficulty: 3,
    type: "mcq",
    body: "Which of the following best restates the sentence: \"Although the results were disappointing, the research team remained optimistic about future experiments.\"",
    passage: null,
    choices: [
      "The research team's optimism about future experiments was unaffected by the disappointing results.",
      "The disappointing results made the research team pessimistic about future experiments.",
      "The research team was disappointed because future experiments seemed optimistic.",
      "Future experiments disappointed the research team despite their results.",
    ],
    correctAnswer: 0,
    explanation:
      "The original sentence states that despite disappointing results, the team stayed optimistic. Option A preserves this exact relationship. Option B reverses the meaning (pessimistic instead of optimistic). Options C and D scramble the logical relationship between the results and the team's outlook.",
    media: null,
    createdAt: "2026-08-01T00:00:00.000Z",
  },
];
