import { createFileRoute } from "@tanstack/react-router";
import { z } from "zod";
import type { ReplyResponse } from "#/lib/bot/types";
import { checkPasscode } from "#/server/guard";
import { teacherLabel, teacherReady, tutorReply } from "#/server/tutor";

// Bounded input: no huge histories or texts reach the model.
const AttemptSchema = z.object({
	text: z.string().max(600),
	lang: z.enum(["en", "es"]).optional(),
	words: z
		.array(
			z.object({
				word: z.string().max(60),
				accuracy: z.number(),
				error: z.string().max(40),
				note: z.string().max(120).optional(),
			}),
		)
		.max(80)
		.optional(),
	accuracy: z.number().optional(),
	fluency: z.number().optional(),
});
const LearnerSchema = z.object({
	name: z.string().max(60),
});
const TutorReplySchema = z.object({
	say: z.string().max(1200),
	corrections: z
		.array(z.object({ word: z.string(), heard: z.string(), tip: z.string() }))
		.max(5),
	new_words: z.array(z.object({ en: z.string(), es: z.string() })).max(10),
	learner_name: LearnerSchema.default({ name: "" }),
});
const RequestSchema = z.object({
	topic: z.enum(["libre", "cocina", "jardin", "casa"]),
	history: z
		.array(
			z.discriminatedUnion("role", [
				z.object({ role: z.literal("learner"), attempt: AttemptSchema }),
				z.object({ role: z.literal("tutor"), reply: TutorReplySchema }),
			]),
		)
		.max(40),
	latest: AttemptSchema.nullable(),
	learner: LearnerSchema.nullable().default(null),
	hard: z
		.array(
			z.object({
				word: z.string().max(40),
				misses: z.number(),
				last: z.number(),
				best: z.number(),
				streak: z.number(),
				note: z.string().max(120),
				at: z.number(),
			}),
		)
		.max(12)
		.default([]),
});

export const Route = createFileRoute("/api/bot/reply")({
	server: {
		handlers: {
			POST: async ({ request }) => {
				const denied = checkPasscode(request);
				if (denied) return denied;
				if (!teacherReady()) {
					const missing = teacherLabel().startsWith("google")
						? "GOOGLE_SERVICE_ACCOUNT_JSON"
						: "ANTHROPIC_API_KEY";
					return Response.json(
						{ error: "not_configured", missing: [missing] },
						{ status: 503 },
					);
				}
				const parsed = RequestSchema.safeParse(
					await request.json().catch(() => null),
				);
				if (!parsed.success)
					return Response.json({ error: "bad_request" }, { status: 400 });
				const { topic, history, latest, learner, hard } = parsed.data;
				const started = Date.now();
				try {
					const r = await tutorReply(topic, history, latest, { learner, hard });
					const body: ReplyResponse = {
						reply: r.reply,
						meta: {
							model: teacherLabel(),
							ms: Date.now() - started,
							inputTokens: r.inputTokens,
							outputTokens: r.outputTokens,
							costUsd: r.costUsd,
						},
					};
					return Response.json(body);
				} catch (e) {
					console.error("teacher error", e);
					return Response.json(
						{ error: "teacher_error", message: String(e) },
						{ status: 502 },
					);
				}
			},
		},
	},
});
