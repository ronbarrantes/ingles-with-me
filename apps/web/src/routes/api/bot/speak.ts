import { createFileRoute } from "@tanstack/react-router";
import { z } from "zod";
import { checkPasscode } from "#/server/guard";
import { reportError } from "#/server/telemetry";
import { voiceLabel, voiceReady, voiceSpeak } from "#/server/voice";

// Ale's line → MP3 (or WAV when it mixes in Spanish). The page falls back to the phone's voice if this fails.
const Body = z.object({ text: z.string().min(1).max(1200) });

export const Route = createFileRoute("/api/bot/speak")({
	server: {
		handlers: {
			POST: async ({ request }) => {
				const denied = checkPasscode(request);
				if (denied) return denied;
				if (!voiceReady())
					return Response.json({ error: "not_configured" }, { status: 503 });
				const parsed = Body.safeParse(await request.json().catch(() => null));
				if (!parsed.success)
					return Response.json({ error: "bad_request" }, { status: 400 });
				try {
					const { audio, type } = await voiceSpeak(parsed.data.text);
					return new Response(audio, {
						headers: {
							"Content-Type": type,
							"Cache-Control": "no-store",
						},
					});
				} catch (e) {
					await reportError(e, { stage: "voice", model: voiceLabel() });
					return Response.json(
						{ error: "voice_error", message: String(e) },
						{ status: 502 },
					);
				}
			},
		},
	},
});
