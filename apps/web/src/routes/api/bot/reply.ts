import { createFileRoute } from "@tanstack/react-router";
import { z } from "zod";
import type { ReplyResponse } from "#/lib/bot/types";
import { checkPasscode } from "#/server/guard";
import { tutorModel, tutorReady, tutorReply } from "#/server/tutor";

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
			}),
		)
		.max(80)
		.optional(),
	accuracy: z.number().optional(),
	fluency: z.number().optional(),
});
const ReplySchema = z.object({
	say: z.string().max(1200),
	corrections: z
		.array(z.object({ word: z.string(), heard: z.string(), tip: z.string() }))
		.max(5),
	new_words: z.array(z.object({ en: z.string(), es: z.string() })).max(10),
});
const RequestSchema = z.object({
	topic: z.enum(["libre", "cocina", "jardin", "casa"]),
	history: z
		.array(
			z.discriminatedUnion("role", [
				z.object({ role: z.literal("learner"), attempt: AttemptSchema }),
				z.object({ role: z.literal("tutor"), reply: ReplySchema }),
			]),
		)
		.max(40),
	latest: AttemptSchema.nullable(),
});

export const Route = createFileRoute("/api/bot/reply")({
	server: {
		handlers: {
			POST: async ({ request }) => {
				const denied = checkPasscode(request);
				if (denied) return denied;
				if (!tutorReady()) {
					return Response.json(
						{ error: "not_configured", missing: ["ANTHROPIC_API_KEY"] },
						{ status: 503 },
					);
				}
				const parsed = RequestSchema.safeParse(
					await request.json().catch(() => null),
				);
				if (!parsed.success)
					return Response.json({ error: "bad_request" }, { status: 400 });
				const { topic, history, latest } = parsed.data;
				const started = Date.now();
				try {
					const r = await tutorReply(topic, history, latest);
					const body: ReplyResponse = {
						reply: r.reply,
						meta: {
							model: tutorModel(),
							ms: Date.now() - started,
							inputTokens: r.inputTokens,
							outputTokens: r.outputTokens,
							costUsd: r.costUsd,
						},
					};
					return Response.json(body);
				} catch (e) {
					console.error("tutor error", e);
					return Response.json(
						{ error: "tutor_error", message: String(e) },
						{ status: 502 },
					);
				}
			},
		},
	},
});
