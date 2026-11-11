import { type TopicId, wordsIn } from "#/data/topics";
import { CORE_WORDS } from "#/data/words";
import type { SavedDeck, State } from "./store";

export function shuffle<T>(a: T[]): T[] {
	const r = [...a];
	for (let i = r.length - 1; i > 0; i--) {
		const j = Math.floor(Math.random() * (i + 1));
		[r[i], r[j]] = [r[j], r[i]];
	}
	return r;
}

export const unseenIn = (s: State, topic: TopicId) =>
	wordsIn(topic).filter((w) => !s.srs[w.id]);

/** A new round of up to `size` random unseen words. */
export function dealNew(s: State, topic: TopicId, size = 10): SavedDeck {
	const ids = shuffle(unseenIn(s, topic).map((w) => w.id)).slice(0, size);
	return { ids, total: ids.length, known: 0 };
}

/** Words due for review right now, oldest first. */
export const dueIds = (s: State, now = Date.now()) =>
	CORE_WORDS.filter((w) => s.srs[w.id] && s.srs[w.id].due <= now)
		.sort((a, b) => s.srs[a.id].due - s.srs[b.id].due)
		.map((w) => w.id);
