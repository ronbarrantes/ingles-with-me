// Speaking Sam's replies: Azure's natural multilingual voice, or the phone's
// built-in voice as a fallback.

import { speak as browserSpeak } from "#/lib/speech";
import { fetchSpeechToken } from "./api";
import { loadSpeechSdk } from "./ears";

export interface Voice {
	speak(text: string): Promise<void>;
	stop(): void;
}

const AZURE_VOICE = "en-US-AvaMultilingualNeural";

export class AzureVoice implements Voice {
	private token?: { token: string; region: string; at: number };
	private stopCurrent?: () => void;

	private async auth() {
		if (!this.token || Date.now() - this.token.at > 8 * 60_000) {
			this.token = { ...(await fetchSpeechToken()), at: Date.now() };
		}
		return this.token;
	}

	async speak(text: string) {
		const sdk = await loadSpeechSdk();
		const { token, region } = await this.auth();
		const config = sdk.SpeechConfig.fromAuthorizationToken(token, region);
		config.speechSynthesisVoiceName = AZURE_VOICE;
		const player = new sdk.SpeakerAudioDestination();
		const synth = new sdk.SpeechSynthesizer(
			config,
			sdk.AudioConfig.fromSpeakerOutput(player),
		);
		await new Promise<void>((done) => {
			const finish = () => {
				this.stopCurrent = undefined;
				synth.close();
				done();
			};
			// Resolve when the audio has finished playing, not when it's synthesized.
			player.onAudioEnd = finish;
			this.stopCurrent = () => {
				player.pause();
				finish();
			};
			synth.speakTextAsync(
				text,
				(result) => {
					if (result.reason !== sdk.ResultReason.SynthesizingAudioCompleted)
						finish();
				},
				() => finish(),
			);
		});
	}

	stop() {
		this.stopCurrent?.();
	}
}

export class BrowserVoice implements Voice {
	speak(text: string) {
		return new Promise<void>((done) => {
			if (typeof window === "undefined" || !("speechSynthesis" in window))
				return done();
			browserSpeak(text, 0.95);
			// Wait for the utterance queued by speak() to start, then to finish.
			setTimeout(() => {
				const check = setInterval(() => {
					if (
						!window.speechSynthesis.speaking &&
						!window.speechSynthesis.pending
					) {
						clearInterval(check);
						done();
					}
				}, 200);
			}, 500);
		});
	}

	stop() {
		if (typeof window !== "undefined") window.speechSynthesis?.cancel();
	}
}
