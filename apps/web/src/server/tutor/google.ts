// The teacher on Gemini (Vertex AI): same instructions and reply shape as
// the Claude teacher, so the two can be compared by changing TEACHER.

import type {
	Attempt,
	TeacherContext,
	Topic,
	Turn,
	TutorReply,
} from "#/lib/bot/types";
import { gemini, geminiSchema } from "../google";
import { SYSTEM_PROMPT, sessionNote, toChat } from "./prompt";
import { ReplySchema } from "./schema";

export async function reply(
	model: string,
	topic: Topic,
	history: Turn[],
	latest: Attempt | null,
	ctx: TeacherContext,
) {
	const res = await gemini().models.generateContent({
		model,
		contents: toChat(history, latest).map((m) => ({
			role: m.role === "assistant" ? "model" : "user",
			parts: [{ text: m.content }],
		})),
		config: {
			systemInstruction: `${SYSTEM_PROMPT}\n\n${sessionNote(topic, ctx)}`,
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
