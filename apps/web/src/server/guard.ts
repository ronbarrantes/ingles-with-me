// /ale spends real money, so its endpoints need the passcode (BOT_PASSCODE).

import { createHash, timingSafeEqual } from "node:crypto";

// Forgiving on purpose: phones add capitals and stray spaces, and copied env
// values can carry whitespace. The header is URI-encoded so accents work.
function normalize(s: string) {
	let out = s;
	try {
		out = decodeURIComponent(s);
	} catch {
		// Not encoded: use as is.
	}
	return out.normalize("NFC").trim().toLowerCase();
}

const digest = (s: string) =>
	createHash("sha256").update(normalize(s)).digest();

export function checkPasscode(request: Request): Response | null {
	const expected = process.env.BOT_PASSCODE?.trim();
	if (!expected)
		return Response.json(
			{ error: "not_configured", missing: ["BOT_PASSCODE"] },
			{ status: 503 },
		);
	const given = request.headers.get("x-bot-passcode") ?? "";
	if (!timingSafeEqual(digest(given), digest(expected))) {
		return Response.json({ error: "wrong_passcode" }, { status: 401 });
	}
	return null;
}
