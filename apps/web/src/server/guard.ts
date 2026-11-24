// /ale spends real money, so its endpoints need the passcode (BOT_PASSCODE).

import { timingSafeEqual } from "node:crypto";

export function checkPasscode(request: Request): Response | null {
	const expected = process.env.BOT_PASSCODE;
	if (!expected)
		return Response.json(
			{ error: "not_configured", missing: ["BOT_PASSCODE"] },
			{ status: 503 },
		);
	const given = request.headers.get("x-bot-passcode") ?? "";
	const a = Buffer.from(given);
	const b = Buffer.from(expected);
	if (a.length !== b.length || !timingSafeEqual(a, b)) {
		return Response.json({ error: "wrong_passcode" }, { status: 401 });
	}
	return null;
}
