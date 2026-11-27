import { createFileRoute } from "@tanstack/react-router";
import type { Topic } from "#/lib/bot/topics";
import type { ReplyResponse } from "#/lib/bot/types";
import { checkPasscode } from "#/server/guard";
import { ReplyRequestSchema as RequestSchema } from "#/server/requests";
import { reportError } from "#/server/telemetry";
import { teacherLabel, teacherReady, tutorReply } from "#/server/tutor";

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
				const { topic, history, latest, learner, hard, focus, level } =
					parsed.data;
				const started = Date.now();
				try {
					const r = await tutorReply(topic as Topic, history, latest, {
						learner,
						hard,
						focus,
						level,
					});
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
					await reportError(e, { stage: "teacher", model: teacherLabel() });
					return Response.json(
						{ error: "teacher_error", message: String(e) },
						{ status: 502 },
					);
				}
			},
		},
	},
});
