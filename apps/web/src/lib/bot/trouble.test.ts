import { describe, expect, it } from "vitest";
import { clean, mergeHard, recordScores } from "./trouble";
import type { WordScore } from "./types";

const ws = (word: string, accuracy: number, note = ""): WordScore => ({
	word,
	accuracy,
	error: accuracy < 75 ? "Mispronunciation" : "None",
	note,
});

describe("hard words", () => {
	it("adds words under 75 with their score and note", () => {
		const { list } = recordScores(
			[],
			[ws("Three,", 52, "la th sonó como t"), ws("dogs", 90)],
			1,
		);
		expect(list).toEqual([
			{
				word: "three",
				misses: 1,
				last: 52,
				best: 52,
				streak: 0,
				note: "la th sonó como t",
				at: 1,
			},
		]);
	});

	it("counts repeat misses and keeps the best score", () => {
		let { list } = recordScores([], [ws("three", 52)], 1);
		({ list } = recordScores(list, [ws("three", 64)], 2));
		({ list } = recordScores(list, [ws("three", 58)], 3));
		expect(list[0]).toMatchObject({ misses: 3, last: 58, best: 64 });
	});

	it("takes a word off after two good tries in a row", () => {
		let { list } = recordScores([], [ws("three", 52)]);
		({ list } = recordScores(list, [ws("three", 80)]));
		expect(list[0]).toMatchObject({ streak: 1, last: 80 });
		const res = recordScores(list, [ws("three", 85)]);
		expect(res.list).toEqual([]);
		expect(res.mastered).toEqual(["three"]);
	});

	it("a miss resets the streak", () => {
		let { list } = recordScores([], [ws("very", 50)]);
		({ list } = recordScores(list, [ws("very", 80)]));
		({ list } = recordScores(list, [ws("very", 60)]));
		expect(list[0]).toMatchObject({ streak: 0, misses: 2 });
	});

	it("ignores good words it never saw, skipped words and one-letter words", () => {
		const { list } = recordScores(
			[],
			[
				ws("dogs", 95),
				ws("a", 40),
				{ word: "the", accuracy: 0, error: "Omission" },
			],
		);
		expect(list).toEqual([]);
	});

	it("puts the most missed first", () => {
		let { list } = recordScores([], [ws("ship", 60)], 1);
		({ list } = recordScores(list, [ws("three", 50)], 2));
		({ list } = recordScores(list, [ws("three", 50)], 3));
		expect(list.map((h) => h.word)).toEqual(["three", "ship"]);
	});

	it("skips Spanish words in a mixed sentence", () => {
		const { list } = recordScores(
			[],
			[
				{ word: "mariposa", lang: "es", accuracy: 0, error: "None" },
				ws("butterfly", 60),
			],
		);
		expect(list.map((h) => h.word)).toEqual(["butterfly"]);
	});

	it("normalizes punctuation and case, keeps apostrophes", () => {
		expect(clean("Don’t!")).toBe("don't");
		expect(clean("¿Mariposa?")).toBe("mariposa");
	});

	it("merges phone and server lists, newest entry per word", () => {
		const a = recordScores([], [ws("three", 50)], 1).list;
		const b = recordScores([], [ws("three", 70), ws("ship", 60)], 2).list;
		const merged = mergeHard(a, b);
		expect(merged.find((h) => h.word === "three")?.last).toBe(70);
		expect(merged.map((h) => h.word).sort()).toEqual(["ship", "three"]);
	});
});
