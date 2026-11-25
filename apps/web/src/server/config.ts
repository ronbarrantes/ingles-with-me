// Which provider and model plays each role. Every role is one environment
// variable in the form "provider:model", so swapping is a settings change:
//   TEACHER=anthropic:claude-sonnet-5-5   (or google:gemini-4-hydrogen …)
//   JUDGE=google:gemini-4-hydrogen         (hears her and scores pronunciation)
//   VOICE=google:en-US-Chirp3-HD-Aoede     (speaks Ale's replies)
// BOT_MOCK=1 answers every role with canned data (testing without keys).

export interface Spec {
	provider: string;
	model: string;
}

function spec(value: string | undefined, fallback: string): Spec {
	const [provider, ...rest] = (value?.trim() || fallback).split(":");
	return { provider: provider.toLowerCase(), model: rest.join(":") };
}

export const teacherSpec = () =>
	spec(process.env.TEACHER, "anthropic:claude-sonnet-5-5");
export const judgeSpec = () =>
	spec(process.env.JUDGE, "google:gemini-4-hydrogen");
export const voiceSpec = () =>
	spec(process.env.VOICE, "google:en-US-Chirp3-HD-Aoede");
/** Voice for Spanish words inside a line; defaults to the same voice in es-US. */
export const voiceEs = () =>
	process.env.VOICE_ES?.split(":").slice(1).join(":") ||
	voiceSpec().model.replace(/^[a-z]{2}-[A-Z]{2}/, "es-US");
export const mocked = () => process.env.BOT_MOCK === "1";

export const label = (s: Spec) => `${s.provider}:${s.model}`;
