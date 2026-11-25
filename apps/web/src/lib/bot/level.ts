// How much English Ale uses. Beginners start mostly in Spanish and move up as
// they answer in English with good scores; Ale drops back right away when
// they struggle. Kept on the phone (later synced with the profile).

import { CORE_WORDS } from "#/data/words";
import { isLearned, type State } from "#/lib/store";
import type { Attempt } from "./types";

export type Level = 1 | 2 | 3 | 4;

export const LEVEL_NAME: Record<Level, string> = {
	1: "Mayormente español",
	2: "Mitad y mitad",
	3: "Mayormente inglés",
	4: "Inglés",
};

/** The teacher's read of the last turn. */
export type Pace = "more_spanish" | "same" | "more_english";

export interface LevelState {
	/** Set automatically from progress. */
	level: Level;
	/** Chosen by hand in the menu; overrides `level` while set. */
	manual: Level | null;
	/** Last turns: what language, and the pronunciation score if any. */
	recent: { lang: "en" | "es"; acc?: number }[];
	/** Turns since the level last changed (no ping-pong). */
	sinceChange: number;
	/** Conversations started. 0 = the very first one. */
	chats: number;
}

const KEEP = 8;
const clamp = (n: number) => Math.max(1, Math.min(4, n)) as Level;

/** Where to start someone we know nothing about yet: by words learned. */
export function startingLevel(s: State): Level {
	const learned = CORE_WORDS.filter((w) => isLearned(s, w.id)).length;
	return learned < 60 ? 1 : learned < 150 ? 2 : 3;
}

export const freshLevel = (s: State): LevelState => ({
	level: startingLevel(s),
	manual: null,
	recent: [],
	sinceChange: 0,
	chats: 0,
});

export const effective = (l: LevelState): Level => l.manual ?? l.level;

/**
 * After each of their turns: down one right away when the teacher sees them
 * struggling (or they asked for more Spanish); up one when the teacher thinks
 * they can take more English AND most recent turns were English with good
 * scores, at most once every 4 turns; down one after three Spanish answers in
 * a row above level 1.
 */
export function afterTurn(l: LevelState, a: Attempt, pace: Pace): LevelState {
	const recent = [...l.recent, { lang: a.lang ?? "en", acc: a.accuracy }].slice(
		-KEEP,
	) as LevelState["recent"];
	const next = { ...l, recent, sinceChange: l.sinceChange + 1 };
	// Dropping back is immediate (struggling, or they asked for more Spanish).
	if (pace === "more_spanish" && l.level > 1)
		return { ...next, level: clamp(l.level - 1), sinceChange: 0 };
	if (l.sinceChange + 1 < 4) return next;

	const last4 = recent.slice(-4);
	const english = last4.filter((t) => t.lang === "en");
	const scored = english.filter((t) => t.acc !== undefined);
	const avg = scored.length
		? scored.reduce((n, t) => n + (t.acc ?? 0), 0) / scored.length
		: 75; // typed English counts as fine
	const up =
		pace === "more_english" && english.length >= 3 && avg >= 70 && l.level < 4;
	const spanishStreak =
		l.level > 1 &&
		recent.slice(-3).length === 3 &&
		recent.slice(-3).every((t) => t.lang === "es");
	const down = spanishStreak;

	if (up) return { ...next, level: clamp(l.level + 1), sinceChange: 0 };
	if (down) return { ...next, level: clamp(l.level - 1), sinceChange: 0 };
	return next;
}

/** The menu's "Más español / Más inglés": a manual level from the current one. */
export const nudge = (l: LevelState, by: -1 | 1): LevelState => ({
	...l,
	manual: clamp(effective(l) + by),
});

export const automatic = (l: LevelState): LevelState => ({
	...l,
	manual: null,
});

const KEY = "iwm:level";

export function getLevel(s: State): LevelState {
	try {
		const v = JSON.parse(localStorage.getItem(KEY) ?? "null");
		if (v && typeof v.level === "number") return { ...freshLevel(s), ...v };
	} catch {
		// fall through
	}
	return freshLevel(s);
}

export function saveLevel(l: LevelState) {
	try {
		localStorage.setItem(KEY, JSON.stringify(l));
	} catch {
		// Private mode: the level is worked out again next time.
	}
}
