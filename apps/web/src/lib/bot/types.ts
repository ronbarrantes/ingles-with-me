// Shapes shared by the /bot page and its server endpoints.

export type Topic = "libre" | "cocina" | "jardin" | "casa";

/** One word as the speech engine heard it, with its pronunciation score. */
export interface WordScore {
	word: string;
	/** 0–100. */
	accuracy: number;
	/** e.g. "None", "Mispronunciation", "Omission", "Insertion". */
	error: string;
}

/** What she said in one turn. Scores are absent when she typed, or no scoring engine ran. */
export interface Attempt {
	text: string;
	lang?: "en" | "es";
	words?: WordScore[];
	accuracy?: number;
	fluency?: number;
}

export interface Correction {
	word: string;
	heard: string;
	tip: string;
}

export interface NewWord {
	en: string;
	es: string;
}

export interface TutorReply {
	say: string;
	corrections: Correction[];
	new_words: NewWord[];
}

export type Turn =
	| { role: "learner"; attempt: Attempt }
	| { role: "tutor"; reply: TutorReply };

export interface ReplyRequest {
	topic: Topic;
	/** Earlier turns, oldest first. */
	history: Turn[];
	/** Her latest turn; null to have the tutor open the conversation. */
	latest: Attempt | null;
}

export interface ReplyResponse {
	reply: TutorReply;
	meta: {
		model: string;
		ms: number;
		inputTokens: number;
		outputTokens: number;
		costUsd: number;
	};
}

export interface BotStatus {
	tutor: boolean;
	speech: boolean;
	passcode: boolean;
	model: string;
}
