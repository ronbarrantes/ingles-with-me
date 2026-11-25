import { describe, expect, it } from "vitest";
import type { Turn } from "#/lib/bot/types";
import {
	describeAttempt,
	OPENING,
	SYSTEM_PROMPT,
	sessionNote,
	toChat,
} from "./prompt";

describe("teacher prompt", () => {
	it("introduces Ale and lists her known words", () => {
		expect(SYSTEM_PROMPT).toContain("You are Ale");
		expect(SYSTEM_PROMPT).toContain("dog (");
	});

	it("tells the teacher whether it knows their name", () => {
		expect(
			sessionNote("comida", {
				learner: null,
				hard: [],
				focus: [],
				level: { value: 2, first: false },
			}),
		).toContain("don't know their name");
		const note = sessionNote("comida", {
			learner: { name: "Ximena" },
			hard: [],
			focus: ["bread", "rice"],
			level: { value: 1, first: true },
		});
		expect(note).toContain("English level: 1 of 4 (mostly Spanish)");
		expect(note).toContain("first conversation ever");
		expect(note).toContain("Their name is Ximena");
		expect(note).toContain("Topic: Comida (food, cooking and meals)");
		expect(note).toContain("bread, rice");
	});

	it("lists hard words with scores and notes", () => {
		const note = sessionNote("libre", {
			learner: null,
			focus: [],
			level: { value: 3, first: false },
			hard: [
				{
					word: "three",
					misses: 3,
					last: 52,
					best: 61,
					streak: 0,
					note: "la th sonó como t",
					at: 1,
				},
			],
		});
		expect(note).toContain(
			"Hard words: three (missed 3x, last 52, best 61, la th sonó como t).",
		);
		expect(
			sessionNote("libre", {
				learner: null,
				hard: [],
				focus: [],
				level: { value: 2, first: false },
			}),
		).not.toContain("Hard words");
	});

	it("describes a scored attempt with word scores and notes", () => {
		const text = describeAttempt({
			text: "three trees",
			lang: "en",
			words: [
				{
					word: "three",
					accuracy: 42.4,
					error: "Mispronunciation",
					note: "la th sonó como t",
				},
				{ word: "trees", accuracy: 91, error: "None" },
			],
			accuracy: 66.6,
			fluency: 80,
		});
		expect(text).toContain('She said: "three trees"');
		expect(text).toContain("three 42 Mispronunciation (la th sonó como t)");
		expect(text).toContain("trees 91");
		expect(text).not.toContain("trees 91 None");
		expect(text).toContain("Overall accuracy 67");
	});

	it("marks Spanish words in a mixed turn instead of scoring them", () => {
		const text = describeAttempt({
			text: "I see a mariposa",
			lang: "en",
			words: [
				{ word: "see", accuracy: 90, error: "None" },
				{ word: "mariposa", lang: "es", accuracy: 0, error: "None" },
			],
		});
		expect(text).toContain("mariposa (Spanish)");
		expect(text).not.toContain("mariposa 0");
	});

	it("says when there are no scores", () => {
		expect(describeAttempt({ text: "hola", lang: "es" })).toContain(
			"No pronunciation scores",
		);
	});

	it("builds a chat that always starts with her turn", () => {
		const history: Turn[] = [
			{
				role: "tutor",
				reply: {
					say: "Hi!",
					corrections: [],
					new_words: [],
					learner_name: { name: "" },
					pace: "same",
				},
			},
		];
		const msgs = toChat(history, { text: "hello" });
		expect(msgs[0]).toEqual({ role: "user", content: OPENING });
		expect(msgs.map((m) => m.role)).toEqual(["user", "assistant", "user"]);
		expect(toChat([], null)).toEqual([{ role: "user", content: OPENING }]);
	});
});
