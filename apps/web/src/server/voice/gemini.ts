// Ale's voice on Gemini TTS (through Cloud Text-to-Speech): one multilingual
// voice for the whole line, so Spanish words («jugo») are said with a Spanish
// accent by the same voice instead of a second voice cutting in.
// VOICE=gemini:<model>/<voice>, e.g. gemini:gemini-2.5-flash-tts/Aoede

import { plain, splitLang } from "#/lib/bot/segments";
import { googleToken } from "../google";

const STYLE =
	"Read this as Ale, a warm, relaxed adult talking with a friend: natural pace, conversational, not overly cheerful.";

export async function speakLine(model: string, line: string) {
	const [modelName, voiceName = "Aoede"] = model.split("/");
	const spanish = splitLang(line)
		.filter((s) => s.lang === "es")
		.map((s) => s.text);
	const prompt = spanish.length
		? `${STYLE} The text is English with some Spanish. Say these Spanish parts with a natural Latin American Spanish accent, in the same voice: ${spanish.join("; ")}.`
		: STYLE;
	const res = await fetch(
		"https://texttospeech.googleapis.com/v1/text:synthesize",
		{
			method: "POST",
			headers: {
				Authorization: `Bearer ${await googleToken()}`,
				"Content-Type": "application/json",
			},
			body: JSON.stringify({
				input: { text: plain(line), prompt },
				voice: { languageCode: "en-US", name: voiceName, modelName },
				audioConfig: { audioEncoding: "MP3" },
			}),
		},
	);
	if (!res.ok)
		throw new Error(`Gemini TTS failed: ${res.status} ${await res.text()}`);
	const { audioContent } = (await res.json()) as { audioContent: string };
	const buf = Buffer.from(audioContent, "base64");
	return buf.buffer.slice(
		buf.byteOffset,
		buf.byteOffset + buf.byteLength,
	) as ArrayBuffer;
}
