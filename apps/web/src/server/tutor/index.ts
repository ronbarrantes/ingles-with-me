// Which teacher answers. Swap the model with TUTOR_MODEL (e.g. claude-haiku-5-5,
// claude-opus-5-5); a different provider is a new file next to anthropic.ts.

import type { Attempt, Topic, Turn, TutorReply } from "#/lib/bot/types";
import { reply as anthropicReply } from "./anthropic";

export const tutorModel = () => process.env.TUTOR_MODEL || "claude-sonnet-5-5";

/** TUTOR_MOCK=1 answers without any API (for testing the page without keys). */
const mocked = () => process.env.TUTOR_MOCK === "1";

export const tutorReady = () =>
	mocked() || Boolean(process.env.ANTHROPIC_API_KEY);

export async function tutorReply(
	topic: Topic,
	history: Turn[],
	latest: Attempt | null,
) {
	if (mocked()) return mockReply(latest);
	return anthropicReply(tutorModel(), topic, history, latest);
}

function mockReply(latest: Attempt | null): {
	reply: TutorReply;
	inputTokens: number;
	outputTokens: number;
	costUsd: number;
} {
	const weak = latest?.words?.filter((w) => w.accuracy < 70)[0];
	const reply: TutorReply = !latest
		? {
				say: "Hi! I'm Sam. What are you cooking today?",
				corrections: [],
				new_words: [],
			}
		: weak
			? {
					say: `Good try! Let's practice "${weak.word}". Say it with me: ${weak.word}.`,
					corrections: [
						{
							word: weak.word,
							heard: "",
							tip: "(prueba) Dilo despacio, sílaba por sílaba.",
						},
					],
					new_words: [],
				}
			: {
					say: `Nice! You said: ${latest.text}. A butterfly is a mariposa. Can you say butterfly?`,
					corrections: [],
					new_words: [{ en: "butterfly", es: "mariposa" }],
				};
	return { reply, inputTokens: 0, outputTokens: 0, costUsd: 0 };
}
