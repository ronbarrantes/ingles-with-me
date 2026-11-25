import { describe, expect, it } from "vitest";
import { plain, splitLang } from "./segments";

describe("splitLang", () => {
	it("splits Spanish parts out of an English line", () => {
		expect(splitLang("Juice is «jugo». Apple is «manzana».")).toEqual([
			{ lang: "en", text: "Juice is" },
			{ lang: "es", text: "jugo" },
			{ lang: "en", text: ". Apple is" },
			{ lang: "es", text: "manzana" },
			{ lang: "en", text: "." },
		]);
	});

	it("keeps an all-English line whole", () => {
		expect(splitLang("Hi there!")).toEqual([{ lang: "en", text: "Hi there!" }]);
	});

	it("handles a Spanish-only line and empty markers", () => {
		expect(splitLang("«Muy bien.» «»")).toEqual([
			{ lang: "es", text: "Muy bien." },
		]);
	});

	it("plain() drops the markers", () => {
		expect(plain("Juice is «jugo».")).toBe("Juice is jugo.");
	});
});
