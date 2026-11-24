import { createFileRoute } from "@tanstack/react-router";
import { checkPasscode } from "#/server/guard";

// Lets the passcode screen say "wrong code" right away, before the mic.
export const Route = createFileRoute("/api/bot/check")({
	server: {
		handlers: {
			POST: async ({ request }) =>
				checkPasscode(request) ?? Response.json({ ok: true }),
		},
	},
});
