import { createFileRoute } from "@tanstack/react-router";
import { z } from "zod";
import { checkPasscode } from "#/server/guard";
import { voiceReady, voiceSpeak } from "#/server/voice";

// Alex's line → MP3. The page falls back to the phone's voice if this fails.
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
					const mp3 = await voiceSpeak(parsed.data.text);
					return new Response(mp3, {
						headers: {
							"Content-Type": "audio/mpeg",
							"Cache-Control": "no-store",
						},
					});
				} catch (e) {
					console.error("voice error", e);
					return Response.json(
						{ error: "voice_error", message: String(e) },
						{ status: 502 },
					);
				}
			},
		},
	},
});
