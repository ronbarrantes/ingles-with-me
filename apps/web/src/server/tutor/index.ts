// The teacher: picks the provider from TEACHER ("provider:model").
// To add a provider, write a file next to anthropic.ts / google.ts with the
// same `reply` signature and add it below.

import type {
	Attempt,
	LearnerName,
	Topic,
	Turn,
	TutorReply,
} from "#/lib/bot/types";
import { label, mocked, teacherSpec } from "../config";
import { googleReady } from "../google";
import { reply as anthropicReply } from "./anthropic";
import { reply as googleReply } from "./google";

type Result = {
	reply: TutorReply;
	inputTokens: number;
	outputTokens: number;
	costUsd: number | null;
};

const providers: Record<
	string,
	{ ready: () => boolean; reply: typeof anthropicReply | typeof googleReply }
> = {
	anthropic: {
		ready: () => Boolean(process.env.ANTHROPIC_API_KEY),
		reply: anthropicReply,
	},
	google: { ready: googleReady, reply: googleReply },
};

export const teacherLabel = () => label(teacherSpec());
export const teacherReady = () =>
	mocked() || Boolean(providers[teacherSpec().provider]?.ready());

export async function tutorReply(
	topic: Topic,
	history: Turn[],
	latest: Attempt | null,
	learner: LearnerName | null,
): Promise<Result> {
	if (mocked()) return mockReply(latest, learner);
	const { provider, model } = teacherSpec();
	const p = providers[provider];
	if (!p) throw new Error(`unknown teacher provider "${provider}"`);
	return p.reply(model, topic, history, latest, learner);
}

const NO_NAME = { name: "" };

function mockReply(
	latest: Attempt | null,
	learner: LearnerName | null,
): Result {
	const told = latest?.text.match(/my name is (\p{L}+)/iu)?.[1];
	if (told) {
		return {
			reply: {
				say: `Nice to meet you, ${told}! What are you cooking today?`,
				corrections: [],
				new_words: [],
				learner_name: { name: told },
			},
			inputTokens: 0,
			outputTokens: 0,
			costUsd: 0,
		};
	}
	const weak = latest?.words?.filter((w) => w.accuracy < 70)[0];
	const reply: TutorReply = !latest
		? {
				say: learner?.name
					? `Hi ${learner.name}! What are you cooking today?`
					: "Hi! I'm Ale. What's your name?",
				corrections: [],
				new_words: [],
				learner_name: NO_NAME,
			}
		: weak
			? {
					say: `Good try! Let's practice "${weak.word}". Say it with me: ${weak.word}.`,
					corrections: [
						{
							word: weak.word,
							heard: "",
							tip: weak.note ?? "(prueba) Dilo despacio.",
						},
					],
					new_words: [],
					learner_name: NO_NAME,
				}
			: {
					say: `Nice! You said: ${latest.text}. A butterfly is a mariposa. Can you say butterfly?`,
					corrections: [],
					new_words: [{ en: "butterfly", es: "mariposa" }],
					learner_name: NO_NAME,
				};
	return { reply, inputTokens: 0, outputTokens: 0, costUsd: 0 };
}
