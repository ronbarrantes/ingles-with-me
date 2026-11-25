// Calls to the /api/bot endpoints. The passcode is kept on this device only.

import { deviceId } from "#/lib/analytics";
import type { Interests } from "./topics";
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
			"x-bot-passcode": encodeURIComponent(getPasscode()),
			"x-device-id": deviceId(),
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
	(await post("/api/bot/hear", { audio, caption })).json();

export const fetchReply = async (
	topic: Topic,
	history: Turn[],
	latest: Attempt | null,
	learner: LearnerName | null,
	hard: HardWord[],
	focus: string[],
): Promise<ReplyResponse> =>
	(
		await post("/api/bot/reply", {
			topic,
			history,
			latest,
			learner,
			hard,
			focus,
		})
	).json();

export const fetchSpeech = async (text: string): Promise<Blob> =>
	(await post("/api/bot/speak", { text })).blob();

/** What the server remembers for this device; null when nothing or no database. */
export async function fetchProfile(): Promise<RemoteProfile | null> {
	const res = await fetch("/api/bot/profile", {
		headers: {
			"x-bot-passcode": encodeURIComponent(getPasscode()),
			"x-device-id": deviceId(),
		},
	});
	if (res.status === 204 || !res.ok) return null;
	return res.json();
}

export interface RemoteProfile {
	learner: LearnerName | null;
	hard: HardWord[];
	interests: Interests | null;
	updatedAt: number;
}

let pending: Partial<Omit<RemoteProfile, "updatedAt">> = {};
let timer: ReturnType<typeof setTimeout> | undefined;

/** Save changes to the server a moment later, batched. Fails quietly. */
export function pushProfile(patch: Partial<Omit<RemoteProfile, "updatedAt">>) {
	pending = { ...pending, ...patch };
	clearTimeout(timer);
	timer = setTimeout(() => {
		const body = pending;
		pending = {};
		void post("/api/bot/profile", body).catch(() => {});
	}, 1500);
}

/** Delete this device's profile on the server. Fails quietly. */
export async function deleteProfile() {
	await fetch("/api/bot/profile", {
		method: "DELETE",
		headers: {
			"x-bot-passcode": encodeURIComponent(getPasscode()),
			"x-device-id": deviceId(),
		},
	}).catch(() => {});
}
