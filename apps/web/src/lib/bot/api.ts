// Calls to the /api/bot endpoints. The passcode is kept on this device only.

import type {
	Attempt,
	BotStatus,
	HardWord,
	HearResponse,
	LearnerName,
	ReplyResponse,
	Topic,
	Turn,
} from "./types";

const KEY = "iwm:bot-passcode";

/** How long each step may take before the page moves on without it. */
export const TIMEOUT = { judge: 12_000, teacher: 25_000, voice: 12_000 };

export const getPasscode = () => {
	try {
		return localStorage.getItem(KEY) ?? "";
	} catch {
		return "";
	}
};
export const setPasscode = (p: string) => {
	try {
		localStorage.setItem(KEY, p);
	} catch {
		// Private mode: it lasts until the page closes.
	}
};

export class BotError extends Error {
	constructor(
		readonly code: string,
		readonly missing: string[] = [],
		message?: string,
	) {
		super(message ?? code);
	}
}

/** A request that takes longer than `timeoutMs` fails with BotError("timeout"). */
async function post(path: string, body: unknown, timeoutMs = 30_000) {
	const abort = new AbortController();
	const timer = setTimeout(() => abort.abort(), timeoutMs);
	let res: Response;
	try {
		res = await fetch(path, {
			method: "POST",
			headers: {
				"Content-Type": "application/json",
				"x-bot-passcode": encodeURIComponent(getPasscode()),
			},
			body: JSON.stringify(body),
			signal: abort.signal,
		});
	} catch (e) {
		if (abort.signal.aborted) throw new BotError("timeout");
		throw e;
	} finally {
		clearTimeout(timer);
	}
	if (!res.ok) {
		const data = await res.json().catch(() => ({}));
		throw new BotError(
			data.error ?? `http_${res.status}`,
			data.missing,
			data.message,
		);
	}
	return res;
}

/** Throws BotError("wrong_passcode" | "not_configured") if the saved code doesn't work. */
export const checkSavedPasscode = async () => {
	await post("/api/bot/check", {});
};

export const fetchStatus = async (): Promise<BotStatus> =>
	(await fetch("/api/bot/status")).json();

export const fetchHear = async (
	audio: string,
	caption: string,
): Promise<HearResponse> =>
	(await post("/api/bot/hear", { audio, caption }, TIMEOUT.judge)).json();

export const fetchReply = async (
	topic: Topic,
	history: Turn[],
	latest: Attempt | null,
	learner: LearnerName | null,
	hard: HardWord[],
	focus: string[],
): Promise<ReplyResponse> =>
	(
		await post(
			"/api/bot/reply",
			{
				topic,
				history,
				latest,
				learner,
				hard,
				focus,
			},
			TIMEOUT.teacher,
		)
	).json();

export const fetchSpeech = async (text: string): Promise<Blob> =>
	(await post("/api/bot/speak", { text }, TIMEOUT.voice)).blob();
