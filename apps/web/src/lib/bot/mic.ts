// The microphone: records her turn and decides when she has finished talking
// (a short silence after speech). Each turn becomes a small 16 kHz mono WAV
// for the judge.

import { setAudioSession } from "./audioSession";

const TARGET_RATE = 16_000;
const START_CHUNKS = 2; // loud chunks in a row before we call it speech
const END_SILENCE_MS = 1_100; // quiet this long after speech = turn over
const MIN_SPEECH_MS = 350;
const MAX_TURN_MS = 20_000;
const PREROLL_CHUNKS = 4; // keep a little audio from before speech started
const KEEP_TAIL_MS = 250; // of the closing silence; the rest isn't sent

export interface MicHandlers {
	onSpeechStart?: () => void;
	/** Loudness 0–1 about 12 times a second, for the listening bubble. */
	onLevel?: (level: number) => void;
	onTurn: (wavBase64: string, ms: number) => void;
}

export class Mic {
	private ctx?: AudioContext;
	private stream?: MediaStream;
	private node?: ScriptProcessorNode;
	private handlers?: MicHandlers;
	private chunks: Float32Array[] = [];
	private preroll: Float32Array[] = [];
	private speaking = false;
	private loud = 0;
	private quietMs = 0;
	private speechMs = 0;
	private noise = 0.005;

	private source?: MediaStreamAudioSourceNode;

	private getStream() {
		return navigator.mediaDevices.getUserMedia({
			audio: {
				echoCancellation: true,
				noiseSuppression: true,
				autoGainControl: true,
			},
		});
	}

	/**
	 * Ask for the mic. Call from a tap the first time (browsers require it).
	 * After release(), calling it again takes the mic back, keeping the same
	 * audio engine (iPhones won't start a new one without a tap).
	 */
	async open() {
		if (this.ctx && this.stream) return;
		setAudioSession("play-and-record");
		if (this.ctx && this.node) {
			this.stream = await this.getStream();
			this.source = this.ctx.createMediaStreamSource(this.stream);
			this.source.connect(this.node);
			return;
		}
		this.stream = await this.getStream();
		const Ctx =
			window.AudioContext ??
			(window as unknown as { webkitAudioContext: typeof AudioContext })
				.webkitAudioContext;
		const ctx = new Ctx();
		const source = ctx.createMediaStreamSource(this.stream);
		const node = ctx.createScriptProcessor(4096, 1, 1);
		node.onaudioprocess = (e) =>
			this.process(e.inputBuffer.getChannelData(0), ctx.sampleRate);
		source.connect(node);
		this.source = source;
		node.connect(ctx.destination); // needed for processing to run; outputs silence
		this.ctx = ctx;
		this.node = node;
	}

	listen(handlers: MicHandlers) {
		void this.ctx?.resume();
		this.reset();
		this.handlers = handlers;
	}

	pause() {
		this.handlers = undefined;
		this.reset();
	}

	/**
	 * Let go of the mic but keep the audio engine. While a mic is open,
	 * iPhones play sound in "phone call" mode, much quieter.
	 */
	release() {
		this.pause();
		this.source?.disconnect();
		this.source = undefined;
		for (const t of this.stream?.getTracks() ?? []) t.stop();
		this.stream = undefined;
	}

	close() {
		this.pause();
		this.node?.disconnect();
		for (const t of this.stream?.getTracks() ?? []) t.stop();
		void this.ctx?.close();
		this.ctx = undefined;
		this.node = undefined;
		this.stream = undefined;
		this.source = undefined;
	}

	/** The room's background loudness (0-1 scale like onLevel). */
	get noiseLevel() {
		return Math.min(1, this.noise / 0.08);
	}

	private reset() {
		this.chunks = [];
		this.preroll = [];
		this.speaking = false;
		this.loud = 0;
		this.quietMs = 0;
		this.speechMs = 0;
	}

	private process(input: Float32Array, rate: number) {
		if (!this.handlers) return;
		const chunk = new Float32Array(input); // the buffer is reused by the browser
		const ms = (chunk.length / rate) * 1000;
		let sum = 0;
		for (const v of chunk) sum += v * v;
		const rms = Math.sqrt(sum / chunk.length);
		this.handlers.onLevel?.(Math.min(1, rms / 0.08));
		const threshold = Math.max(0.012, this.noise * 3);

		if (!this.speaking) {
			// Track the room's background level while she's quiet.
			this.noise = this.noise * 0.95 + rms * 0.05;
			this.preroll.push(chunk);
			if (this.preroll.length > PREROLL_CHUNKS) this.preroll.shift();
			this.loud = rms > threshold ? this.loud + 1 : 0;
			if (this.loud >= START_CHUNKS) {
				this.speaking = true;
				this.chunks = [...this.preroll];
				this.handlers.onSpeechStart?.();
			}
			return;
		}

		this.chunks.push(chunk);
		this.speechMs += ms;
		this.quietMs = rms < threshold * 0.6 ? this.quietMs + ms : 0;
		if (
			(this.quietMs >= END_SILENCE_MS && this.speechMs >= MIN_SPEECH_MS) ||
			this.speechMs >= MAX_TURN_MS
		) {
			const done = this.handlers;
			// Drop most of the closing silence: smaller upload, faster judge.
			const drop = Math.max(0, Math.floor((this.quietMs - KEEP_TAIL_MS) / ms));
			const audio = this.chunks.slice(0, this.chunks.length - drop);
			const total = this.speechMs;
			this.pause();
			done.onTurn(toWavBase64(audio, rate), total);
		} else if (this.quietMs >= END_SILENCE_MS) {
			this.reset(); // too short to be a turn (a cough, a click)
		}
	}
}

function toWavBase64(chunks: Float32Array[], rate: number) {
	const length = chunks.reduce((n, c) => n + c.length, 0);
	const all = new Float32Array(length);
	let o = 0;
	for (const c of chunks) {
		all.set(c, o);
		o += c.length;
	}
	// Downsample by averaging.
	const ratio = rate / TARGET_RATE;
	const out = new Int16Array(Math.floor(length / ratio));
	for (let i = 0; i < out.length; i++) {
		const start = Math.floor(i * ratio);
		const end = Math.min(length, Math.floor((i + 1) * ratio));
		let s = 0;
		for (let j = start; j < end; j++) s += all[j];
		const v = Math.max(-1, Math.min(1, s / Math.max(1, end - start)));
		out[i] = v < 0 ? v * 0x8000 : v * 0x7fff;
	}
	const header = new DataView(new ArrayBuffer(44));
	const text = (at: number, s: string) => {
		for (let i = 0; i < s.length; i++) header.setUint8(at + i, s.charCodeAt(i));
	};
	text(0, "RIFF");
	header.setUint32(4, 36 + out.byteLength, true);
	text(8, "WAVE");
	text(12, "fmt ");
	header.setUint32(16, 16, true);
	header.setUint16(20, 1, true); // PCM
	header.setUint16(22, 1, true); // mono
	header.setUint32(24, TARGET_RATE, true);
	header.setUint32(28, TARGET_RATE * 2, true);
	header.setUint16(32, 2, true);
	header.setUint16(34, 16, true);
	text(36, "data");
	header.setUint32(40, out.byteLength, true);

	const bytes = new Uint8Array(44 + out.byteLength);
	bytes.set(new Uint8Array(header.buffer), 0);
	bytes.set(new Uint8Array(out.buffer), 44);
	let bin = "";
	for (let i = 0; i < bytes.length; i += 0x8000)
		bin += String.fromCharCode(...bytes.subarray(i, i + 0x8000));
	return btoa(bin);
}
