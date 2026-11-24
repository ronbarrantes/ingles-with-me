// The teacher on Claude. To try another provider, add a sibling file with the
// same `reply` signature and pick it in ./index.ts.

import Anthropic from "@anthropic-ai/sdk";
import { betaZodOutputFormat } from "@anthropic-ai/sdk/helpers/beta/zod";
import type {
	Attempt,
	LearnerName,
	Topic,
	Turn,
	TutorReply,
} from "#/lib/bot/types";
import { SYSTEM_PROMPT, sessionNote, toChat } from "./prompt";
import { ReplySchema } from "./schema";

// USD per million tokens (input, output), for the cost readout on /ale.
const PRICES: Record<string, [number, number]> = {
	"claude-haiku-5-5": [0.1, 0.5],
	"claude-sonnet-5-5": [2, 10],
	"claude-opus-5-5": [4, 20],
};

let client: Anthropic | undefined;

export async function reply(
	model: string,
	topic: Topic,
	history: Turn[],
	latest: Attempt | null,
	learner: LearnerName | null,
): Promise<{
	reply: TutorReply;
	inputTokens: number;
	outputTokens: number;
	costUsd: number;
}> {
	client ??= new Anthropic(); // reads ANTHROPIC_API_KEY
	const response = await client.beta.messages.parse({
		model,
		max_tokens: 1500,
		// Chat is latency-sensitive and doesn't need deep reasoning.
		output_config: { effort: "low", format: betaZodOutputFormat(ReplySchema) },
		// If a safety classifier declines, rerun on a fallback model instead of failing.
		betas: ["server-side-fallback-2026-07-01"],
		fallbacks: "default",
		// The long system prompt is the same for everyone: cache it.
		system: [
			{
				type: "text",
				text: SYSTEM_PROMPT,
				cache_control: { type: "ephemeral" },
			},
			{ type: "text", text: sessionNote(topic, learner) },
		],
		messages: toChat(history, latest),
	});

	if (response.stop_reason === "refusal" || !response.parsed_output) {
		throw new Error(`tutor gave no reply (${response.stop_reason})`);
	}

	const u = response.usage;
	const input =
		u.input_tokens +
		(u.cache_creation_input_tokens ?? 0) +
		(u.cache_read_input_tokens ?? 0);
	const [pin, pout] = PRICES[response.model] ?? PRICES[model] ?? [0, 0];
	const costUsd =
		(u.input_tokens * pin +
			(u.cache_creation_input_tokens ?? 0) * pin * 1.25 +
			(u.cache_read_input_tokens ?? 0) * pin * 0.1 +
			u.output_tokens * pout) /
		1e6;

	return {
		reply: response.parsed_output,
		inputTokens: input,
		outputTokens: u.output_tokens,
		costUsd,
	};
}
