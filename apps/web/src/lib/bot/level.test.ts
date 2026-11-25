import { describe, expect, it } from "vitest";
import { CORE_WORDS } from "#/data/words";
import type { State } from "#/lib/store";
import {
	afterTurn,
	effective,
	freshLevel,
	type LevelState,
	nudge,
	startingLevel,
} from "./level";

const fresh = (): State => ({
	srs: {},
	favorites: [],
	marked: [],
	lastTopic: "todas",
	decks: {},
});

const en = (acc = 85) => ({ text: "x", lang: "en" as const, accuracy: acc });
const es = { text: "x", lang: "es" as const };

const run = (
	l: LevelState,
	turns: [
		ReturnType<typeof en> | typeof es,
		"more_spanish" | "same" | "more_english",
	][],
) => turns.reduce((acc, [a, p]) => afterTurn(acc, a, p), l);

describe("English level", () => {
	it("starts beginners in Spanish, by words learned", () => {
		expect(startingLevel(fresh())).toBe(1);
		const s = fresh();
		for (const w of CORE_WORDS.slice(0, 160))
			s.srs[w.id] = { box: 3, due: 0, seen: 3 };
		expect(startingLevel(s)).toBe(3);
	});

	it("moves up after good English turns when the teacher agrees", () => {
		const l = run(freshLevel(fresh()), [
			[en(), "same"],
			[en(), "same"],
			[en(), "same"],
			[en(), "more_english"],
		]);
		expect(l.level).toBe(2);
		expect(l.sinceChange).toBe(0);
	});

	it("doesn't move up on weak scores", () => {
		const l = run(freshLevel(fresh()), [
			[en(50), "more_english"],
			[en(50), "more_english"],
			[en(50), "more_english"],
			[en(50), "more_english"],
		]);
		expect(l.level).toBe(1);
	});

	it("drops back when the teacher sees them struggle", () => {
		const start = { ...freshLevel(fresh()), level: 3 as const, sinceChange: 5 };
		const l = afterTurn(start, es, "more_spanish");
		expect(l.level).toBe(2);
	});

	it("drops back after three Spanish answers in a row above level 1", () => {
		const start = { ...freshLevel(fresh()), level: 2 as const, sinceChange: 5 };
		const l = run(start, [
			[es, "same"],
			[es, "same"],
			[es, "same"],
		]);
		expect(l.level).toBe(1);
	});

	it("drops back right away, even just after a change", () => {
		const start = { ...freshLevel(fresh()), level: 3 as const, sinceChange: 0 };
		expect(afterTurn(start, es, "more_spanish").level).toBe(2);
	});

	it("never moves up twice within 4 turns", () => {
		const start = { ...freshLevel(fresh()), level: 2 as const, sinceChange: 0 };
		const l = run(start, [
			[en(), "more_english"],
			[en(), "more_english"],
			[en(), "more_english"],
		]);
		expect(l.level).toBe(2);
	});

	it("a manual choice overrides the automatic level", () => {
		const l = nudge(freshLevel(fresh()), 1);
		expect(effective(l)).toBe(2);
		expect(effective(nudge(nudge(l, 1), 1))).toBe(4);
		expect(effective(nudge({ ...l, manual: 1 }, -1))).toBe(1);
	});
});
