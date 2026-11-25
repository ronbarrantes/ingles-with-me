// The voice: picks the provider from VOICE ("provider:voice-name").
// Without it, the page uses the phone's built-in voice.

import { plain, splitLang } from "#/lib/bot/segments";
import { label, mocked, voiceEs, voiceSpec } from "../config";
import { googleReady } from "../google";
import { reportError } from "../telemetry";
import { speakLine as geminiSpeakLine } from "./gemini";
import { speak as googleSpeak } from "./google";

const CHIRP_FALLBACK = "en-US-Chirp3-HD-Aoede";

const providers: Record<
	string,
	{ ready: () => boolean; speak?: typeof googleSpeak }
> = {
	google: { ready: googleReady, speak: googleSpeak },
	gemini: { ready: googleReady },
};

export const voiceLabel = () => label(voiceSpec());
// In mock mode the phone voice is used, so no server voice.
export const voiceReady = () =>
	!mocked() && Boolean(providers[voiceSpec().provider]?.ready());

export interface Speech {
	audio: ArrayBuffer;
	type: "audio/mpeg" | "audio/wav";
}

/**
 * Speak one line. With VOICE=gemini:… one multilingual voice says it all
 * (falling back to Chirp if that fails). With Chirp, Spanish parts marked «like this» get a Spanish voice (the
 * same voice in es-US), so «jugo» has a Spanish j. Mixed lines are made as
 * WAV pieces and joined into one WAV (joined MP3s can stop early on iPhone).
 * If the Spanish voice fails, that piece uses the English one.
 */
export async function voiceSpeak(text: string): Promise<Speech> {
	const { provider, model: configured } = voiceSpec();
	let model = configured;
	if (provider === "gemini") {
		try {
			return { audio: await geminiSpeakLine(model, text), type: "audio/mpeg" };
		} catch (e) {
			// A wrong model name or an outage shouldn't silence Ale: use Chirp.
			void reportError(e, { stage: "voice-gemini", model: configured });
			model = CHIRP_FALLBACK;
		}
	}
	const speak = providers[provider]?.speak ?? googleSpeak;
	const parts = splitLang(text);
	if (parts.length <= 1 && parts[0]?.lang !== "es")
		return { audio: await speak(model, plain(text)), type: "audio/mpeg" };
	const wavs = await Promise.all(
		parts.map((part) =>
			part.lang === "es"
				? speak(voiceEs(), part.text, "LINEAR16").catch((e) => {
						console.warn("spanish voice failed; using english", e);
						return speak(model, part.text, "LINEAR16");
					})
				: speak(model, part.text, "LINEAR16"),
		),
	);
	return { audio: joinWavs(wavs), type: "audio/wav" };
}

/** Join 16-bit PCM WAVs that share a format into one WAV. */
export function joinWavs(wavs: ArrayBuffer[]): ArrayBuffer {
	const pcm: Uint8Array[] = [];
	let rate = 24_000;
	for (const wav of wavs) {
		const v = new DataView(wav);
		// Walk the chunks to find "fmt " (sample rate) and "data".
		let at = 12;
		while (at + 8 <= wav.byteLength) {
			const id = String.fromCharCode(
				v.getUint8(at),
				v.getUint8(at + 1),
				v.getUint8(at + 2),
				v.getUint8(at + 3),
			);
			const size = v.getUint32(at + 4, true);
			if (id === "fmt ") rate = v.getUint32(at + 12, true);
			if (id === "data") {
				pcm.push(
					new Uint8Array(wav, at + 8, Math.min(size, wav.byteLength - at - 8)),
				);
				break;
			}
			at += 8 + size + (size % 2);
		}
	}
	const length = pcm.reduce((n, p) => n + p.byteLength, 0);
	const out = new Uint8Array(44 + length);
	const h = new DataView(out.buffer);
	const tag = (at: number, s: string) => {
		for (let i = 0; i < 4; i++) h.setUint8(at + i, s.charCodeAt(i));
	};
	tag(0, "RIFF");
	h.setUint32(4, 36 + length, true);
	tag(8, "WAVE");
	tag(12, "fmt ");
	h.setUint32(16, 16, true);
	h.setUint16(20, 1, true); // PCM
	h.setUint16(22, 1, true); // mono
	h.setUint32(24, rate, true);
	h.setUint32(28, rate * 2, true);
	h.setUint16(32, 2, true);
	h.setUint16(34, 16, true);
	tag(36, "data");
	h.setUint32(40, length, true);
	let o = 44;
	for (const p of pcm) {
		out.set(p, o);
		o += p.byteLength;
	}
	return out.buffer;
}
