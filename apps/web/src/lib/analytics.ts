// PostHog in the browser: page views, errors and a few events with timings.
// Privacy: no chat text, names or audio. The chat area and inputs carry
// "ph-no-capture", so session replays and autocapture skip them.
// No VITE_POSTHOG_KEY, no tracking.

import posthog from "posthog-js";

const KEY = import.meta.env.VITE_POSTHOG_KEY as string | undefined;
const HOST =
	(import.meta.env.VITE_POSTHOG_HOST as string | undefined) ??
	"https://us.i.posthog.com";

let started = false;

export function startAnalytics() {
	if (started || !KEY || typeof window === "undefined") return;
	started = true;
	posthog.init(KEY, {
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
	if (started) posthog.capture(event, props);
}

export function trackError(error: unknown, props?: Record<string, unknown>) {
	if (started) posthog.captureException(error, props);
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
