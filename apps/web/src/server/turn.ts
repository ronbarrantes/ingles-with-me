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
		if (steps.judgeReady()) {
			try {
				const heard = await steps.judge(input.audio, input.caption);
				latest = heard.attempt;
				if (latest.text.trim())
					send({ type: "heard", attempt: latest, meta: heard.meta });
			} catch (e) {
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
			send({ type: "empty" });
			send({ type: "done" });
			return;
		}
	} else if (input.text?.trim()) {
		latest = { text: input.text.trim() };
	}

	let reply: TutorReply;
	try {
		const r = await steps.teacher(
			input.topic,
			input.history,
			latest,
			input.ctx,
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
			const v = await steps.voice(reply.say);
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
