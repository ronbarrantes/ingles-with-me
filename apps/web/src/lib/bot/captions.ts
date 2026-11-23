// Live words while she talks, from the browser's own speech recognition.
// Best effort: English only, and some phones can't run it next to the
// recorder. When it fails, the page simply shows her words once she's done.

interface Recognition {
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

type Ctor = new () => Recognition;
const ctor = (): Ctor | undefined => {
	if (typeof window === "undefined") return undefined;
	const w = window as unknown as {
		SpeechRecognition?: Ctor;
		webkitSpeechRecognition?: Ctor;
	};
	return w.SpeechRecognition ?? w.webkitSpeechRecognition;
};

export const captionsAvailable = () => Boolean(ctor());

export class Captions {
	private rec?: Recognition;
	private on = false;
	private broken = false;
	private finals = "";

	/** Start showing live words; `onText` gets the running caption. */
	start(onText: (text: string) => void) {
		const C = ctor();
		if (!C || this.broken) return;
		this.finals = "";
		const rec = new C();
		rec.lang = "en-US";
		rec.continuous = true;
		rec.interimResults = true;
		rec.onresult = (e) => {
			let interim = "";
			for (let i = e.resultIndex; i < e.results.length; i++) {
				const r = e.results[i];
				if (r.isFinal) this.finals += `${r[0]?.transcript ?? ""} `;
				else interim += r[0]?.transcript ?? "";
			}
			onText(`${this.finals}${interim}`.trim());
		};
		rec.onerror = (e) => {
			// Mic busy or not allowed: give up on captions for this session.
			if (
				e.error === "audio-capture" ||
				e.error === "not-allowed" ||
				e.error === "service-not-allowed"
			) {
				this.broken = true;
			}
		};
		rec.onend = () => {
			if (this.on && !this.broken) {
				try {
					rec.start();
				} catch {
					// Already restarting.
				}
			}
		};
		this.rec = rec;
		this.on = true;
		try {
			rec.start();
		} catch {
			this.broken = true;
		}
	}

	/** Stop and return everything recognized so far. */
	stop() {
		this.on = false;
		try {
			this.rec?.stop();
		} catch {
			// Not running.
		}
		this.rec = undefined;
		return this.finals.trim();
	}
}
