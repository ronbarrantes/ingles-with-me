import { createFileRoute } from "@tanstack/react-router";
import { z } from "zod";
import type { HearResponse } from "#/lib/bot/types";
import { checkPasscode } from "#/server/guard";
import { judgeHear, judgeLabel, judgeReady } from "#/server/judge";
import { reportError } from "#/server/telemetry";

// One recorded turn (16 kHz mono WAV, base64) → what she said + scores.
// ~20 s of audio is under 1 MB of base64; anything bigger is refused.
const Body = z.object({
	audio: z.string().min(100).max(1_500_000),
	caption: z.string().max(600).default(""),
});

export const Route = createFileRoute("/api/bot/hear")({
	server: {
		handlers: {
			POST: async ({ request }) => {
				const denied = checkPasscode(request);
				if (denied) return denied;
				if (!judgeReady()) {
					return Response.json(
						{
							error: "not_configured",
							missing: ["GOOGLE_SERVICE_ACCOUNT_JSON"],
						},
						{ status: 503 },
					);
				}
				const parsed = Body.safeParse(await request.json().catch(() => null));
				if (!parsed.success)
					return Response.json({ error: "bad_request" }, { status: 400 });
				const started = Date.now();
				try {
					const r = await judgeHear(parsed.data.audio, parsed.data.caption);
					const body: HearResponse = {
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
					return Response.json(body);
				} catch (e) {
					await reportError(e, { stage: "judge", model: judgeLabel() });
					return Response.json(
						{ error: "judge_error", message: String(e) },
						{ status: 502 },
					);
				}
			},
		},
	},
});
