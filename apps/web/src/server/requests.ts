// Request shapes for the /api/bot endpoints, bounded so no huge histories or
// texts reach the models. Shared by /reply and /turn.

import { z } from "zod";
import { isChatTopic } from "#/lib/bot/topics";

export const AttemptSchema = z.object({
	text: z.string().max(600),
	lang: z.enum(["en", "es"]).optional(),
	words: z
		.array(
			z.object({
				word: z.string().max(60),
				lang: z.enum(["en", "es"]).optional(),
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
export const LearnerSchema = z.object({
	name: z.string().max(60),
});
export const TutorReplySchema = z.object({
	say: z.string().max(1200),
	corrections: z
		.array(z.object({ word: z.string(), heard: z.string(), tip: z.string() }))
		.max(5),
	new_words: z.array(z.object({ en: z.string(), es: z.string() })).max(10),
	learner_name: LearnerSchema.default({ name: "" }),
	pace: z.enum(["more_spanish", "same", "more_english"]).default("same"),
});
export const ReplyRequestSchema = z.object({
	topic: z.string().max(30).refine(isChatTopic),
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
	focus: z.array(z.string().max(40)).max(15).default([]),
	level: z
		.object({
			value: z.union([z.literal(1), z.literal(2), z.literal(3), z.literal(4)]),
			first: z.boolean(),
		})
		.default({ value: 2, first: false }),
});

/** One whole turn: audio (spoken), text (typed) or nothing (Ale opens). */
export const TurnRequestSchema = ReplyRequestSchema.omit({
	latest: true,
}).extend({
	audio: z.string().min(100).max(1_500_000).optional(),
	caption: z.string().max(600).default(""),
	text: z.string().max(600).optional(),
});
