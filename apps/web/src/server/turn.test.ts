import { describe, expect, it } from "vitest";
import type { TurnEvent, TutorReply } from "#/lib/bot/types";
import { runTurn, type TurnInput, type TurnSteps } from "./turn";

const meta = {
	model: "m",
	ms: 1,
	inputTokens: 0,
	outputTokens: 0,
	costUsd: null,
};
const reply: TutorReply = {
	say: "Nice!",
	corrections: [],
	new_words: [],
	learner_name: { name: "" },
	pace: "same",
};

function steps(over: Partial<TurnSteps> = {}): TurnSteps & { seen: string[] } {
	const seen: string[] = [];
	return {
		seen,
		judgeReady: () => true,
		judge: async () => {
			seen.push("judge");
			return { attempt: { text: "I eat rice", lang: "en" }, meta };
		},
		teacher: async (_t, _h, latest) => {
			seen.push(`teacher:${latest?.text ?? "opening"}`);
			return { reply, meta };
		},
		voiceReady: () => true,
		voice: async () => {
			seen.push("voice");
			return {
				audio: new TextEncoder().encode("mp3").buffer,
				type: "audio/mpeg",
			};
		},
		report: (_e, stage) => seen.push(`report:${stage}`),
		...over,
	};
}

const input = (over: Partial<TurnInput> = {}): TurnInput => ({
	topic: "libre",
	history: [],
	caption: "",
	ctx: {
		learner: null,
		hard: [],
		focus: [],
		level: { value: 1, first: false },
	},
	...over,
});

async function run(i: TurnInput, s: TurnSteps) {
	const events: TurnEvent[] = [];
	await runTurn(i, s, (e) => events.push(e));
	return events;
}

describe("runTurn", () => {
	it("spoken: heard → reply → voice → done, in that order", async () => {
		const s = steps();
		const ev = await run(input({ audio: "x".repeat(200) }), s);
		expect(ev.map((e) => e.type)).toEqual(["heard", "reply", "voice", "done"]);
		expect(s.seen).toEqual(["judge", "teacher:I eat rice", "voice"]);
		const v = ev[2] as Extract<TurnEvent, { type: "voice" }>;
		expect(Buffer.from(v.audio, "base64").toString()).toBe("mp3");
	});

	it("judge fails: carries on with the caption, marked judgeFailed", async () => {
		const s = steps({
			judge: async () => {
				throw new Error("empty answer");
			},
		});
		const ev = await run(
			input({ audio: "x".repeat(200), caption: "hello" }),
			s,
		);
		expect(ev[0]).toMatchObject({
			type: "heard",
			judgeFailed: true,
			attempt: { text: "hello" },
		});
		expect(ev.map((e) => e.type)).toEqual(["heard", "reply", "voice", "done"]);
		expect(s.seen).toContain("report:judge");
	});

	it("nothing heard: empty, and the teacher isn't asked", async () => {
		const s = steps({
			judge: async () => ({ attempt: { text: "  ", lang: "en" }, meta }),
		});
		const ev = await run(input({ audio: "x".repeat(200) }), s);
		expect(ev.map((e) => e.type)).toEqual(["empty", "done"]);
		expect(s.seen).toEqual([]);
	});

	it("typed: no judge, straight to the teacher", async () => {
		const s = steps();
		const ev = await run(input({ text: " hello " }), s);
		expect(ev.map((e) => e.type)).toEqual(["reply", "voice", "done"]);
		expect(s.seen).toEqual(["teacher:hello", "voice"]);
	});

	it("opening: no audio or text, the teacher opens", async () => {
		const s = steps();
		await run(input(), s);
		expect(s.seen[0]).toBe("teacher:opening");
	});

	it("teacher fails: an error event, no voice", async () => {
		const s = steps({
			teacher: async () => {
				throw new Error("overloaded");
			},
		});
		const ev = await run(input({ text: "hi" }), s);
		expect(ev.map((e) => e.type)).toEqual(["error", "done"]);
		expect(s.seen).not.toContain("voice");
	});

	it("voice fails or isn't set up: voice_unavailable (the phone speaks)", async () => {
		const failing = steps({
			voice: async () => {
				throw new Error("tts down");
			},
		});
		expect(
			(await run(input({ text: "hi" }), failing)).map((e) => e.type),
		).toEqual(["reply", "voice_unavailable", "done"]);
		const off = steps({ voiceReady: () => false });
		expect((await run(input({ text: "hi" }), off)).map((e) => e.type)).toEqual([
			"reply",
			"voice_unavailable",
			"done",
		]);
	});

	it("no judge configured: uses the caption without scores", async () => {
		const s = steps({ judgeReady: () => false });
		const ev = await run(
			input({ audio: "x".repeat(200), caption: "hi there" }),
			s,
		);
		expect(ev[0]).toMatchObject({
			type: "heard",
			attempt: { text: "hi there" },
		});
		expect(s.seen).not.toContain("judge");
	});
});
