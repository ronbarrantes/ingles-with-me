// Server errors to PostHog (error tracking). No chat text or audio is sent:
// only the error, the stage and the model. No key, no reporting.

import { PostHog } from "posthog-node";

const key = () => process.env.POSTHOG_KEY || process.env.VITE_POSTHOG_KEY;
const host = () =>
	process.env.POSTHOG_HOST ||
	process.env.VITE_POSTHOG_HOST ||
	"https://us.i.posthog.com";

let client: PostHog | undefined;

export async function reportError(
	error: unknown,
	props: Record<string, string | number | boolean | undefined>,
) {
	console.error(`[${props.stage ?? "server"}]`, error);
	const k = key();
	if (!k) return;
	try {
		client ??= new PostHog(k, { host: host(), flushAt: 1, flushInterval: 0 });
		await client.captureExceptionImmediate(error, {
			distinctId: "server",
			properties: { ...props, source: "server" },
		});
	} catch (e) {
		console.warn("posthog: could not report", e);
	}
}
