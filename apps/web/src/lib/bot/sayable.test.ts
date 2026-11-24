import { describe, expect, it } from "vitest";
import { sayable } from "./sayable";

describe("sayable", () => {
	it("says Ale the Spanish way", () => {
		expect(sayable("Hi! I'm Ale.", null)).toBe("Hi! I'm Ah-leh.");
	});

	it("leaves words that only contain 'ale' alone", () => {
		expect(sayable("Pale ale is a beer. Alex is here.", null)).toBe(
			"Pale ale is a beer. Alex is here.",
		);
	});

	it("swaps in her name's respelling, accents and all", () => {
		const me = { name: "Lucía", say: "Loo-SEE-ah" };
		expect(sayable("Hi Lucía! lucía. Lucíana", me)).toBe(
			"Hi Loo-SEE-ah! Loo-SEE-ah. Lucíana",
		);
	});

	it("handles names with regex characters", () => {
		const me = { name: "Ana (Anita)", say: "AH-nah" };
		expect(sayable("Hi Ana (Anita)!", me)).toBe("Hi AH-nah!");
	});

	it("does nothing when the respelling is the name itself", () => {
		const me = { name: "Maria", say: "Maria" };
		expect(sayable("Hi Maria", me)).toBe("Hi Maria");
	});
});
