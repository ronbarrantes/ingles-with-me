import { afterEach, describe, expect, it, vi } from "vitest";
import { BotError, fetchHear, TIMEOUT } from "./api";

afterEach(() => {
	vi.useRealTimers();
	vi.unstubAllGlobals();
});

describe("request time limits", () => {
	it("gives up on a judge that never answers", async () => {
		vi.useFakeTimers();
		vi.stubGlobal(
			"fetch",
			(_: string, init: RequestInit) =>
				new Promise((_, reject) =>
					init.signal?.addEventListener("abort", () =>
						reject(new DOMException("aborted", "AbortError")),
					),
				),
		);
		const call = fetchHear("x", "");
		const check = expect(call).rejects.toMatchObject({ code: "timeout" });
		await vi.advanceTimersByTimeAsync(TIMEOUT.judge + 10);
		await check;
		await call.catch((e) => expect(e).toBeInstanceOf(BotError));
	});
});
