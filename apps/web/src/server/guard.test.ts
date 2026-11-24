import { afterEach, describe, expect, it } from "vitest";
import { checkPasscode } from "./guard";

const req = (code?: string) =>
	new Request("http://x/api", {
		method: "POST",
		headers: code === undefined ? {} : { "x-bot-passcode": code },
	});

afterEach(() => {
	delete process.env.BOT_PASSCODE;
});

describe("checkPasscode", () => {
	it("is 503 when no passcode is configured", () => {
		expect(checkPasscode(req("x"))?.status).toBe(503);
	});

	it("accepts the code, ignoring caps and spaces on both sides", () => {
		process.env.BOT_PASSCODE = " Mariposa 2026 \n";
		expect(checkPasscode(req("mariposa 2026"))).toBeNull();
		expect(checkPasscode(req("  MARIPOSA 2026"))).toBeNull();
		expect(checkPasscode(req(encodeURIComponent("Mariposa 2026")))).toBeNull();
	});

	it("accepts accented codes sent URI-encoded", () => {
		process.env.BOT_PASSCODE = "Jardín";
		expect(checkPasscode(req(encodeURIComponent("jardín")))).toBeNull();
	});

	it("rejects wrong, empty or missing codes", () => {
		process.env.BOT_PASSCODE = "secret";
		expect(checkPasscode(req("secreto"))?.status).toBe(401);
		expect(checkPasscode(req(""))?.status).toBe(401);
		expect(checkPasscode(req())?.status).toBe(401);
	});

	it("doesn't crash on a broken %-encoding", () => {
		process.env.BOT_PASSCODE = "100%";
		expect(checkPasscode(req("100%"))).toBeNull();
	});
});
