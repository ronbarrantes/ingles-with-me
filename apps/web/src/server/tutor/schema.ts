// The teacher's reply shape, shared by every provider.

import { z } from "zod";

export const ReplySchema = z.object({
	say: z.string(),
	corrections: z.array(
		z.object({ word: z.string(), heard: z.string(), tip: z.string() }),
	),
	new_words: z.array(z.object({ en: z.string(), es: z.string() })),
	learner_name: z.object({ name: z.string() }),
	pace: z.enum(["more_spanish", "same", "more_english"]),
});
