// The judge on Gemini (Vertex AI): hears the learner's recording, writes down what they
// said (English or Spanish) and scores English pronunciation word by word.

import { ThinkingLevel } from "@google/genai";
import { z } from "zod";
import type { Attempt } from "#/lib/bot/types";
import { gemini, geminiSchema } from "../google";

const JudgeSchema = z.object({
	text: z.string(),
	lang: z.enum(["en", "es"]),
	accuracy: z.number(),
	fluency: z.number(),
	words: z.array(
		z.object({
			word: z.string(),
			lang: z.enum(["en", "es"]),
			accuracy: z.number(),
			error: z.enum(["None", "Mispronunciation", "Omission", "Insertion"]),
			note: z.string(),
		}),
	),
});

const INSTRUCTIONS = `You assess the spoken English of an adult whose first language is Latin American Spanish. The recording is one short turn in a practice conversation.

1. Transcribe exactly what they said, in the language they spoke. Do not correct their grammar or words.
2. lang = "es" if they spoke mostly Spanish, otherwise "en". Mixing is normal ("I want to see the mariposa").
3. If lang is "en", list every word they said, in order, each with its own lang. Spanish words (lang "es") are not scored: accuracy 0, error "None", note "". Score each English word (lang "en") for pronunciation against standard American English, 0 to 100:
   90-100 clear and natural; 75-89 a light accent but clearly the right word; 60-74 understandable with a noticeable wrong sound; under 60 hard to understand, or it sounds like a different word.
   An accent alone is not an error. Use error "Mispronunciation" for words under 75, "Omission" for a word they clearly skipped, "Insertion" for an extra word, otherwise "None".
   note: for words under 75, a few words IN SPANISH on what sounded off (for example "la th sonó como t", "i corta en vez de ii larga"), else "". The learner reads these notes.
   accuracy = overall pronunciation of the English words 0-100; fluency = smoothness and pace 0-100.
4. If lang is "es", return an empty words list and accuracy and fluency of 0.
Be consistent: the same recording should get the same scores.`;

// Scoring a short clip doesn't need deep reasoning, and thinking adds seconds.
// Models that don't take a thinking level get the call without it.
let thinkingOk = true;

export async function hear(
	model: string,
	wavBase64: string,
): Promise<{ attempt: Attempt; inputTokens: number; outputTokens: number }> {
	try {
		return await call(model, wavBase64, thinkingOk);
	} catch (e) {
		if (!thinkingOk || !/thinking/i.test(String(e))) throw e;
		thinkingOk = false;
		console.warn("judge: model refused a thinking level; retrying without");
		return call(model, wavBase64, false);
	}
}

async function call(model: string, wavBase64: string, lowThinking: boolean) {
	const res = await gemini().models.generateContent({
		model,
		contents: [
			{
				role: "user",
				parts: [
					{ inlineData: { mimeType: "audio/wav", data: wavBase64 } },
					{ text: "Assess this turn." },
				],
			},
		],
		config: {
			systemInstruction: INSTRUCTIONS,
			responseMimeType: "application/json",
			responseJsonSchema: geminiSchema(JudgeSchema),
			temperature: 0,
			maxOutputTokens: 2000,
			...(lowThinking && {
				thinkingConfig: { thinkingLevel: ThinkingLevel.MINIMAL },
			}),
		},
	});
	const parsed = JudgeSchema.safeParse(JSON.parse(res.text ?? "null"));
	if (!parsed.success) throw new Error("judge reply was not valid JSON");
	const j = parsed.data;
	const attempt: Attempt =
		j.lang === "es"
			? { text: j.text, lang: "es" }
			: {
					text: j.text,
					lang: "en",
					accuracy: j.accuracy,
					fluency: j.fluency,
					words: j.words,
				};
	const u = res.usageMetadata;
	return {
		attempt,
		inputTokens: u?.promptTokenCount ?? 0,
		outputTokens: (u?.candidatesTokenCount ?? 0) + (u?.thoughtsTokenCount ?? 0),
	};
}
