// PostHog in the browser: page views, errors and a few events with timings.
// Privacy: no chat text, names or audio. The chat area and inputs carry
// "ph-no-capture", so session replays and autocapture skip them.
// No VITE_POSTHOG_KEY, no tracking.

import type { PostHog } from "posthog-js";

const KEY = import.meta.env.VITE_POSTHOG_KEY as string | undefined;
const HOST =
	(import.meta.env.VITE_POSTHOG_HOST as string | undefined) ??
	"https://us.i.posthog.com";

// PostHog is big, so it loads after the page is up (its own chunk). Events
// sent before it's ready wait in a small queue.
let posthog: PostHog | undefined;
let started = false;
const queue: ((p: PostHog) => void)[] = [];

const withPostHog = (fn: (p: PostHog) => void) => {
	if (!started) return;
	if (posthog) fn(posthog);
	else if (queue.length < 50) queue.push(fn);
};

export function startAnalytics() {
	if (started || !KEY || typeof window === "undefined") return;
	started = true;
	void import("posthog-js").then(({ default: ph }) => {
		init(ph);
		posthog = ph;
		for (const fn of queue.splice(0)) fn(ph);
	});
}

function init(posthog: PostHog) {
	posthog.init(KEY as string, {
		api_host: HOST,
		person_profiles: "identified_only",
		capture_pageview: "history_change",
		capture_exceptions: true,
		session_recording: { maskAllInputs: true },
	});
	const id = deviceId();
	if (id) posthog.register({ device: id });
}

export function track(event: string, props?: Record<string, unknown>) {
	withPostHog((p) => p.capture(event, props));
}

export function trackError(error: unknown, props?: Record<string, unknown>) {
	withPostHog((p) => p.captureException(error, props));
}

const DEVICE = "iwm:device";

/** A random id for this phone: the profile key until sign-in exists. */
export function deviceId(): string {
	try {
		let id = localStorage.getItem(DEVICE);
		if (!id) {
			id = crypto.randomUUID();
			localStorage.setItem(DEVICE, id);
		}
		return id;
	} catch {
		return "";
	}
}
