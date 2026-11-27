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
	TurnEvent,
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
	level: { value: 1 | 2 | 3 | 4; first: boolean },
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
				level,
			},
			TIMEOUT.teacher,
		)
	).json();

export const fetchSpeech = async (
	text: string,
	quick?: "en" | "es",
): Promise<Blob> =>
	(await post("/api/bot/speak", { text, quick }, TIMEOUT.voice)).blob();

export interface TurnBody {
	topic: Topic;
	history: Turn[];
	audio?: string;
	caption?: string;
	text?: string;
	learner: LearnerName | null;
	hard: HardWord[];
	focus: string[];
	level: { value: 1 | 2 | 3 | 4; first: boolean };
}

/**
 * One whole turn in one request (/api/bot/turn): calls `onEvent` for each
 * step as it streams in. Gives up with BotError("timeout") if nothing new
 * arrives for `idleMs`.
 */
export async function fetchTurn(
	body: TurnBody,
	onEvent: (e: TurnEvent) => void,
	idleMs = 30_000,
) {
	const abort = new AbortController();
	let timer = setTimeout(() => abort.abort(), idleMs);
	const poke = () => {
		clearTimeout(timer);
		timer = setTimeout(() => abort.abort(), idleMs);
	};
	try {
		const res = await fetch("/api/bot/turn", {
			method: "POST",
			headers: {
				"Content-Type": "application/json",
				"x-bot-passcode": encodeURIComponent(getPasscode()),
			},
			body: JSON.stringify(body),
			signal: abort.signal,
		});
		if (!res.ok || !res.body) {
			const data = await res.json().catch(() => ({}));
			throw new BotError(
				data.error ?? `http_${res.status}`,
				data.missing,
				data.message,
			);
		}
		const reader = res.body.getReader();
		const decoder = new TextDecoder();
		let buffer = "";
		for (;;) {
			const { value, done } = await reader.read();
			if (done) break;
			poke();
			buffer += decoder.decode(value, { stream: true });
			let nl = buffer.indexOf("\n");
			while (nl >= 0) {
				const line = buffer.slice(0, nl).trim();
				buffer = buffer.slice(nl + 1);
				if (line) onEvent(JSON.parse(line) as TurnEvent);
				nl = buffer.indexOf("\n");
			}
		}
	} catch (e) {
		if (abort.signal.aborted) throw new BotError("timeout");
		throw e;
	} finally {
		clearTimeout(timer);
	}
}
