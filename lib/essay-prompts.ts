export type EssayCategory = "social" | "ethical" | "philosophical" | "technological";

export interface EssayPrompt {
  id: string;
  category: EssayCategory;
  title: string;
  prompt: string;
}

export const ESSAY_CATEGORY_LABELS: Record<EssayCategory, string> = {
  social: "חברתי",
  ethical: "אתי",
  philosophical: "פילוסופי",
  technological: "טכנולוגי",
};

/** Official-style argumentative prompts for מטלת כתיבה — each poses a
 * genuine two-sided dilemma (never a one-sided "explain why X is good")
 * so a strong essay has to actually engage a counterargument, matching
 * what the content-axis rubric (see app/api/evaluate-essay/route.ts)
 * grades on. */
export const ESSAY_PROMPTS: EssayPrompt[] = [
  {
    id: "social-social-networks",
    category: "social",
    title: "רשתות חברתיות וקִרבה אנושית",
    prompt:
      "יש הטוענים כי הרשתות החברתיות מקרבות בין אנשים ומאפשרות קשרים שלא היו אפשריים בעבר, בעוד אחרים סבורים כי הן דווקא מעמיקות את תחושת הבדידות והניכור. הביעו עמדה מנומקת בסוגיה, תוך התייחסות לטיעון הנגד המרכזי.",
  },
  {
    id: "social-wealth-tax",
    category: "social",
    title: "מיסוי הון לצמצום פערים",
    prompt:
      "האם על המדינה להטיל מס מיוחד על בעלי הון גבוה לצורך צמצום פערים חברתיים-כלכליים? נמקו את עמדתכם והתייחסו לפחות לטיעון אחד המצדד בעמדה הנגדית.",
  },
  {
    id: "social-mandatory-service",
    category: "social",
    title: "שירות חובה לכלל האזרחים",
    prompt:
      "יש הסבורים כי שירות צבאי או אזרחי צריך להיות חובה לכלל האזרחים ללא יוצא מן הכלל, ויש החולקים נחרצות על כך. מהי עמדתכם, ומדוע?",
  },
  {
    id: "social-remote-work",
    category: "social",
    title: "עבודה מהבית מול המשרד",
    prompt:
      "יש הטוענים כי מעבר נרחב לעבודה מהבית משפר את איכות החיים ואת הפריון, ואחרים סבורים כי הוא פוגע בשיתוף הפעולה ובתחושת השייכות הארגונית. הציגו עמדה מנומקת.",
  },
  {
    id: "ethical-animal-testing",
    category: "ethical",
    title: "ניסויים בבעלי חיים",
    prompt:
      "האם מוצדק להשתמש בבעלי חיים לצורך ניסויים רפואיים שמטרתם קידום בריאות האדם? הציגו עמדה מנומקת תוך התייחסות לטיעון המרכזי של הצד שכנגד.",
  },
  {
    id: "ethical-euthanasia",
    category: "ethical",
    title: "המתת חסד",
    prompt:
      "יש הטוענים כי יש לאפשר המתת חסד לחולים במצב סופני המבקשים זאת מרצונם החופשי, ואחרים מתנגדים לכך מכל וכל. הביעו עמדה מנומקת בסוגיה.",
  },
  {
    id: "ethical-resource-priority",
    category: "ethical",
    title: "הקצאת משאבים מוגבלים",
    prompt:
      "האם מוסרי להעדיף אזרחי המדינה על פני פליטים וזרים כאשר מדובר בהקצאת משאבים ציבוריים מוגבלים, כגון דיור או טיפול רפואי? נמקו את עמדתכם.",
  },
  {
    id: "ethical-white-lies",
    category: "ethical",
    title: "שקרים לבנים",
    prompt:
      "האם ניתן להצדיק אמירת שקר \"לבן\" כאשר הוא נאמר לטובתו של הזולת, או שהאמת חייבת לגבור תמיד גם כשהיא פוגענית? הציגו עמדה מנומקת.",
  },
  {
    id: "philosophical-free-will",
    category: "philosophical",
    title: "חופש הבחירה",
    prompt:
      "יש הטוענים כי חופש הבחירה של האדם הוא במידה רבה אשליה, שכן החלטותינו מושפעות עמוקות ממוצא, מחינוך ומסביבה. אחרים סבורים כי לאדם יש בחירה חופשית אמיתית. מהי עמדתכם?",
  },
  {
    id: "philosophical-happiness-meaning",
    category: "philosophical",
    title: "אושר מול משמעות",
    prompt:
      "יש הטוענים כי השאיפה לאושר היא מטרת החיים העליונה, ואחרים סבורים כי חיפוש אחר משמעות חשוב ממנה, גם אם הוא כרוך בקושי. הביעו עמדה מנומקת.",
  },
  {
    id: "philosophical-individual-collective",
    category: "philosophical",
    title: "הפרט מול הכלל",
    prompt:
      "יש הסבורים כי טובת הכלל צריכה תמיד לגבור על זכויות הפרט בעת הצורך, ואחרים טוענים כי זכויות הפרט אינן ניתנות לוויתור בשום מצב. מהי עמדתכם?",
  },
  {
    id: "technological-ai-workforce",
    category: "technological",
    title: "בינה מלאכותית ושוק העבודה",
    prompt:
      "יש הטוענים כי הבינה המלאכותית תשפר משמעותית את איכות חיינו ותפנה אותנו לעיסוקים משמעותיים יותר, ואחרים חוששים מהשלכותיה על שוק העבודה ועל הפרטיות. מהי עמדתכם?",
  },
  {
    id: "technological-teen-smartphones",
    category: "technological",
    title: "טלפונים חכמים ובני נוער",
    prompt:
      "יש הקוראים להגביל בחוק את השימוש בטלפונים חכמים בקרב בני נוער, ואחרים סבורים כי ההחלטה צריכה להיוותר בידי ההורים בלבד. הציגו עמדה מנומקת.",
  },
  {
    id: "technological-content-moderation",
    category: "technological",
    title: "פיקוח על תוכן ברשת",
    prompt:
      "יש הסבורים כי יש לפקח באופן מחמיר על תוכן המתפרסם ברשתות החברתיות כדי למנוע נזק ציבורי, ואחרים רואים בכך פגיעה מסוכנת בחופש הביטוי. הביעו עמדה מנומקת.",
  },
  {
    id: "technological-genetic-editing",
    category: "technological",
    title: "עריכה גנטית של עוברים",
    prompt:
      "יש התומכים בשימוש בטכנולוגיות עריכה גנטית למניעת מחלות תורשתיות בעוברים, ואחרים חוששים מהשלכות רחבות יותר של התערבות כזו. נמקו את עמדתכם.",
  },
];

export function getEssayPrompt(id: string): EssayPrompt | undefined {
  return ESSAY_PROMPTS.find((p) => p.id === id);
}
