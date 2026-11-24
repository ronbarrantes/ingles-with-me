import { describe, expect, it } from "vitest";
import { hasPic } from "./pics";
import { SAY } from "./say";
import { TOPIC_IDS, wordsIn } from "./topics";
import { ALL_WORDS, CORE_WORDS } from "./words";

describe("word list", () => {
	it("has exactly 300 core words", () => {
		expect(CORE_WORDS).toHaveLength(300);
	});

	it("has unique ids", () => {
		const ids = ALL_WORDS.map((w) => w.id);
		expect(new Set(ids).size).toBe(ids.length);
	});

	it("every word has English, Spanish, art and an example", () => {
		for (const w of ALL_WORDS) {
			expect(w.en.trim(), w.id).not.toBe("");
			expect(w.es.trim(), w.id).not.toBe("");
			// An emoji, or a drawing in pics.tsx.
			expect(Boolean(w.pic || hasPic(w.id)), w.id).toBe(true);
			expect(w.example.trim(), w.id).not.toBe("");
		}
	});

	it("every core word has a pronunciation hint", () => {
		const missing = CORE_WORDS.filter((w) => !SAY[w.id]).map((w) => w.id);
		expect(missing).toEqual([]);
	});

	it("every topic has words, and 'todas' has all 300", () => {
		for (const t of TOPIC_IDS) expect(wordsIn(t).length, t).toBeGreaterThan(0);
		expect(wordsIn("todas")).toHaveLength(300);
	});
});
