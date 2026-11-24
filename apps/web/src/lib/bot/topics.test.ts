import { describe, expect, it } from "vitest";
import { CORE_WORDS } from "#/data/words";
import type { State } from "#/lib/store";
import { focusWords, suggestTopics } from "./topics";

const fresh = (): State => ({
	srs: {},
	favorites: [],
	marked: [],
	lastTopic: "todas",
	decks: {},
});

const learnAll = (s: State, category: string) => {
	for (const w of CORE_WORDS.filter((x) => x.category === category))
		s.srs[w.id] = { box: 3, due: Number.MAX_SAFE_INTEGER, seen: 3 };
};

describe("chat topics", () => {
	it("offers a few topics plus free talk, no hard words when there are none", () => {
		const chips = suggestTopics(fresh(), { counts: {} }, 0, { now: 0 });
		expect(chips).toHaveLength(6);
		expect(chips.at(-1)?.id).toBe("libre");
		expect(chips.some((c) => c.id === "hard")).toBe(false);
	});

	it("puts hard words first when there are some", () => {
		const chips = suggestTopics(fresh(), { counts: {} }, 3, { now: 0 });
		expect(chips[0]).toMatchObject({
			id: "hard",
			label: "Palabras difíciles (3)",
		});
	});

	it("favors topics they pick, and the last one", () => {
		const chips = suggestTopics(
			fresh(),
			{ counts: { trabajo: 5 }, last: "trabajo" },
			0,
			{ now: 0 },
		);
		expect(chips[0].id).toBe("trabajo");
	});

	it("drops topics that are mostly learned", () => {
		const s = fresh();
		learnAll(s, "comida");
		const chips = suggestTopics(
			s,
			{ counts: { comida: 9 }, last: "comida" },
			0,
			{
				now: 0,
				max: 11,
			},
		);
		expect(chips.some((c) => c.id === "comida")).toBe(false);
	});

	it("never suggests grammar-only categories", () => {
		const ids = suggestTopics(fresh(), { counts: {} }, 0, { max: 99 }).map(
			(c) => c.id,
		);
		for (const bad of ["conectores", "preguntar", "base", "describir"])
			expect(ids).not.toContain(bad);
	});

	it("focus words: due first, then in progress, then new; skips learned", () => {
		const s = fresh();
		const food = CORE_WORDS.filter((w) => w.category === "comida");
		s.srs[food[0].id] = { box: 4, due: 0, seen: 4 }; // learned
		s.srs[food[1].id] = { box: 1, due: 0, seen: 1 }; // due
		s.srs[food[2].id] = { box: 1, due: Number.MAX_SAFE_INTEGER, seen: 1 }; // in progress
		const out = focusWords(s, "comida", 3, 10);
		expect(out).toEqual([food[1].en, food[2].en, food[3].en]);
	});
});
