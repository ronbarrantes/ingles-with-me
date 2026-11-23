// Listening. Azure hears English and Spanish and scores English pronunciation
// word by word; without Azure, the browser's own recognition (English only,
// no scores) keeps the conversation usable.

import type * as SpeechSdk from "microsoft-cognitiveservices-speech-sdk";
import { fetchSpeechToken } from "./api";
import type { Attempt } from "./types";

export interface Ears {
	readonly scored: boolean;
	/** Listen until stop(); calls onUtterance once per finished phrase. */
	start(handlers: {
		onUtterance: (a: Attempt) => void;
		onPartial?: (text: string) => void;
		onError?: (message: string) => void;
	}): Promise<void>;
	stop(): Promise<void>;
}

type Sdk = typeof SpeechSdk;
let sdkPromise: Promise<Sdk> | undefined;
export const loadSpeechSdk = () => {
	sdkPromise ??= import("microsoft-cognitiveservices-speech-sdk");
	return sdkPromise;
};

export class AzureEars implements Ears {
	readonly scored = true;
	private recognizer?: SpeechSdk.SpeechRecognizer;
	private refresh?: ReturnType<typeof setInterval>;

	async start({
		onUtterance,
		onPartial,
		onError,
	}: Parameters<Ears["start"]>[0]) {
		const sdk = await loadSpeechSdk();
		const { token, region } = await fetchSpeechToken();
		const config = sdk.SpeechConfig.fromAuthorizationToken(token, region);
		// Detect English or Spanish on every phrase, so she can ask in Spanish.
		config.setProperty(
			sdk.PropertyId.SpeechServiceConnection_LanguageIdMode,
			"Continuous",
		);
		const languages = sdk.AutoDetectSourceLanguageConfig.fromLanguages([
			"en-US",
			"es-MX",
		]);
		const recognizer = sdk.SpeechRecognizer.FromConfig(
			config,
			languages,
			sdk.AudioConfig.fromDefaultMicrophoneInput(),
		);
		// Unscripted assessment: no reference text, she can say anything.
		const assessment = new sdk.PronunciationAssessmentConfig(
			"",
			sdk.PronunciationAssessmentGradingSystem.HundredMark,
			sdk.PronunciationAssessmentGranularity.Phoneme,
			false,
		);
		assessment.applyTo(recognizer);

		recognizer.recognizing = (_s, e) => onPartial?.(e.result.text);
		recognizer.recognized = (_s, e) => {
			if (
				e.result.reason !== sdk.ResultReason.RecognizedSpeech ||
				!e.result.text.trim()
			)
				return;
			const lang = sdk.AutoDetectSourceLanguageResult.fromResult(
				e.result,
			).language?.startsWith("es")
				? "es"
				: "en";
			const attempt: Attempt = { text: e.result.text, lang };
			if (lang === "en") {
				try {
					const pa = sdk.PronunciationAssessmentResult.fromResult(e.result);
					attempt.accuracy = pa.accuracyScore;
					attempt.fluency = pa.fluencyScore;
					attempt.words = (pa.detailResult?.Words ?? []).map((w) => ({
						word: w.Word,
						accuracy: w.PronunciationAssessment?.AccuracyScore ?? 0,
						error: w.PronunciationAssessment?.ErrorType ?? "None",
					}));
				} catch {
					// No assessment for this phrase: send it without scores.
				}
			}
			onUtterance(attempt);
		};
		recognizer.canceled = (_s, e) => {
			if (e.reason === sdk.CancellationReason.Error) onError?.(e.errorDetails);
		};

		this.recognizer = recognizer;
		// Tokens last 10 minutes.
		this.refresh = setInterval(async () => {
			try {
				recognizer.authorizationToken = (await fetchSpeechToken()).token;
			} catch {
				// Next refresh will try again.
			}
		}, 8 * 60_000);
		await new Promise<void>((ok, fail) =>
			recognizer.startContinuousRecognitionAsync(ok, fail),
		);
	}

	async stop() {
		clearInterval(this.refresh);
		const r = this.recognizer;
		this.recognizer = undefined;
		if (!r) return;
		await new Promise<void>((ok) =>
			r.stopContinuousRecognitionAsync(ok, () => ok()),
		);
		r.close();
	}
}

// Minimal typing for the browser's (prefixed) Web Speech recognition.
interface BrowserRecognition {
	lang: string;
	continuous: boolean;
	interimResults: boolean;
	onresult:
		| ((e: {
				resultIndex: number;
				results: ArrayLike<
					ArrayLike<{ transcript: string }> & { isFinal: boolean }
				>;
		  }) => void)
		| null;
	onerror: ((e: { error: string }) => void) | null;
	onend: (() => void) | null;
	start(): void;
	stop(): void;
}

export const browserEarsAvailable = () =>
	typeof window !== "undefined" &&
	Boolean(
		(window as unknown as Record<string, unknown>).SpeechRecognition ??
			(window as unknown as Record<string, unknown>).webkitSpeechRecognition,
	);

export class BrowserEars implements Ears {
	readonly scored = false;
	private rec?: BrowserRecognition;
	private on = false;

	async start({
		onUtterance,
		onPartial,
		onError,
	}: Parameters<Ears["start"]>[0]) {
		const w = window as unknown as Record<string, new () => BrowserRecognition>;
		const Ctor = w.SpeechRecognition ?? w.webkitSpeechRecognition;
		const rec = new Ctor();
		rec.lang = "en-US";
		rec.continuous = true;
		rec.interimResults = true;
		rec.onresult = (e) => {
			for (let i = e.resultIndex; i < e.results.length; i++) {
				const r = e.results[i];
				const text = r[0]?.transcript ?? "";
				if (r.isFinal) {
					if (text.trim()) onUtterance({ text: text.trim(), lang: "en" });
				} else onPartial?.(text);
			}
		};
		rec.onerror = (e) => {
			if (e.error !== "no-speech" && e.error !== "aborted") onError?.(e.error);
		};
		// Browsers stop listening on their own after a while: restart while on.
		rec.onend = () => {
			if (this.on) rec.start();
		};
		this.rec = rec;
		this.on = true;
		rec.start();
	}

	async stop() {
		this.on = false;
		this.rec?.stop();
		this.rec = undefined;
	}
}
