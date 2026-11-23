// Calls to the /api/bot endpoints. The passcode is kept on this device only.

import type {
	Attempt,
	BotStatus,
	HearResponse,
	ReplyResponse,
	Topic,
	Turn,
} from "./types";

const KEY = "iwm:bot-passcode";

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

async function post(path: string, body: unknown) {
	const res = await fetch(path, {
		method: "POST",
		headers: {
			"Content-Type": "application/json",
			"x-bot-passcode": getPasscode(),
		},
		body: JSON.stringify(body),
	});
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

export const fetchStatus = async (): Promise<BotStatus> =>
	(await fetch("/api/bot/status")).json();

export const fetchHear = async (
	audio: string,
	caption: string,
): Promise<HearResponse> =>
	(await post("/api/bot/hear", { audio, caption })).json();

export const fetchReply = async (
	topic: Topic,
	history: Turn[],
	latest: Attempt | null,
): Promise<ReplyResponse> =>
	(await post("/api/bot/reply", { topic, history, latest })).json();

export const fetchSpeech = async (text: string): Promise<Blob> =>
	(await post("/api/bot/speak", { text })).blob();
