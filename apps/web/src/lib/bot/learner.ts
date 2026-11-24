// Her name, as the teacher learned it. Kept on this phone so the teacher
// remembers it next time.

import type { LearnerName } from "./types";

const KEY = "iwm:learner";

export function getLearner(): LearnerName | null {
	try {
		const v = JSON.parse(localStorage.getItem(KEY) ?? "null");
		return v && typeof v.name === "string" && v.name ? v : null;
	} catch {
		return null;
	}
}

export function setLearner(l: LearnerName | null) {
	try {
		if (l?.name) localStorage.setItem(KEY, JSON.stringify(l));
		else localStorage.removeItem(KEY);
	} catch {
		// Private mode: the teacher just asks again next time.
	}
}
