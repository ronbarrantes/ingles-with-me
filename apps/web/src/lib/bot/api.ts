// Calls to the /api/bot endpoints. The passcode is kept on this device only.

import type { Attempt, BotStatus, ReplyResponse, Topic, Turn } from "./types";

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

async function post<T>(path: string, body?: unknown): Promise<T> {
	const res = await fetch(path, {
		method: "POST",
		headers: {
			"Content-Type": "application/json",
			"x-bot-passcode": getPasscode(),
		},
		body: body === undefined ? undefined : JSON.stringify(body),
	});
	const data = await res.json().catch(() => ({}));
	if (!res.ok)
		throw new BotError(
			data.error ?? `http_${res.status}`,
			data.missing,
			data.message,
		);
	return data as T;
}

export const fetchStatus = async (): Promise<BotStatus> =>
	(await fetch("/api/bot/status")).json();

export const fetchSpeechToken = () =>
	post<{ token: string; region: string }>("/api/bot/token");

export const fetchReply = (
	topic: Topic,
	history: Turn[],
	latest: Attempt | null,
) => post<ReplyResponse>("/api/bot/reply", { topic, history, latest });
