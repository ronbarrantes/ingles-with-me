import { createFileRoute } from "@tanstack/react-router";
import type { Topic, Turn, TurnEvent } from "#/lib/bot/types";
import { checkPasscode } from "#/server/guard";
import { judgeHear, judgeLabel, judgeReady } from "#/server/judge";
import { TurnRequestSchema } from "#/server/requests";
import { reportError } from "#/server/telemetry";
import { runTurn } from "#/server/turn";
import { teacherLabel, teacherReady, tutorReply } from "#/server/tutor";
import { voiceLabel, voiceReady, voiceSpeak } from "#/server/voice";

// One whole turn in one request: judge → teacher → voice, streamed back as
// newline-separated JSON (TurnEvent) so the page can show each step as it
// arrives. Server-to-server hops are faster than three trips from a phone,
// and a future native app needs just this one call.

export const Route = createFileRoute("/api/bot/turn")({
	server: {
		handlers: {
			POST: async ({ request }) => {
				const denied = checkPasscode(request);
				if (denied) return denied;
				if (!teacherReady())
					return Response.json(
						{ error: "not_configured", missing: ["teacher"] },
						{ status: 503 },
					);
				const parsed = TurnRequestSchema.safeParse(
					await request.json().catch(() => null),
				);
				if (!parsed.success)
					return Response.json({ error: "bad_request" }, { status: 400 });
				const {
					topic,
					history,
					audio,
					caption,
					text,
					learner,
					hard,
					focus,
					level,
				} = parsed.data;

				const encoder = new TextEncoder();
				const stream = new ReadableStream({
					async start(controller) {
						const send = (e: TurnEvent) =>
							controller.enqueue(encoder.encode(`${JSON.stringify(e)}\n`));
						try {
							await runTurn(
								{
									topic: topic as Topic,
									history: history as Turn[],
									audio,
									caption,
									text,
									ctx: { learner, hard, focus, level },
								},
								{
									judgeReady,
									judge: async (wav, cap) => {
										const started = Date.now();
										const r = await judgeHear(wav, cap);
										return {
											attempt: r.attempt,
											meta: {
												model: judgeLabel(),
												ms: Date.now() - started,
												inputTokens: r.inputTokens,
												outputTokens: r.outputTokens,
												thoughtTokens: r.thoughtTokens,
												costUsd: null,
											},
										};
									},
									teacher: async (t, h, latest, ctx) => {
										const started = Date.now();
										const r = await tutorReply(t, h, latest, ctx);
										return {
											reply: r.reply,
											meta: {
												model: teacherLabel(),
												ms: Date.now() - started,
												inputTokens: r.inputTokens,
												outputTokens: r.outputTokens,
												costUsd: r.costUsd,
											},
										};
									},
									voiceReady,
									voice: voiceSpeak,
									report: (e, stage) =>
										void reportError(e, {
											stage,
											model:
												stage === "judge"
													? judgeLabel()
													: stage === "voice"
														? voiceLabel()
														: teacherLabel(),
										}),
								},
								send,
							);
						} catch (e) {
							void reportError(e, { stage: "turn" });
							send({ type: "error", stage: "teacher", code: "turn_error" });
							send({ type: "done" });
						} finally {
							controller.close();
						}
					},
				});
				return new Response(stream, {
					headers: {
						"Content-Type": "application/x-ndjson",
						"Cache-Control": "no-store",
					},
				});
			},
		},
	},
});
