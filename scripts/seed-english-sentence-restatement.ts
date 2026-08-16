/**
 * Seeds 20 original English questions — 10 "Sentence Completion" (covering
 * causal reasoning, concession, cause-and-effect consequence, comparatives,
 * mixed conditionals, and correlative structures) and 10 "Restatement"
 * (meaning-preservation across concession, causal, comparative, conditional,
 * voice, quantifier-scope, and time-sequence claims). Both topics had only
 * 1 question each before this (lib/topics.ts's canonical taxonomy), well
 * below the ~10-question baseline every practice topic should have.
 *
 * Usage:
 *   npx tsx --env-file=.env.local scripts/seed-english-sentence-restatement.ts
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

type HardcodedQuestion = Omit<Question, "id" | "createdAt" | "passage" | "type" | "media">;

const QUESTIONS: HardcodedQuestion[] = [
  {
    section: "english",
    topic: "Sentence Completion",
    subtopic: "Causal Reasoning (because)",
    difficulty: 2,
    body: "Archaeologists were astonished by the tomb's contents because the artifacts inside had remained ______ for over three thousand years.",
    choices: ["deteriorated", "pristine", "misplaced", "duplicated"],
    correctAnswer: 1,
    explanation:
      "The clause introduced by 'because' must logically explain the astonishment. 'Pristine' (perfectly preserved) is the only choice that makes three-thousand-year-old artifacts astonishing. 'Deteriorated' contradicts the idea of a remarkable discovery, 'misplaced' describes location rather than condition and gives no reason for astonishment, and 'duplicated' makes no sense applied to ancient artifacts.",
  },
  {
    section: "english",
    topic: "Sentence Completion",
    subtopic: "Concession (despite)",
    difficulty: 3,
    body: "Despite the company's aggressive marketing campaign, sales figures remained ______ throughout the quarter.",
    choices: ["soaring", "stagnant", "transparent", "audited"],
    correctAnswer: 1,
    explanation:
      "'Despite' signals a contrast between what the marketing campaign should have produced (a sales increase) and what actually happened. 'Stagnant' creates that contrast. 'Soaring' matches the expected outcome instead of contrasting with it, which defeats the purpose of 'despite'; 'transparent' has the wrong connotation for describing sales performance; 'audited' describes a process, not a level of performance, and does not fit grammatically as a description of how figures 'remained.'",
  },
  {
    section: "english",
    topic: "Sentence Completion",
    subtopic: "Concession (even though)",
    difficulty: 3,
    body: "Even though the new medication had shown promising results in early trials, doctors remained ______ about prescribing it widely.",
    choices: ["eager", "convinced", "cautious", "unaware"],
    correctAnswer: 2,
    explanation:
      "'Even though' introduces a concession: the promising trial results would normally lead to enthusiasm, but the second clause must describe the opposite. 'Cautious' supplies that contrast. 'Eager' and 'convinced' both describe enthusiasm, which matches rather than contrasts with the promising results, making 'even though' pointless; 'unaware' is illogical since the sentence already states the doctors know about the promising results.",
  },
  {
    section: "english",
    topic: "Sentence Completion",
    subtopic: "Cause-and-Effect Consequence (so)",
    difficulty: 2,
    body: "The drought lasted for nearly a year, so farmers were forced to ______ their planting schedules dramatically.",
    choices: ["adjust", "ignore", "publicize", "celebrate"],
    correctAnswer: 0,
    explanation:
      "'So' introduces a direct consequence of the drought. Being 'forced to adjust' schedules is a logical response to prolonged drought. 'Ignore' contradicts 'forced to,' since being forced implies compliance, not disregard; 'publicize' has no logical connection to responding to a drought; 'celebrate' has the wrong connotation, since a drought is a hardship, not an occasion for celebration.",
  },
  {
    section: "english",
    topic: "Sentence Completion",
    subtopic: "Cause-and-Effect Consequence (as a result)",
    difficulty: 4,
    body: "The factory installed a new quality-control system designed to catch mistakes before they reached customers; as a result, production errors have ______ by nearly forty percent.",
    choices: ["increased", "decreased", "documented", "authorized"],
    correctAnswer: 1,
    explanation:
      "'As a result' must describe a consequence consistent with a system 'designed to catch mistakes.' 'Decreased' is the only outcome consistent with that purpose. 'Increased' directly contradicts the system's stated goal; 'documented' is ungrammatical here, since errors cannot 'document by' a percentage; 'authorized' is nonsensical applied to a rate of errors.",
  },
  {
    section: "english",
    topic: "Sentence Completion",
    subtopic: "Comparative/Superlative Structures",
    difficulty: 3,
    body: "Of all the marathon runners competing this year, Elena's training regimen was by far the most ______, involving daily altitude runs and strict dietary monitoring.",
    choices: ["rigor", "rigorously", "rigidness", "rigorous"],
    correctAnswer: 3,
    explanation:
      "After the linking verb 'was' and the superlative 'the most,' the blank requires a predicate adjective. 'Rigorous' is the only adjective among the choices. 'Rigor' is a noun and cannot follow 'the most' to describe a regimen in this construction; 'rigorously' is an adverb, which cannot serve as a predicate complement after 'was'; 'rigidness' is a noun and, additionally, carries an unrelated connotation of inflexibility rather than thoroughness.",
  },
  {
    section: "english",
    topic: "Sentence Completion",
    subtopic: "Conditional (mixed: if...had, would)",
    difficulty: 5,
    body: "If governments ______ stricter emissions regulations decades ago, the current rate of glacial melting would likely be far lower today.",
    choices: ["adopted", "would adopt", "had adopted", "were adopting"],
    correctAnswer: 2,
    explanation:
      "This is a mixed conditional: a hypothetical past action ('decades ago') producing a hypothetical present result ('would likely be... today'), which requires the past perfect 'had adopted' in the if-clause. 'Adopted' (simple past) does not carry the counterfactual, completed-in-the-past meaning needed here; 'would adopt' is ungrammatical in an if-clause, since 'would' belongs in the result clause, not the condition; 'were adopting' (past continuous) wrongly suggests an ongoing action rather than a completed hypothetical decision.",
  },
  {
    section: "english",
    topic: "Sentence Completion",
    subtopic: "Correlative Structures (not only...but also)",
    difficulty: 4,
    body: "The tutoring program not only improved students' test scores but also ______ their confidence in tackling difficult problems independently.",
    choices: ["boost", "boosted", "boosting", "to boost"],
    correctAnswer: 1,
    explanation:
      "The correlative pair 'not only... but also' requires grammatically parallel verb forms on both sides. Since the first verb is 'improved' (simple past), the second must match: 'boosted.' 'Boost' (base form) breaks the tense parallelism; 'boosting' (gerund) and 'to boost' (infinitive) are both grammatically mismatched with the finite past-tense verb 'improved.'",
  },
  {
    section: "english",
    topic: "Sentence Completion",
    subtopic: "Correlative Structures (neither...nor)",
    difficulty: 5,
    body: "The newly released report was greeted with skepticism, since it was neither ______ by independent auditors nor supported by any verifiable data.",
    choices: ["reviewing", "reviews", "to review", "reviewed"],
    correctAnswer: 3,
    explanation:
      "The correlative pair 'neither... nor' requires parallel structure, and the second element, 'supported by any verifiable data,' is a passive past participle. The blank must match: 'reviewed' (passive past participle, 'neither reviewed by... nor supported by...'). 'Reviewing' is an active gerund that breaks the passive parallelism; 'reviews' is a present-tense verb/noun that does not fit after 'was neither'; 'to review' is an infinitive that cannot follow 'was neither' grammatically.",
  },
  {
    section: "english",
    topic: "Sentence Completion",
    subtopic: "Causal Reasoning (since)",
    difficulty: 3,
    body: "Since the telescope's sensors had never been calibrated for such extreme temperatures, the readings it produced during the mission were largely ______.",
    choices: ["unreliable", "reliable", "classified", "anticipated"],
    correctAnswer: 0,
    explanation:
      "'Since' here means 'because,' and the clause it introduces (sensors never calibrated for the conditions) must logically explain the quality of the readings. 'Unreliable' is the only choice consistent with that cause. 'Reliable' directly contradicts the stated cause; 'classified' describes a security status with no logical link to calibration; 'anticipated' describes an expectation about the future, not a property of readings already produced, and does not follow logically from the calibration problem.",
  },
  {
    section: "english",
    topic: "Restatement",
    subtopic: "Concession Clauses",
    difficulty: 3,
    body: 'Which sentence best restates the following without changing its meaning?\n\nOriginal: "Although the museum\'s new exhibit received mixed reviews from critics, it attracted record numbers of visitors in its first month."',
    choices: [
      "The exhibit drew record crowds in its first month because critics gave it mixed reviews.",
      "The exhibit drew record crowds in its first month despite mixed critical reviews.",
      "Critics loved the exhibit, which is why it attracted record crowds in its first month.",
      "The exhibit received mixed reviews and modest visitor numbers in its first month.",
    ],
    correctAnswer: 1,
    explanation:
      "The original presents a concession: high attendance happened in spite of mixed reviews, with no causal link between the two. The correct choice preserves this with 'despite.' The first option invents a causal relationship ('because') that the original never states. The third option reverses the reviews from 'mixed' to unambiguously positive ('loved'), and wrongly makes them the cause of the crowds. The fourth option contradicts the outcome entirely, changing 'record numbers' of visitors to 'modest' numbers.",
  },
  {
    section: "english",
    topic: "Restatement",
    subtopic: "Cause-and-Effect Claims",
    difficulty: 4,
    body: 'Which sentence best restates the following without changing its meaning?\n\nOriginal: "Because the bridge had not been inspected in over a decade, engineers were unable to certify it as safe for heavy vehicles."',
    choices: [
      "Engineers could not certify the bridge as safe for heavy vehicles since it had gone without inspection for more than ten years.",
      "The bridge had not been inspected for over a decade because engineers could not certify it as safe for heavy vehicles.",
      "Because the bridge had never been inspected, engineers concluded it was completely unsafe for all vehicles.",
      "Engineers were slightly concerned about the bridge's safety after a routine inspection.",
    ],
    correctAnswer: 0,
    explanation:
      "The original states that a decade-long lack of inspection caused the inability to certify the bridge safe for heavy vehicles specifically. The correct choice preserves both the cause and its exact scope. The second option reverses cause and effect, making the certification problem the reason for the lack of inspection. The third option overstates the claim twice: 'not inspected in over a decade' becomes 'never inspected,' and 'unable to certify... for heavy vehicles' becomes 'completely unsafe for all vehicles.' The fourth option drops the decade-long inspection gap entirely, invents a 'routine inspection' that contradicts the original, and understates the engineers' conclusion as mere mild concern.",
  },
  {
    section: "english",
    topic: "Restatement",
    subtopic: "Comparative Claims",
    difficulty: 3,
    body: 'Which sentence best restates the following without changing its meaning?\n\nOriginal: "The new smartphone model is significantly lighter than its predecessor, though its battery life is only marginally longer."',
    choices: [
      "The new smartphone is much lighter and has a dramatically longer battery life than its predecessor.",
      "The new smartphone is heavier than its predecessor but has a much longer battery life.",
      "Compared to the previous model, the new smartphone is much lighter, but its battery life has improved only slightly.",
      "The new smartphone is lighter than every other model currently on the market.",
    ],
    correctAnswer: 2,
    explanation:
      "The original makes two separate comparative claims: a large weight decrease and only a slight battery improvement. The correct choice preserves both magnitudes accurately. The first option overstates the battery claim, turning 'marginally longer' into 'dramatically longer.' The second option reverses the weight comparison, calling the new phone heavier instead of lighter. The fourth option changes the scope of the comparison from 'its predecessor' to 'every other model currently on the market,' an unsupported overgeneralization the original never makes.",
  },
  {
    section: "english",
    topic: "Restatement",
    subtopic: "Conditional Statements",
    difficulty: 5,
    body: 'Which sentence best restates the following without changing its meaning?\n\nOriginal: "If the negotiations had not collapsed at the last minute, the merger would have been finalized by the end of the year."',
    choices: [
      "The merger would have been finalized by year's end had the negotiations not fallen apart at the last minute.",
      "Because the negotiations succeeded, the merger was finalized by the end of the year.",
      "If the negotiations had not collapsed, the merger might possibly have been finalized eventually.",
      "The merger failed because both companies lost interest after negotiations collapsed at the last minute.",
    ],
    correctAnswer: 0,
    explanation:
      "The original is a third-conditional statement describing a hypothetical outcome that did not happen, since the negotiations did in fact collapse. The correct choice preserves this exact unreal-past structure. The second option treats the hypothetical as real, asserting the negotiations 'succeeded' and the merger 'was finalized' — the opposite of what the original implies. The third option weakens the strong hypothetical certainty of 'would have been finalized' into a vague possibility ('might possibly... eventually'). The fourth option adds an unsupported reason, 'lost interest,' that the original never states.",
  },
  {
    section: "english",
    topic: "Restatement",
    subtopic: "Passive-to-Active Shift",
    difficulty: 3,
    body: 'Which sentence best restates the following without changing its meaning?\n\nOriginal: "The vaccine was developed by a small research team working with limited funding over five years."',
    choices: [
      "A small research team received the vaccine after five years of limited funding.",
      "A small research team with limited funding developed the vaccine over five years.",
      "The vaccine was developed by a large, well-funded research team over five years.",
      "The vaccine was developed by a small research team that later received a major grant.",
    ],
    correctAnswer: 1,
    explanation:
      "The original, in the passive voice, identifies the small, limited-funding team as the developer of the vaccine. The correct choice restates this in the active voice with the same agent and same action. The first option changes the team's role entirely, making it the recipient of the vaccine rather than its creator. The third option reverses the description of the team from 'small' and 'limited funding' to 'large' and 'well-funded.' The fourth option adds an unsupported later event, a 'major grant,' that is not part of the original statement.",
  },
  {
    section: "english",
    topic: "Restatement",
    subtopic: "Quantifier / Scope Claims",
    difficulty: 2,
    body: 'Which sentence best restates the following without changing its meaning?\n\nOriginal: "Only some of the survey respondents supported the new tax policy, while the majority expressed strong opposition."',
    choices: [
      "None of the survey respondents supported the new tax policy.",
      "A minority of survey respondents backed the new tax policy; most were firmly against it.",
      "All of the survey respondents opposed the new tax policy.",
      "Most survey respondents supported the new tax policy, while a small minority opposed it.",
    ],
    correctAnswer: 1,
    explanation:
      "The original specifies a partial quantifier: 'only some' supported the policy, and 'the majority' opposed it. The correct choice preserves both quantities exactly. The first option overstates the claim, changing 'only some' (a minority did support it) to 'none.' The third option overstates the opposition, changing 'the majority' opposed to 'all' opposed. The fourth option reverses the proportions entirely, making supporters the majority and opponents a minority.",
  },
  {
    section: "english",
    topic: "Restatement",
    subtopic: "Time-Sequence Claims",
    difficulty: 3,
    body: 'Which sentence best restates the following without changing its meaning?\n\nOriginal: "The company announced layoffs shortly after reporting record quarterly profits."',
    choices: [
      "The company reported record quarterly profits shortly after announcing layoffs.",
      "Record quarterly profits were reported by the company, and layoffs were announced not long afterward.",
      "The company announced layoffs because its quarterly profits had collapsed.",
      "The company announced layoffs and, much later, reported record quarterly profits.",
    ],
    correctAnswer: 1,
    explanation:
      "The original establishes a clear time sequence: record profits were reported first, and layoffs followed shortly after. The correct choice preserves both the order and the short interval. The first option reverses the sequence, putting the layoffs before the profit report. The third option invents an unsupported cause ('profits had collapsed') that directly contradicts the stated 'record' profits. The fourth option keeps the original order but changes the short interval ('shortly after') into a long one ('much later'), which the original does not support.",
  },
  {
    section: "english",
    topic: "Restatement",
    subtopic: "Cause-and-Effect Claims (Reversed Causality)",
    difficulty: 4,
    body: 'Which sentence best restates the following without changing its meaning?\n\nOriginal: "Rising ocean temperatures have caused coral bleaching events to become more frequent along the reef."',
    choices: [
      "Coral bleaching events along the reef have become more frequent because ocean temperatures are rising.",
      "Increasingly frequent coral bleaching events have caused ocean temperatures to rise along the reef.",
      "Rising ocean temperatures have caused all coral along the reef to die.",
      "Ocean temperatures along the reef may be rising slightly, with no clear effect on coral.",
    ],
    correctAnswer: 0,
    explanation:
      "The original identifies rising ocean temperatures as the cause and more frequent bleaching events as the effect. The correct choice preserves this exact causal direction. The second option reverses cause and effect, making the bleaching events responsible for rising temperatures. The third option overstates the claim, changing 'bleaching events... more frequent' into all coral dying. The fourth option denies the causal claim altogether and understates the temperature change as merely 'slight,' with 'no clear effect,' contradicting the original's definite causal statement.",
  },
  {
    section: "english",
    topic: "Restatement",
    subtopic: "Superlative Comparative Claims",
    difficulty: 4,
    body: 'Which sentence best restates the following without changing its meaning?\n\nOriginal: "Of all the candidates interviewed, Maria demonstrated the strongest grasp of the technical material, though she was not the most experienced."',
    choices: [
      "Maria was the most experienced candidate interviewed, but her grasp of the technical material was weak.",
      "Maria was clearly the best candidate overall, with more experience and technical knowledge than anyone else.",
      "Maria showed a better understanding of the technical material than any other candidate interviewed, despite not having the most experience.",
      "Maria demonstrated the strongest grasp of the technical material and was also the most experienced candidate.",
    ],
    correctAnswer: 2,
    explanation:
      "The original makes two claims: Maria had the strongest technical grasp, and a concession that she was not the most experienced. The correct choice keeps both. The first option reverses both claims, making her the most experienced with a weak technical grasp. The second option overstates the claim into an unqualified 'best candidate overall' and contradicts the explicit statement that she was not the most experienced by claiming she had 'more experience... than anyone else.' The fourth option drops the concession entirely, asserting the opposite — that she was also the most experienced.",
  },
  {
    section: "english",
    topic: "Restatement",
    subtopic: "Quantifier / Scope Claims",
    difficulty: 4,
    body: 'Which sentence best restates the following without changing its meaning?\n\nOriginal: "The new regulation applies only to companies with more than five hundred employees, exempting the vast majority of small businesses."',
    choices: [
      "The new regulation applies to all companies, regardless of size.",
      "Only companies with over five hundred employees are subject to the new regulation, so most small businesses are exempt.",
      "The new regulation exempts companies with more than five hundred employees but applies to small businesses.",
      "The new regulation applies only to a few large corporations, leaving nearly every business unaffected.",
    ],
    correctAnswer: 1,
    explanation:
      "The original limits the regulation's scope to companies over five hundred employees and states that most small businesses are exempt. The correct choice preserves this exact scope. The first option overgeneralizes, changing the limited scope into 'all companies, regardless of size.' The third option reverses which group is exempt and which is covered. The fourth option mischaracterizes the scope by understating it as 'a few large corporations,' which is not equivalent to the original's threshold-based description of 'more than five hundred employees.'",
  },
];

async function main() {
  const supabase = getSupabaseAdminClient();
  if (!supabase) {
    console.error("NEXT_PUBLIC_SUPABASE_URL / SUPABASE_SERVICE_ROLE_KEY are not set — aborting.");
    process.exitCode = 1;
    return;
  }

  if (QUESTIONS.length !== 20) {
    console.error(`Expected exactly 20 questions, found ${QUESTIONS.length} — aborting.`);
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
    body: q.body,
    options: q.choices,
    correct_index: q.correctAnswer,
    explanation: q.explanation,
    created_at: now,
  }));

  console.log(`Inserting ${rows.length} English questions into the shared question bank...`);
  const byTopic = new Map<string, number>();
  for (const q of QUESTIONS) byTopic.set(q.topic, (byTopic.get(q.topic) ?? 0) + 1);
  for (const [topic, count] of byTopic) console.log(`  ${topic}: ${count}`);

  const { error } = await supabase.from("questions").insert(rows);
  if (error) {
    console.error("Insert failed:", error.message);
    process.exitCode = 1;
    return;
  }

  console.log(`Done. ${rows.length} questions inserted.`);
}

main();
