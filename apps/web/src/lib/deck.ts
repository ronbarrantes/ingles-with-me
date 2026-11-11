import { CORE_WORDS, type GroupId, type Word } from "#/data/words";
import type { State } from "./store";

/** "todas" or one of the six groups. */
export type DeckId = GroupId | "todas";

export const wordsIn = (deck: DeckId): Word[] =>
	deck === "todas"
		? [...CORE_WORDS]
		: CORE_WORDS.filter((w) => w.group === deck);

export const unseenIn = (s: State, deck: DeckId) =>
	wordsIn(deck).filter((w) => !s.srs[w.id]);

/** Up to `size` new words from the deck, picked at random. */
export function dealNew(s: State, deck: DeckId, size = 10) {
	const pool = unseenIn(s, deck).map((w) => w.id);
	for (let i = pool.length - 1; i > 0; i--) {
		const j = Math.floor(Math.random() * (i + 1));
		[pool[i], pool[j]] = [pool[j], pool[i]];
	}
	return pool.slice(0, size);
}
