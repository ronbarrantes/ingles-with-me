// Free text-to-speech built into the browser (Web Speech API).
// On iPhone every browser (Safari, Chrome, Google) uses Apple's voices.

let voice: SpeechSynthesisVoice | null | undefined;
let warmed = false;

export const canSpeak = () =>
	typeof window !== "undefined" && "speechSynthesis" in window;

/** Higher is better: downloaded Premium/Enhanced voices sound most natural. */
function score(v: SpeechSynthesisVoice) {
	const name = v.name.toLowerCase();
	let s = 0;
	if (v.lang === "en-US" || v.lang === "en_US") s += 10;
	if (name.includes("premium")) s += 6;
	if (name.includes("enhanced")) s += 5;
	if (name.includes("natural")) s += 5;
	if (name.includes("google")) s += 3;
	if (/samantha|ava|allison|aria|jenny|zoe/.test(name)) s += 2;
	// Novelty voices on Apple devices.
	if (
		/bad news|bells|boing|bubbles|cellos|jester|organ|trinoids|whisper|wobble|zarvox|albert|fred|junior|ralph|kathy|superstar|grandma|grandpa|eddy|flo|reed|rocko|sandy|shelley/.test(
			name,
		)
	)
		s -= 20;
	return s;
}

function pickVoice() {
	const en = window.speechSynthesis
		.getVoices()
		.filter((v) => v.lang.toLowerCase().replace("_", "-").startsWith("en"));
	if (!en.length) return undefined; // not loaded yet
	return [...en].sort((a, b) => score(b) - score(a))[0];
}

if (canSpeak()) {
	// Voices load asynchronously; pick again once the list arrives.
	window.speechSynthesis.addEventListener?.("voiceschanged", () => {
		voice = pickVoice();
	});
}

/**
 * iPhone starts the speech engine cold and clips the first word. Speaking
 * a silent utterance on the first tap anywhere warms it up.
 */
export function warmUpSpeech() {
	if (warmed || !canSpeak()) return;
	warmed = true;
	const u = new SpeechSynthesisUtterance(" ");
	u.volume = 0;
	window.speechSynthesis.speak(u);
	voice ??= pickVoice();
}

export function speak(text: string, rate = 0.85) {
	if (!canSpeak()) return;
	const synth = window.speechSynthesis;
	if (!voice) voice = pickVoice();
	const u = new SpeechSynthesisUtterance(text);
	u.lang = voice?.lang ?? "en-US";
	u.rate = rate;
	if (voice) u.voice = voice;
	if (synth.speaking || synth.pending) {
		// Speaking right after cancel() clips the start on iPhone.
		synth.cancel();
		setTimeout(() => synth.speak(u), 60);
	} else {
		synth.speak(u);
	}
}
