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

	it("tells the teacher whether it knows her name", () => {
		expect(sessionNote("cocina", null)).toContain("don't know her name");
		const note = sessionNote("cocina", { name: "Ximena" });
		expect(note).toContain("Her name is Ximena");
		expect(note).toContain("cooking");
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
					note: "th sounded like t",
				},
				{ word: "trees", accuracy: 91, error: "None" },
			],
			accuracy: 66.6,
			fluency: 80,
		});
		expect(text).toContain('She said: "three trees"');
		expect(text).toContain("three 42 Mispronunciation (th sounded like t)");
		expect(text).toContain("trees 91");
		expect(text).not.toContain("trees 91 None");
		expect(text).toContain("Overall accuracy 67");
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
				},
			},
		];
		const msgs = toChat(history, { text: "hello" });
		expect(msgs[0]).toEqual({ role: "user", content: OPENING });
		expect(msgs.map((m) => m.role)).toEqual(["user", "assistant", "user"]);
		expect(toChat([], null)).toEqual([{ role: "user", content: OPENING }]);
	});
});
