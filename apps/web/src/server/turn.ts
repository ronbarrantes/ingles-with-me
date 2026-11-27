// One whole conversation turn on the server: judge (if spoken) → teacher →
// voice, sending each result the moment it's ready. The steps are passed in,
// so this can be tested without any AI.

import type {
	Attempt,
	Meta,
	TeacherContext,
	Topic,
	Turn,
	TurnEvent,
	TutorReply,
} from "#/lib/bot/types";

export interface TurnSteps {
	judgeReady: () => boolean;
	judge: (
		audio: string,
		caption: string,
	) => Promise<{ attempt: Attempt; meta: Meta }>;
	teacher: (
		topic: Topic,
		history: Turn[],
		latest: Attempt | null,
		ctx: TeacherContext,
	) => Promise<{ reply: TutorReply; meta: Meta }>;
	voiceReady: () => boolean;
	voice: (text: string) => Promise<{ audio: ArrayBuffer; type: string }>;
	report: (error: unknown, stage: string) => void;
	/** Give up on a step after this long (ms): judge → continue without scores. */
	judgeTimeoutMs?: number;
	teacherTimeoutMs?: number;
}

class StepTimeout extends Error {}

function withTimeout<T>(p: Promise<T>, ms: number, what: string): Promise<T> {
	return new Promise<T>((resolve, reject) => {
		const t = setTimeout(
			() => reject(new StepTimeout(`${what} took over ${ms}ms`)),
			ms,
		);
		p.then(
			(v) => {
				clearTimeout(t);
				resolve(v);
			},
			(e) => {
				clearTimeout(t);
				reject(e);
			},
		);
	});
}

export interface TurnInput {
	topic: Topic;
	history: Turn[];
	/** Spoken turn: 16 kHz WAV, base64, plus the phone's live caption. */
	audio?: string;
	caption: string;
	/** Typed turn. With neither audio nor text, Ale opens the conversation. */
	text?: string;
	ctx: TeacherContext;
}

export async function runTurn(
	input: TurnInput,
	steps: TurnSteps,
	send: (e: TurnEvent) => void,
) {
	let latest: Attempt | null = null;

	if (input.audio) {
		let reason: "judge_empty" | "judge_failed" | "no_judge" = "no_judge";
		let error: string | undefined;
		const judgeStart = Date.now();
		if (steps.judgeReady()) {
			reason = "judge_empty";
			try {
				const heard = await withTimeout(
					steps.judge(input.audio, input.caption),
					steps.judgeTimeoutMs ?? 10_000,
					"judge",
				);
				latest = heard.attempt;
				if (latest.text.trim())
					send({ type: "heard", attempt: latest, meta: heard.meta });
			} catch (e) {
				reason = "judge_failed";
				error = String(e).slice(0, 120);
				steps.report(e, "judge");
				// Carry on with the phone's caption, without scores.
				if (input.caption.trim()) {
					latest = { text: input.caption, lang: "en" };
					send({
						type: "heard",
						attempt: latest,
						meta: noMeta("judge"),
						judgeFailed: true,
					});
				}
			}
		} else if (input.caption.trim()) {
			latest = { text: input.caption, lang: "en" };
			send({ type: "heard", attempt: latest, meta: noMeta("caption") });
		}
		if (!latest?.text.trim()) {
			send({
				type: "empty",
				reason,
				judge_ms: Date.now() - judgeStart,
				...(error && { error }),
			});
			send({ type: "done" });
			return;
		}
	} else if (input.text?.trim()) {
		latest = { text: input.text.trim() };
	}

	let reply: TutorReply;
	try {
		const r = await withTimeout(
			steps.teacher(input.topic, input.history, latest, input.ctx),
			steps.teacherTimeoutMs ?? 20_000,
			"teacher",
		);
		reply = r.reply;
		send({ type: "reply", reply, meta: r.meta });
	} catch (e) {
		steps.report(e, "teacher");
		send({
			type: "error",
			stage: "teacher",
			code: "teacher_error",
			message: String(e),
		});
		send({ type: "done" });
		return;
	}

	if (steps.voiceReady()) {
		const started = Date.now();
		try {
			const v = await withTimeout(steps.voice(reply.say), 10_000, "voice");
			send({
				type: "voice",
				audio: Buffer.from(v.audio).toString("base64"),
				mime: v.type,
				ms: Date.now() - started,
			});
		} catch (e) {
			steps.report(e, "voice");
			send({ type: "voice_unavailable" });
		}
	} else {
		send({ type: "voice_unavailable" });
	}
	send({ type: "done" });
}

const noMeta = (model: string): Meta => ({
	model,
	ms: 0,
	inputTokens: 0,
	outputTokens: 0,
	costUsd: null,
});
