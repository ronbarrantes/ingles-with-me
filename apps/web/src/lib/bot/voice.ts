// Speaking Ale's replies: the server's voice (Google Text-to-Speech) when it's
// configured, otherwise, or if it fails, the phone's built-in voice.

import { track, trackError } from "#/lib/analytics";
import { speakParts } from "#/lib/speech";
import { BotError, fetchSpeech } from "./api";
import { audioSessionType, setAudioSession } from "./audioSession";
import { splitLang } from "./segments";

/** In-app volume boost: off for now (see the note in Voice). */
const BOOST = false;

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
	// TURNED OFF (BOOST = false): on iPhone the engine can be paused when the
	// app switches between listening and speaking, and the first line came out
	// silent. TODO: find a reliable way to make Ale louder on iPhone (see
	// docs/TODO.md, "Volume on iPhone"). Google's +4 dB (VOICE_GAIN_DB) stays.
	private ctx?: AudioContext;
	private boosted?: HTMLAudioElement;

	/** Call from a tap, before the first speak(). */
	unlock() {
		this.audio ??= new Audio();
		this.audio.src = silentWav();
		void this.audio.play().catch(() => {});
		if (!BOOST) return;
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

	/**
	 * The element to play through: boosted only if its audio engine is really
	 * running. iPhones pause the engine when switching between listening and
	 * speaking; playing into a paused engine would be silent.
	 */
	private player() {
		if (this.boosted && this.ctx?.state === "running") return this.boosted;
		this.audio ??= new Audio();
		return this.audio;
	}

	/** Try to wake the boost engine (briefly); the plain player is the fallback. */
	private async wake() {
		if (!this.ctx || this.ctx.state === "running") return;
		await Promise.race([
			this.ctx.resume().catch(() => {}),
			new Promise((r) => setTimeout(r, 300)),
		]);
	}

	// Short "Mm-hm" / "A ver…" clips, fetched once and played the moment the
	// learner stops talking, so the wait feels like Ale thinking.
	private clips = new Map<string, Blob>();
	private fillerDone: Promise<void> = Promise.resolve();

	/**
	 * Fetch the filler clips in the background, one at a time (server voice
	 * only), so they never compete with Ale's real lines.
	 */
	async prefetch(lines: { text: string; lang: "en" | "es" }[]) {
		if (!this.useServer || this.prefetching) return;
		this.prefetching = true;
		for (const { text, lang } of lines) {
			if (this.clips.has(text)) continue;
			try {
				this.clips.set(text, await fetchSpeech(text, lang));
			} catch {
				// Skip it; that filler just won't play.
			}
		}
		this.prefetching = false;
	}
	private prefetching = false;

	/** Play a filler right away (if its clip is ready), without waiting for it to end. */
	filler(line: string) {
		const clip = this.clips.get(line);
		if (clip && this.switchSession) setAudioSession("playback");
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
		}
	}

	/**
	 * Switch iPhones to loud "playback" while Ale talks (the mic is released
	 * meanwhile). Off when the learner keeps the mic open all the time.
	 */
	switchSession = true;

	/** How long the last server voice took to arrive, in ms (0 = phone voice). */
	lastFetchMs = 0;

	/**
	 * Speak a line; `onStart` fires when sound starts (for timing).
	 * `ready`: the audio already fetched with the turn (/api/bot/turn), or
	 * null if the server had none (then the phone's voice speaks).
	 */
	async speak(text: string, onStart?: () => void, ready?: Blob | null) {
		this.lastFetchMs = 0;
		await this.fillerDone; // let a "Mm-hm" finish first (it's short)
		// Loud speaker while Ale talks (the mic is released meanwhile).
		// Ask for the loud speaker before EVERY line (iPhones sometimes drop back
		// to quiet call mode after a few turns), and give it a moment to switch.
		if (this.switchSession) {
			setAudioSession("playback");
			await new Promise((r) => setTimeout(r, 150));
		}
		if (ready) {
			try {
				return await this.playBlob(ready, onStart);
			} catch (e) {
				trackError(e, { stage: "voice-play" });
				track("voice_fallback");
			}
		} else if (this.useServer && ready === undefined) {
			try {
				try {
					return await this.playServer(text, onStart);
				} catch (first) {
					// One quick retry (a busy moment); a timeout won't get better.
					if (first instanceof BotError && first.code === "timeout")
						throw first;
					return await this.playServer(text, onStart);
				}
			} catch (e) {
				// Fall through to the phone voice, and tell us it happened.
				trackError(e, { stage: "voice-play" });
				track("voice_fallback");
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
		await this.playBlob(blob, onStart);
	}

	private async playBlob(blob: Blob, onStart?: () => void) {
		await this.wake();
		const url = URL.createObjectURL(blob);
		try {
			await new Promise<void>((done, fail) => {
				this.stopped = done;
				const playOn = (audio: HTMLAudioElement, started: boolean) => {
					audio.onended = () => done();
					audio.onerror = () => fail(new Error("audio playback failed"));
					audio.src = url;
					audio
						.play()
						.then(() => {
							if (!started) {
								onStart?.();
								// What the phone is doing as Ale speaks (for the volume issue).
								track("voice_line", {
									session: audioSessionType(),
									switching: this.switchSession,
									boosted: audio === this.boosted,
								});
							}
							// Boost engine paused by the phone? Then it's silent:
							// switch to the plain player right away.
							if (audio === this.boosted)
								setTimeout(() => {
									if (this.ctx?.state !== "running") {
										audio.pause();
										this.audio ??= new Audio();
										playOn(this.audio, true);
									}
								}, 250);
						})
						.catch(fail);
				};
				playOn(this.player(), false);
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
