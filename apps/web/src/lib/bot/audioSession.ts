// iPhone Safari (iOS 17+) lets a page say how it uses audio. "playback" plays
// through the loud speaker like music; "play-and-record" is the quieter
// call-style mode needed while the mic is on. Elsewhere this does nothing.

type SessionType = "auto" | "playback" | "play-and-record";

/** The current iOS audio session type, for diagnostics ("n/a" elsewhere). */
export function audioSessionType(): string {
	try {
		const nav = navigator as Navigator & { audioSession?: { type: string } };
		return nav.audioSession?.type ?? "n/a";
	} catch {
		return "n/a";
	}
}

export function setAudioSession(type: SessionType) {
	try {
		const nav = navigator as Navigator & {
			audioSession?: { type: SessionType };
		};
		if (nav.audioSession) nav.audioSession.type = type;
	} catch {
		// Not supported: nothing to do.
	}
}
