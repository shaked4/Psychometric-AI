/**
 * Seeds 9 original English reading-comprehension questions — the "Reading
 * Comprehension" topic (lib/topics.ts's canonical taxonomy) had only 1
 * question before this, far below the ~10-question baseline every practice
 * topic should have. Each question has its own short, original, self-
 * contained passage (no two on closely related subjects) covering a mix of
 * main-idea, inference, author's tone/purpose, vocabulary-in-context, and
 * argument-weakening skills.
 *
 * Usage:
 *   npx tsx --env-file=.env.local scripts/seed-english-reading-comprehension.ts
 *
 * Requires NEXT_PUBLIC_SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY (see
 * .env.local.example). No ANTHROPIC_API_KEY needed.
 */

import { createClient, type SupabaseClient } from "@supabase/supabase-js";
import WS from "ws";
import type { Question } from "@/types";

if (typeof globalThis.WebSocket === "undefined") {
  (globalThis as { WebSocket?: unknown }).WebSocket = WS;
}

function getSupabaseAdminClient(): SupabaseClient | null {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!url || !serviceRoleKey) return null;
  return createClient(url, serviceRoleKey, { auth: { persistSession: false } });
}

type HardcodedQuestion = Omit<Question, "id" | "createdAt" | "type" | "media">;

