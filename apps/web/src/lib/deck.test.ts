import { describe, expect, it } from "vitest";
import { wordsIn } from "#/data/topics";
import { dealNew, dueIds, shuffle, unseenIn } from "./deck";
import { isDue, isLearned, LEARNED_BOX, type State } from "./store";

const fresh = (): State => ({
	srs: {},
	favorites: [],
	marked: [],
	lastTopic: "todas",
	decks: {},
});

describe("shuffle", () => {
	it("keeps every item and doesn't touch the input", () => {
		const input = [1, 2, 3, 4, 5, 6, 7, 8];
		const out = shuffle(input);
		expect(out).toHaveLength(8);
		expect([...out].sort()).toEqual(input);
		expect(input).toEqual([1, 2, 3, 4, 5, 6, 7, 8]);
	});
});

describe("dealNew", () => {
	it("deals 10 distinct unseen words from the topic", () => {
		const deck = dealNew(fresh(), "personas");
		expect(deck.ids).toHaveLength(10);
		expect(new Set(deck.ids).size).toBe(10);
		expect(deck).toMatchObject({ total: 10, known: 0 });
		const inTopic = new Set(wordsIn("personas").map((w) => w.id));
		for (const id of deck.ids) expect(inTopic.has(id)).toBe(true);
	});

	it("never deals words already seen", () => {
		const s = fresh();
		const seen = wordsIn("casa").slice(0, 5);
		for (const w of seen) s.srs[w.id] = { box: 1, due: 0, seen: 1 };
		const deck = dealNew(s, "casa", 1000);
		for (const w of seen) expect(deck.ids).not.toContain(w.id);
		expect(deck.ids).toHaveLength(unseenIn(s, "casa").length);
	});

	it("returns an empty deck when everything was seen", () => {
		const s = fresh();
		for (const w of wordsIn("clave")) s.srs[w.id] = { box: 1, due: 0, seen: 1 };
		expect(dealNew(s, "clave").ids).toEqual([]);
	});
});

describe("review", () => {
	it("lists due words oldest first and skips future ones", () => {
		const s = fresh();
		const [a, b, c] = wordsIn("todas");
		s.srs[a.id] = { box: 1, due: 300, seen: 1 };
		s.srs[b.id] = { box: 1, due: 100, seen: 1 };
		s.srs[c.id] = { box: 1, due: 9_999, seen: 1 };
		expect(dueIds(s, 1_000)).toEqual([b.id, a.id]);
		expect(isDue(s, c.id, 1_000)).toBe(false);
	});

	it(`counts a word as learned from box ${LEARNED_BOX}`, () => {
		const s = fresh();
		const [w] = wordsIn("todas");
		s.srs[w.id] = { box: LEARNED_BOX - 1, due: 0, seen: 1 };
		expect(isLearned(s, w.id)).toBe(false);
		s.srs[w.id].box = LEARNED_BOX;
		expect(isLearned(s, w.id)).toBe(true);
	});
});
