// Speaking Ale's replies: the server's voice (Google Text-to-Speech) when it's
// configured, otherwise, or if it fails, the phone's built-in voice.

import { speak as phoneSpeak } from "#/lib/speech";
import { fetchSpeech } from "./api";

// English voices read "Ale" like the beer ("ail"); spell it the Spanish way.
const sayable = (text: string) => text.replace(/\bAle\b/g, "Ah-leh");

// A short silent WAV, played on the first tap so iPhones allow audio later.
function silentWav() {
	const samples = 1600; // 0.1 s at 16 kHz
	const v = new DataView(new ArrayBuffer(44 + samples * 2));
	const text = (at: number, str: string) => {
		for (let i = 0; i < str.length; i++) v.setUint8(at + i, str.charCodeAt(i));
	};
	text(0, "RIFF");
	v.setUint32(4, 36 + samples * 2, true);
	text(8, "WAVE");
	text(12, "fmt ");
	v.setUint32(16, 16, true);
	v.setUint16(20, 1, true);
	v.setUint16(22, 1, true);
	v.setUint32(24, 16000, true);
	v.setUint32(28, 32000, true);
	v.setUint16(32, 2, true);
	v.setUint16(34, 16, true);
	text(36, "data");
	v.setUint32(40, samples * 2, true);
	let bin = "";
	for (const b of new Uint8Array(v.buffer)) bin += String.fromCharCode(b);
	return `data:audio/wav;base64,${btoa(bin)}`;
}

export class Voice {
	private audio?: HTMLAudioElement;
	private stopped?: () => void;
	private useServer: boolean;

	constructor(useServer: boolean) {
		this.useServer = useServer;
	}

	/** Call from a tap, before the first speak(). */
	unlock() {
		this.audio ??= new Audio();
		this.audio.src = silentWav();
		void this.audio.play().catch(() => {});
	}

	async speak(line: string) {
		const text = sayable(line);
		if (this.useServer) {
			try {
				return await this.playServer(text);
			} catch {
				// Fall through to the phone voice.
			}
		}
		await this.playPhone(text);
	}

	stop() {
		this.audio?.pause();
		if (typeof window !== "undefined") window.speechSynthesis?.cancel();
		this.stopped?.();
	}

	private async playServer(text: string) {
		const blob = await fetchSpeech(text);
		const url = URL.createObjectURL(blob);
		this.audio ??= new Audio();
		const audio = this.audio;
		try {
			await new Promise<void>((done, fail) => {
				this.stopped = done;
				audio.onended = () => done();
				audio.onerror = () => fail(new Error("audio playback failed"));
				audio.src = url;
				audio.play().catch(fail);
			});
		} finally {
			this.stopped = undefined;
			URL.revokeObjectURL(url);
		}
	}

	private playPhone(text: string) {
		return new Promise<void>((done) => {
			if (typeof window === "undefined" || !("speechSynthesis" in window))
				return done();
			this.stopped = done;
			phoneSpeak(text, 0.95);
			// Wait for the utterance to start, then to finish.
			setTimeout(() => {
				const check = setInterval(() => {
					if (
						!window.speechSynthesis.speaking &&
						!window.speechSynthesis.pending
					) {
						clearInterval(check);
						this.stopped = undefined;
						done();
					}
				}, 200);
			}, 500);
		});
	}
}
