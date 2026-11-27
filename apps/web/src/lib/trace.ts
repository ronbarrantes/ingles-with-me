// A detailed, numbered timeline of what the app does in a conversation, sent
// to PostHog as "trace" events (area + step). While Ale is new this is on
// everywhere, on purpose: the iPhone's audio is a black box and the trace is
// how we see what happened. Trim it later if the volume gets too high.

import { track } from "./analytics";

let visit = "";
let started = 0;
let seq = 0;

function now() {
	return typeof performance === "undefined" ? 0 : performance.now();
}

/** Group the following steps under one visit to the Ale page. */
export function traceVisit() {
	visit = Math.random().toString(36).slice(2, 10);
	started = now();
	seq = 0;
}

export type TraceArea = "mic" | "voice" | "turn" | "ui" | "page";

export function trace(
	area: TraceArea,
	step: string,
	props?: Record<string, unknown>,
) {
	try {
		track("trace", {
			area,
			step,
			visit,
			seq: seq++,
			t: Math.round(now() - started),
			page:
				typeof document === "undefined" ? undefined : document.visibilityState,
			...props,
		});
	} catch {
		// Tracing must never break the app.
	}
}