const QUESTIONS: HardcodedQuestion[] = [
  {
    section: "english",
    topic: "Reading Comprehension",
    subtopic: "Main idea vs. supporting detail",
    difficulty: 3,
    passage:
      "When the German printer Johannes Gutenberg introduced his press around 1440, he did not, as popular legend often suggests, invent movable type from nothing. Movable metal type had already been used in Korea to print the Jikji, a collection of Buddhist teachings, in 1377 -- more than six decades earlier. What made Gutenberg's innovation transformative was not the isolated idea of individual, reusable characters, but the integration of that idea with an oil-based ink, a hand mold capable of casting type quickly and uniformly, and an adapted screw press borrowed from winemaking. This combination allowed printers to produce books faster and far more cheaply than scribes or Korean printers, whose methods remained comparatively slow and were never mechanized on an industrial scale. Gutenberg's true achievement, then, lay in assembling existing and new elements into a scalable system, not in conceiving of movable type as a concept.",
    body: "Which of the following best expresses the main idea of the passage?",
    choices: [
      "Gutenberg's press was inferior to Korean printing technology in overall design.",
      "The Jikji was printed in Korea in 1377 using movable metal type.",
      "Gutenberg's real contribution was combining existing and new techniques into a fast, scalable printing system, rather than inventing movable type itself.",
      "Movable type printing was invented independently in multiple regions of the world before spreading globally.",
    ],
    correctAnswer: 2,
    explanation:
      "The passage states directly that what made Gutenberg's innovation transformative \"was not the isolated idea... but the integration\" of ink, mold, and press into a fast system, which matches choice C. Choice A distorts the passage, which never claims Gutenberg's press was inferior overall, only that Korean methods stayed slower and unmechanized. Choice B is a true supporting detail, not the passage's main point. Choice D overreaches: the passage discusses only two instances (Korea and Germany), not multiple regions or a global spread.",
  },
  {
    section: "english",
    topic: "Reading Comprehension",
    subtopic: "Main idea vs. supporting detail",
    difficulty: 3,
    passage:
      "During an economic downturn, financial advisers commonly urge households to spend less and save more, and for an individual family this is sound advice: reduced spending shores up personal savings and guards against job loss. Yet economists have long observed a paradox when this behavior is adopted simultaneously by an entire population. If most households cut spending at once, businesses see falling revenue, respond by reducing production, and often lay off workers -- which lowers aggregate income and can leave total savings across the economy no higher, and sometimes lower, than before. What is rational for one household in isolation can therefore be self-defeating when generalized across millions of households at the same time, deepening the very downturn that prompted the initial caution. This dynamic, sometimes called the paradox of thrift, is one reason many economists argue that government spending should rise, not fall, during recessions -- to offset the collective pullback in private spending.",
    body: "Which of the following best expresses the main idea of the passage?",
    choices: [
      "Households should never reduce their spending during a recession.",
      "Individual saving during a downturn can reduce a household's personal financial risk.",
      "Behavior that is rational for a single household can produce a collectively self-defeating outcome when adopted economy-wide, which is why some economists favor increased government spending in recessions.",
      "Government spending is always more effective than private spending at ending recessions.",
    ],
    correctAnswer: 2,
    explanation:
      "The passage's central claim is that what is rational for one household \"can therefore be self-defeating when generalized across millions of households,\" and it links this directly to the case for government spending -- matching choice C. Choice A distorts the passage, which endorses individual saving as \"sound advice,\" not something to avoid. Choice B restates only the passage's opening detail about individual households, not its overall point. Choice D overgeneralizes: the passage says government spending should rise to \"offset\" private pullback, not that it is \"always more effective\" than private spending.",
  },
  {
    section: "english",
    topic: "Reading Comprehension",
    subtopic: "Inference",
    difficulty: 4,
    passage:
      "In 1968, psychologists John Darley and Bibb Latane staged a series of experiments in which participants believed they were having a discussion over an intercom with other participants, one of whom appeared to suffer a seizure partway through. When each participant believed they were the only other person on the call, nearly all of them left the room to seek help within a minute. But when participants believed several other people were also listening in, far fewer sought help quickly, and some did not act at all, even though the emergency sounded identical in every version of the experiment. Darley and Latane concluded that the mere belief that others are also present -- and might act instead -- can measurably delay or prevent an individual from helping, regardless of that individual's personal character or moral convictions. Later replications in different settings produced similar patterns, suggesting the effect was not limited to the original laboratory conditions or the specific emergency staged.",
    body: "Which of the following can most reasonably be inferred from the passage?",
    choices: [
      "Participants who believed they were the only listener were more compassionate people than those who believed others were listening.",
      "A person's likelihood of intervening in an emergency can be influenced by situational factors rather than solely by their individual personality.",
      "Darley and Latane's experiment proved that most people are unwilling to help strangers in an emergency.",
      "The intercom experiment has never been successfully repeated in real-world emergency situations.",
    ],
    correctAnswer: 1,
    explanation:
      "The passage states the delay in helping occurred \"regardless of that individual's personal character or moral convictions,\" implying the situation itself, not personality, drove the outcome -- supporting choice B. Choice A contradicts the passage, which explicitly attributes the difference to belief about others' presence, not to differing compassion. Choice C overstates the finding: nearly all participants helped when they believed they were alone, so the study does not show people are broadly \"unwilling\" to help. Choice D contradicts the passage, which says \"later replications in different settings produced similar patterns.\"",
  },
  {
    section: "english",
    topic: "Reading Comprehension",
    subtopic: "Inference",
    difficulty: 4,
    passage:
      "Astronomers searching for planets orbiting distant stars face an obvious obstacle: planets do not produce their own light, and the glare of their host star is typically billions of times brighter, making direct observation all but impossible with most instruments. The transit method sidesteps this problem by measuring a star's brightness continuously over time rather than trying to see the planet directly. If a planet's orbit happens to be aligned so that it passes directly between its star and an observer on Earth, the star's measured brightness dips slightly at regular intervals as the planet blocks a small fraction of the starlight. The size of the dip reveals the planet's diameter relative to its star, and the interval between dips reveals its orbital period. Because this method depends entirely on a fortunate alignment of the planet's orbital plane with Earth's line of sight, it can only detect a fraction of the planets that actually exist around surveyed stars.",
    body: "Which of the following can most reasonably be inferred from the passage?",
    choices: [
      "The transit method can detect every planet orbiting a star that astronomers survey.",
      "A star's brightness can never change unless a planet is passing in front of it.",
      "Many planets around surveyed stars go undetected by the transit method because their orbits are not aligned with Earth's line of sight.",
      "The transit method allows astronomers to directly photograph planets outside our solar system.",
    ],
    correctAnswer: 2,
    explanation:
      "The passage's final sentence states the method \"depends entirely on a fortunate alignment\" and therefore \"can only detect a fraction of the planets that actually exist around surveyed stars,\" directly supporting choice C. Choice A contradicts this same sentence. Choice B is an unsupported overgeneralization; the passage never claims planetary transits are the only possible cause of a brightness change. Choice D contradicts the passage, which says the method \"sidesteps\" the problem of trying to see the planet directly rather than enabling direct photography.",
  },
  {
    section: "english",
    topic: "Reading Comprehension",
    subtopic: "Author's tone",
    difficulty: 3,
    passage:
      "Scroll through any major social media platform today and you will rarely see posts in the order they were published. Instead, an algorithm silently reorders your feed, promoting content it predicts will keep you engaged the longest -- typically posts that provoke strong emotion, whether delight, outrage, or anxiety. Platforms defend this practice as a service: why should users wade through irrelevant posts when a system can surface what interests them? But this framing conveniently omits whose interests are actually being served. Engagement-maximizing algorithms are not designed to inform, educate, or even entertain in any balanced sense; they are designed to extend the time a user spends on the platform, because that time is what generates advertising revenue. Users experience this as a feed that seems to understand them, but what it more precisely understands is which of their psychological triggers are most reliably profitable to pull. Calling this personalization a courtesy to the user obscures a far more transactional relationship.",
    body: "The author's tone toward the practice of algorithmic feed curation can best be described as",
    choices: [
      "enthusiastic endorsement of a technology that improves users' daily lives.",
      "neutral, objective description offered with no evaluative judgment.",
      "skeptical criticism of a practice the author believes is misleadingly framed as serving users' interests.",
      "cautious optimism that platforms will soon reform their algorithms.",
    ],
    correctAnswer: 2,
    explanation:
      "Phrases such as \"this framing conveniently omits whose interests are actually being served\" and \"obscures a far more transactional relationship\" express clear critical judgment, matching choice C. Choice A is the opposite of the author's stance. Choice B is wrong because the passage is heavily evaluative, not a neutral description. Choice D is unsupported: the passage makes no prediction or expression of hope about future platform reform.",
  },
  {
    section: "english",
    topic: "Reading Comprehension",
    subtopic: "Author's purpose",
    difficulty: 4,
    passage:
      "For centuries, the English king Richard III was remembered chiefly through Shakespeare's play, which portrays him as a scheming, physically deformed murderer who orchestrated the deaths of his own nephews to seize the throne. This portrait, however, was composed roughly a century after Richard's death, during the reign of a monarch descended from the dynasty that had overthrown him -- a fact that gave playwrights little incentive to depict Richard sympathetically. In 2012, archaeologists uncovered Richard's remains beneath a parking lot in Leicester, and the skeleton revealed a spinal curvature consistent with scoliosis, but nothing resembling the withered arm and hunched, villainous frame of literary tradition. Contemporary records from Richard's own lifetime, meanwhile, describe a competent administrator who reformed the legal system to protect defendants' rights. None of this proves Richard was innocent of the accusations later leveled against him, but it does suggest that the image most people carry of him was shaped less by evidence than by the political needs of the dynasty that followed.",
    body: "The author's primary purpose in this passage is to",
    choices: [
      "prove conclusively that Richard III was innocent of murdering his nephews.",
      "argue that Shakespeare's plays should no longer be performed or studied.",
      "suggest that the popular image of Richard III may owe more to political bias than to historical evidence.",
      "describe the archaeological methods used to identify royal remains.",
    ],
    correctAnswer: 2,
    explanation:
      "The passage's closing sentence states the popular image \"was shaped less by evidence than by the political needs of the dynasty that followed,\" which is precisely choice C. Choice A is explicitly contradicted: the author states \"none of this proves Richard was innocent.\" Choice B is unsupported; the passage never argues against performing or studying Shakespeare. Choice D describes only a supporting detail (the 2012 discovery), not the passage's overall purpose.",
  },
  {
    section: "english",
    topic: "Reading Comprehension",
    subtopic: "Vocabulary in context",
    difficulty: 2,
    passage:
      "When ocean temperatures rise even slightly above their normal seasonal range for a sustained period, corals often expel the colorful, photosynthetic algae that live within their tissues in a mutually beneficial partnership. Without these algae, which supply the coral with the majority of its energy and give it its vivid color, the coral's white limestone skeleton becomes visible through its now-transparent tissue, a phenomenon known as bleaching. A bleached coral is not dead, but it is severely weakened: deprived of its primary energy source, it must rely on whatever it can catch with its tentacles, an inefficient and often insufficient substitute. If normal temperatures return quickly, algae can recolonize the coral and it may recover fully. If the heat stress persists for weeks, however, the coral's reserves are exhausted and it starves, leaving behind a skeleton that is soon colonized by algae of a different, less beneficial kind.",
    body: "In the context of the passage, the word 'expel' most nearly means",
    choices: ["attract", "digest", "expand", "eject"],
    correctAnswer: 3,
    explanation:
      "The passage explains that after this action, the algae are gone, the coral's tissue becomes transparent, and the skeleton is exposed -- consistent with the coral pushing the algae out, i.e., \"eject.\" Choice A is the opposite meaning; attracting algae would not leave the coral transparent and colorless. Choice B is wrong because digesting the algae would consume rather than remove them, and the passage instead describes their absence and the coral losing its energy source. Choice C is unrelated to anything described in the passage.",
  },
  {
    section: "english",
    topic: "Reading Comprehension",
    subtopic: "Vocabulary in context",
    difficulty: 3,
    passage:
      "Linguists estimate that of the roughly seven thousand languages spoken in the world today, nearly half are expected to fall silent by the end of this century. A language typically does not vanish all at once; rather, it recedes gradually as fewer children acquire it as a first language, until eventually only a handful of elderly speakers remain, and the language dies with them. This process is often accelerated by economic and social pressure: when a dominant national language is required for schooling, employment, and government services, families may reasonably conclude that fluency in a minority tongue offers their children diminishing returns, however painful the calculation. Once a language's last fluent speaker dies, so too does an entire, irreplaceable system for organizing experience -- including, in some cases, unique grammatical structures, oral histories, and taxonomies of local plants and animals found nowhere else. Linguists therefore regard each language's disappearance not as a minor cultural footnote but as an irrecoverable loss of human knowledge.",
    body: "As used in the passage, the phrase 'diminishing returns' most nearly means",
    choices: [
      "growing financial rewards",
      "decreasing practical benefit relative to the effort invested",
      "a complete and immediate loss of value",
      "an increase in social recognition",
    ],
    correctAnswer: 1,
    explanation:
      "The surrounding sentence explains that because a dominant language is required for schooling, employment, and government services, families conclude the minority tongue offers their children less and less practical value as a use of that effort -- matching choice B. Choice A is the opposite of the intended meaning. Choice C overstates the phrase; the passage describes a gradual decline in benefit, not a complete or immediate loss. Choice D is unrelated to the economic framing of schooling, employment, and government services given in the passage.",
  },
  {
    section: "english",
    topic: "Reading Comprehension",
    subtopic: "Weakening an argument",
    difficulty: 5,
    passage:
      "In a recent clinical trial, researchers gave a new drug, tentatively named Compound R, to 200 patients with moderate hypertension, while a separate group of 200 similar patients received a placebo. After twelve weeks, the treatment group showed an average blood pressure reduction of 12 points, compared to only 2 points in the placebo group, a difference the researchers describe as statistically significant. Based on these results, the research team has proposed that Compound R be fast-tracked for regulatory approval as a first-line treatment for hypertension. Enthusiasm has grown quickly in some medical circles, with several commentators suggesting the drug could soon replace decades-old standard therapies. The trial's authors themselves, however, caution that their sample consisted entirely of adults aged 40 to 55 with no other diagnosed health conditions, and that the drug's effects, and its safety, in older patients, in patients with kidney or liver disease, or over periods longer than twelve weeks remain untested.",
    body: "Which of the following, if true, would most weaken the case for immediately adopting Compound R as a first-line treatment for all hypertension patients?",
    choices: [
      "A separate, smaller trial found that Compound R reduced blood pressure by 10 points in patients aged 40 to 55.",
      "A follow-up study found that patients over 65 who took Compound R experienced a significantly higher rate of kidney complications than those on standard therapy.",
      "Compound R is chemically similar to a class of drugs that have been used safely for over a decade.",
      "The placebo group in the original trial included some patients who were not taking any other medication.",
    ],
    correctAnswer: 1,
    explanation:
      "The passage notes that Compound R's safety in older patients and those with kidney disease was never tested; choice B supplies direct evidence of serious harm in exactly that untested population, undercutting the proposal to adopt the drug as a first-line treatment for all hypertension patients. Choice A would strengthen, not weaken, the case, since it corroborates the original trial's results in the same age group. Choice C would support confidence in the drug's safety rather than undermine it. Choice D describes a detail about the placebo group that has no bearing on the argument for or against fast-tracking approval.",
  },
];

async function main() {
  const supabase = getSupabaseAdminClient();
  if (!supabase) {
    console.error("NEXT_PUBLIC_SUPABASE_URL / SUPABASE_SERVICE_ROLE_KEY are not set — aborting.");
    process.exitCode = 1;
    return;
  }

  if (QUESTIONS.length !== 9) {
    console.error(`Expected exactly 9 questions, found ${QUESTIONS.length} — aborting.`);
    process.exitCode = 1;
    return;
  }

  const now = new Date().toISOString();
  const rows = QUESTIONS.map((q) => ({
    id: crypto.randomUUID(),
    section: q.section,
    topic: q.topic,
    subtopic: q.subtopic,
    difficulty: q.difficulty,
    body: q.passage ? `${q.passage}\n\n${q.body}` : q.body,
    options: q.choices,
    correct_index: q.correctAnswer,
    explanation: q.explanation,
    created_at: now,
  }));

  console.log(`Inserting ${rows.length} English reading-comprehension questions into the shared question bank...`);

  const { error } = await supabase.from("questions").insert(rows);
  if (error) {
    console.error("Insert failed:", error.message);
    process.exitCode = 1;
    return;
  }

  console.log(`Done. ${rows.length} questions inserted.`);
}

main();
