// Free text-to-speech built into the browser (Web Speech API).

let voice: SpeechSynthesisVoice | null | undefined;

function pickVoice() {
	const voices = window.speechSynthesis.getVoices();
	if (!voices.length) return undefined;
	const en = voices.filter((v) => v.lang.toLowerCase().startsWith("en"));
	return (
		en.find((v) => v.lang === "en-US" && v.localService) ??
		en.find((v) => v.lang === "en-US") ??
		en[0] ??
		null
	);
}

export const canSpeak = () =>
	typeof window !== "undefined" && "speechSynthesis" in window;

export function speak(text: string, rate = 0.85) {
	if (!canSpeak()) return;
	const synth = window.speechSynthesis;
	if (voice === undefined) voice = pickVoice();
	synth.cancel();
	const u = new SpeechSynthesisUtterance(text);
	u.lang = "en-US";
	u.rate = rate;
	if (voice) u.voice = voice;
	synth.speak(u);
}
