// The teacher on Gemini (Vertex AI): same instructions and reply shape as
// the Claude teacher, so the two can be compared by changing TEACHER.

import { z } from "zod";
import type { Attempt, Topic, Turn, TutorReply } from "#/lib/bot/types";
import { gemini, geminiSchema } from "../google";
import { SYSTEM_PROMPT, toChat, topicNote } from "./prompt";

const ReplySchema = z.object({
	say: z.string(),
	corrections: z.array(
		z.object({ word: z.string(), heard: z.string(), tip: z.string() }),
	),
	new_words: z.array(z.object({ en: z.string(), es: z.string() })),
});

export async function reply(
	model: string,
	topic: Topic,
	history: Turn[],
	latest: Attempt | null,
) {
	const res = await gemini().models.generateContent({
		model,
		contents: toChat(history, latest).map((m) => ({
			role: m.role === "assistant" ? "model" : "user",
			parts: [{ text: m.content }],
		})),
		config: {
			systemInstruction: `${SYSTEM_PROMPT}\n\n${topicNote(topic)}`,
			responseMimeType: "application/json",
			responseJsonSchema: geminiSchema(ReplySchema),
			maxOutputTokens: 1500,
		},
	});
	const parsed = ReplySchema.safeParse(JSON.parse(res.text ?? "null"));
	if (!parsed.success) throw new Error("teacher reply was not valid JSON");
	const u = res.usageMetadata;
	return {
		reply: parsed.data as TutorReply,
		inputTokens: u?.promptTokenCount ?? 0,
		outputTokens: (u?.candidatesTokenCount ?? 0) + (u?.thoughtsTokenCount ?? 0),
		costUsd: null,
	};
}
