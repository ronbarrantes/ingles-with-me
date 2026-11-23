import { createFileRoute } from "@tanstack/react-router";
import type { BotStatus } from "#/lib/bot/types";
import { speechReady } from "#/server/speech";
import { tutorModel, tutorReady } from "#/server/tutor";

// Which services are configured. Booleans only, never secrets.
export const Route = createFileRoute("/api/bot/status")({
	server: {
		handlers: {
			GET: async () => {
				const status: BotStatus = {
					tutor: tutorReady(),
					speech: speechReady(),
					passcode: Boolean(process.env.BOT_PASSCODE),
					model: tutorModel(),
				};
				return Response.json(status, {
					headers: { "Cache-Control": "no-store" },
				});
			},
		},
	},
});
