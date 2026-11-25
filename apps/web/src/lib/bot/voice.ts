// Speaking Ale's replies: the server's voice (Google Text-to-Speech) when it's
// configured, otherwise, or if it fails, the phone's built-in voice.

import { speakParts } from "#/lib/speech";
import { fetchSpeech } from "./api";
import { setAudioSession } from "./audioSession";
import { splitLang } from "./segments";

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

	// Ale's voice goes through a compressor and a gain stage when possible:
	// louder without crackling, like radio. Needs an audio engine started by a tap.
	private ctx?: AudioContext;
	private boosted?: HTMLAudioElement;

	/** Call from a tap, before the first speak(). */
	unlock() {
		this.audio ??= new Audio();
		this.audio.src = silentWav();
		void this.audio.play().catch(() => {});
		try {
			if (!this.ctx) {
				const Ctx =
					window.AudioContext ??
					(window as unknown as { webkitAudioContext: typeof AudioContext })
						.webkitAudioContext;
				const ctx = new Ctx();
				const el = new Audio();
				const source = ctx.createMediaElementSource(el);
				const comp = ctx.createDynamicsCompressor();
				comp.threshold.value = -24;
				comp.knee.value = 12;
				comp.ratio.value = 6;
				comp.attack.value = 0.003;
				comp.release.value = 0.2;
				const gain = ctx.createGain();
				gain.gain.value = 2.2;
				source.connect(comp).connect(gain).connect(ctx.destination);
				this.ctx = ctx;
				this.boosted = el;
			}
			// iPhones want each player started from a tap once.
			if (this.boosted) {
				this.boosted.src = silentWav();
				void this.boosted.play().catch(() => {});
			}
			void this.ctx.resume();
		} catch {
			this.ctx = undefined;
			this.boosted = undefined;
		}
	}

	/** The element to play through: boosted if its engine is running. */
	private player() {
		if (this.boosted && this.ctx?.state === "running") return this.boosted;
		this.audio ??= new Audio();
		return this.audio;
	}

	// Short "Mm-hm" / "A ver…" clips, fetched once and played the moment the
	// learner stops talking, so the wait feels like Ale thinking.
	private clips = new Map<string, Blob>();
	private fillerDone: Promise<void> = Promise.resolve();

	/** Fetch the filler clips in the background (server voice only). */
	prefetch(lines: string[]) {
		if (!this.useServer) return;
		for (const line of lines)
			if (!this.clips.has(line))
				fetchSpeech(line)
					.then((b) => this.clips.set(line, b))
					.catch(() => {});
	}

	/** Play a filler right away, without waiting for it to end. */
	filler(line: string) {
		setAudioSession("playback");
		const clip = this.clips.get(line);
		if (clip) {
			const url = URL.createObjectURL(clip);
			const audio = this.player();
			this.fillerDone = new Promise<void>((done) => {
				const end = () => {
					URL.revokeObjectURL(url);
					done();
				};
				audio.onended = end;
				audio.onerror = end;
				audio.src = url;
				audio.play().catch(end);
				setTimeout(end, 2500); // never hold up Ale's reply for long
			});
		} else if (!this.useServer && typeof window !== "undefined") {
			speakParts(splitLang(line), 1);
		}
	}

	/** How long the last server voice took to arrive, in ms (0 = phone voice). */
	lastFetchMs = 0;

	/** Speak a line; `onStart` fires when sound starts (for timing). */
	async speak(text: string, onStart?: () => void) {
		this.lastFetchMs = 0;
		await this.fillerDone; // let a "Mm-hm" finish first (it's short)
		// Loud speaker while Ale talks (the mic is released meanwhile).
		setAudioSession("playback");
		if (this.useServer) {
			try {
				return await this.playServer(text, onStart);
			} catch {
				// Fall through to the phone voice.
			}
		}
		onStart?.();
		await this.playPhone(text);
	}

	stop() {
		this.audio?.pause();
		this.boosted?.pause();
		if (typeof window !== "undefined") window.speechSynthesis?.cancel();
		this.stopped?.();
	}

	private async playServer(text: string, onStart?: () => void) {
		const asked = performance.now();
		const blob = await fetchSpeech(text);
		this.lastFetchMs = Math.round(performance.now() - asked);
		const url = URL.createObjectURL(blob);
		const audio = this.player();
		try {
			await new Promise<void>((done, fail) => {
				this.stopped = done;
				audio.onended = () => done();
				audio.onerror = () => fail(new Error("audio playback failed"));
				audio.src = url;
				audio
					.play()
					.then(() => onStart?.())
					.catch(fail);
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
			speakParts(splitLang(text), 0.95);
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
