// English voices read "Ale" like the beer ("ail"), and mangle Spanish names:
// swap in respellings they say right.

import type { LearnerName } from "./types";

const escapeRe = (s: string) => s.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");

export function sayable(text: string, learner: LearnerName | null) {
	let out = text.replace(/\bAle\b/g, "Ah-leh");
	if (learner?.say && learner.say !== learner.name)
		out = out.replace(
			new RegExp(`(?<!\\p{L})${escapeRe(learner.name)}(?!\\p{L})`, "giu"),
			learner.say,
		);
	return out;
}
