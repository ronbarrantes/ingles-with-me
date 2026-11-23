import { createFileRoute } from "@tanstack/react-router";
import { checkPasscode } from "#/server/guard";
import { issueSpeechToken, speechReady } from "#/server/speech";

export const Route = createFileRoute("/api/bot/token")({
	server: {
		handlers: {
			POST: async ({ request }) => {
				const denied = checkPasscode(request);
				if (denied) return denied;
				if (!speechReady()) {
					return Response.json(
						{
							error: "not_configured",
							missing: ["AZURE_SPEECH_KEY", "AZURE_SPEECH_REGION"],
						},
						{ status: 503 },
					);
				}
				try {
					return Response.json(await issueSpeechToken(), {
						headers: { "Cache-Control": "no-store" },
					});
				} catch (e) {
					return Response.json(
						{ error: "speech_error", message: String(e) },
						{ status: 502 },
					);
				}
			},
		},
	},
});
