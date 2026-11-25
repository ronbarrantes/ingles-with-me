import { createFileRoute } from "@tanstack/react-router";
import type { BotStatus } from "#/lib/bot/types";
import { mocked } from "#/server/config";
import { dbReady } from "#/server/db";
import { judgeLabel, judgeReady } from "#/server/judge";
import { teacherLabel, teacherReady } from "#/server/tutor";
import { voiceLabel, voiceReady } from "#/server/voice";

// Which roles are configured, and with what. Never secrets.
export const Route = createFileRoute("/api/bot/status")({
	server: {
		handlers: {
			GET: async () => {
				const status: BotStatus = {
					teacher: { ready: teacherReady(), label: teacherLabel() },
					judge: { ready: judgeReady(), label: judgeLabel() },
					voice: { ready: voiceReady(), label: voiceLabel() },
					passcode: Boolean(process.env.BOT_PASSCODE),
					mock: mocked(),
					db: dbReady(),
				};
				return Response.json(status, {
					headers: { "Cache-Control": "no-store" },
				});
			},
		},
	},
});
