// The judge: picks the provider from JUDGE ("provider:model"). Candidates to
// add later: a dedicated pronunciation scorer (SpeechSuper, Speechace, Azure).

import type { Attempt } from "#/lib/bot/types";
import { judgeSpec, label, mocked } from "../config";
import { googleReady } from "../google";
import { hear as googleHear } from "./google";

const providers: Record<
	string,
	{ ready: () => boolean; hear: typeof googleHear }
> = {
	google: { ready: googleReady, hear: googleHear },
};

export const judgeLabel = () => label(judgeSpec());
export const judgeReady = () =>
	mocked() || Boolean(providers[judgeSpec().provider]?.ready());

export async function judgeHear(wavBase64: string, caption: string) {
	if (mocked()) return mockHear(caption);
	const { provider, model } = judgeSpec();
	const p = providers[provider];
	if (!p) throw new Error(`unknown judge provider "${provider}"`);
	return p.hear(model, wavBase64);
}

/** Canned scores built from the live caption, so the page can be tested without keys. */
function mockHear(caption: string): {
	attempt: Attempt;
	inputTokens: number;
	outputTokens: number;
	thoughtTokens: number;
} {
	const text = caption.trim() || "I have three dogs";
	const words = text.split(/\s+/).map((word, i) => {
		const low = /^th|three|think/i.test(word) || i === 2;
		return {
			word,
			accuracy: low ? 55 : 92,
			error: low ? "Mispronunciation" : "None",
			note: low ? "la th sonó como t" : "",
		};
	});
	return {
		attempt: { text, lang: "en", accuracy: 80, fluency: 85, words },
		inputTokens: 0,
		outputTokens: 0,
		thoughtTokens: 0,
	};
}
