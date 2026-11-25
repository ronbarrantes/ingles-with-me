// Ale's voice with Google Cloud Text-to-Speech. The model part of VOICE is a
// Google voice name, e.g. en-US-Chirp3-HD-Aoede.

import { googleToken } from "../google";

// A few dB louder, for kitchens and noisy rooms (VOICE_GAIN_DB, default 4,
// Google allows up to 16). Voices that don't take it get the call without.
const gainDb = () => Number(process.env.VOICE_GAIN_DB ?? 4);
let gainOk = true;

export async function speak(
	voice: string,
	text: string,
	encoding: "MP3" | "LINEAR16" = "MP3",
): Promise<ArrayBuffer> {
	try {
		return await synth(voice, text, encoding, gainOk ? gainDb() : 0);
	} catch (e) {
		if (!gainOk || !gainDb() || !/volume|gain/i.test(String(e))) throw e;
		gainOk = false;
		return synth(voice, text, encoding, 0);
	}
}

async function synth(
	voice: string,
	text: string,
	encoding: "MP3" | "LINEAR16",
	volumeGainDb: number,
): Promise<ArrayBuffer> {
	const languageCode = voice.split("-").slice(0, 2).join("-") || "en-US";
	const res = await fetch(
		"https://texttospeech.googleapis.com/v1/text:synthesize",
		{
			method: "POST",
			headers: {
				Authorization: `Bearer ${await googleToken()}`,
				"Content-Type": "application/json",
			},
			body: JSON.stringify({
				input: { text },
				voice: { languageCode, name: voice },
				audioConfig: {
					audioEncoding: encoding,
					...(encoding === "LINEAR16" && { sampleRateHertz: 24_000 }),
					...(volumeGainDb && { volumeGainDb }),
				},
			}),
		},
	);
	if (!res.ok)
		throw new Error(`Google TTS failed: ${res.status} ${await res.text()}`);
	const { audioContent } = (await res.json()) as { audioContent: string };
	const buf = Buffer.from(audioContent, "base64");
	return buf.buffer.slice(
		buf.byteOffset,
		buf.byteOffset + buf.byteLength,
	) as ArrayBuffer;
}
