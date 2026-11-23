// The voice: picks the provider from VOICE ("provider:voice-name").
// Without it, the page uses the phone's built-in voice.

import { label, mocked, voiceSpec } from "../config";
import { googleReady } from "../google";
import { speak as googleSpeak } from "./google";

const providers: Record<
	string,
	{ ready: () => boolean; speak: typeof googleSpeak }
> = {
	google: { ready: googleReady, speak: googleSpeak },
};

export const voiceLabel = () => label(voiceSpec());
// In mock mode the phone voice is used, so no server voice.
export const voiceReady = () =>
	!mocked() && Boolean(providers[voiceSpec().provider]?.ready());

export async function voiceSpeak(text: string) {
	const { provider, model } = voiceSpec();
	const p = providers[provider];
	if (!p) throw new Error(`unknown voice provider "${provider}"`);
	return p.speak(model, text);
}
