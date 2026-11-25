// The judge on Gemini (Vertex AI): hears the learner's recording, writes down what they
// said (English or Spanish) and scores English pronunciation word by word.

import { ThinkingLevel } from "@google/genai";
import { z } from "zod";
import type { Attempt } from "#/lib/bot/types";
import { gemini, geminiSchema } from "../google";
import { reportError } from "../telemetry";

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

// Scoring a short clip doesn't need deep reasoning, and thinking adds seconds
// (and can use up the whole output budget, leaving an empty answer).
// JUDGE_THINKING: minimal (default) | low | medium | high | default (model's own).
const LEVELS: Record<string, ThinkingLevel> = {
	minimal: ThinkingLevel.MINIMAL,
	low: ThinkingLevel.LOW,
	medium: ThinkingLevel.MEDIUM,
	high: ThinkingLevel.HIGH,
};
const level = () => LEVELS[process.env.JUDGE_THINKING ?? "minimal"];
// Models that don't take a thinking level get the call without it.
let thinkingOk = true;

export async function hear(model: string, wavBase64: string): Promise<Heard> {
	try {
		return await callOnce(model, wavBase64);
	} catch (e) {
		if (thinkingOk && /thinking/i.test(String(e))) {
			thinkingOk = false;
			console.warn("judge: model refused a thinking level; retrying without");
			return callOnce(model, wavBase64);
		}
		if (e instanceof EmptyAnswer) {
			void reportError(e, { stage: "judge-empty", model });
			return callOnce(model, wavBase64);
		}
		throw e;
	}
}

class EmptyAnswer extends Error {}

interface Heard {
	attempt: Attempt;
	inputTokens: number;
	outputTokens: number;
	thoughtTokens: number;
}

async function callOnce(model: string, wavBase64: string): Promise<Heard> {
	const lvl = thinkingOk ? level() : undefined;
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
			maxOutputTokens: 8192,
			...(lvl && { thinkingConfig: { thinkingLevel: lvl } }),
		},
	});
	const u = res.usageMetadata;
	const thoughtTokens = u?.thoughtsTokenCount ?? 0;
	if (!res.text?.trim())
		throw new EmptyAnswer(
			`empty answer (finish: ${res.candidates?.[0]?.finishReason ?? "?"}, thoughts: ${thoughtTokens})`,
		);
	let json: unknown;
	try {
		json = JSON.parse(res.text);
	} catch {
		throw new EmptyAnswer("answer was cut off");
	}
	const parsed = JudgeSchema.safeParse(json);
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
	return {
		attempt,
		inputTokens: u?.promptTokenCount ?? 0,
		outputTokens: (u?.candidatesTokenCount ?? 0) + thoughtTokens,
		thoughtTokens,
	};
}
