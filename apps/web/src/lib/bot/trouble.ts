// Words she struggles to pronounce, kept on this phone across conversations,
// so Ale can come back to them. Fed by the judge's per-word scores.

import type { HardWord, WordScore } from "./types";

const KEY = "iwm:hard-words";
/** Under this a word counts as a miss (same line as the teacher's prompt). */
export const GOOD = 75;
/** Good tries in a row that take a word off the list. */
export const MASTERED_STREAK = 2;
const MAX_KEPT = 40;

export const clean = (w: string) =>
	w
		.toLowerCase()
		.replace(/[^\p{L}'’-]/gu, "")
		.replace(/’/g, "'");

/**
 * Fold one turn's scores into the list. Misses are added or updated; a word
 * already on the list that scores well builds a streak and leaves once it's
 * mastered. Returns the new list and the words she just mastered.
 */
export function recordScores(
	list: HardWord[],
	scores: WordScore[],
	now = Date.now(),
): { list: HardWord[]; mastered: string[] } {
	const byWord = new Map(list.map((h) => [h.word, { ...h }]));
	const mastered: string[] = [];
	for (const s of scores) {
		const word = clean(s.word);
		if (s.lang === "es") continue; // Spanish in a mixed sentence: not scored
		if (word.length < 2 || s.error === "Omission" || s.error === "Insertion")
			continue;
		const score = Math.round(s.accuracy);
		const prev = byWord.get(word);
		if (score < GOOD) {
			byWord.set(word, {
				word,
				misses: (prev?.misses ?? 0) + 1,
				last: score,
				best: Math.max(prev?.best ?? 0, score),
				streak: 0,
				note: s.note || prev?.note || "",
				at: now,
			});
		} else if (prev) {
			const streak = prev.streak + 1;
			if (streak >= MASTERED_STREAK) {
				byWord.delete(word);
				mastered.push(word);
			} else
				byWord.set(word, {
					...prev,
					last: score,
					best: Math.max(prev.best, score),
					streak,
					at: now,
				});
		}
	}
	return { list: rank([...byWord.values()]).slice(0, MAX_KEPT), mastered };
}

/** Hardest and most recent first. */
export const rank = (list: HardWord[]) =>
	[...list].sort((a, b) => b.misses - a.misses || b.at - a.at);

export function getHardWords(): HardWord[] {
	try {
		const v = JSON.parse(localStorage.getItem(KEY) ?? "[]");
		return Array.isArray(v) ? v : [];
	} catch {
		return [];
	}
}

export function setHardWords(list: HardWord[]) {
	try {
		if (list.length) localStorage.setItem(KEY, JSON.stringify(list));
		else localStorage.removeItem(KEY);
	} catch {
		// Private mode: the list lasts for this visit only.
	}
}
