// Shapes shared by the /bot page and its server endpoints.

export type Topic = "libre" | "cocina" | "jardin" | "casa";

/** One word as the speech engine heard it, with its pronunciation score. */
export interface WordScore {
	word: string;
	/** 0–100. */
	accuracy: number;
	/** e.g. "None", "Mispronunciation", "Omission", "Insertion". */
	error: string;
	/** What sounded off, e.g. "th sounded like t". */
	note?: string;
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

export interface Meta {
	model: string;
	ms: number;
	inputTokens: number;
	outputTokens: number;
	/** null when the price of the model isn't known. */
	costUsd: number | null;
}

export interface ReplyResponse {
	reply: TutorReply;
	meta: Meta;
}

export interface HearResponse {
	attempt: Attempt;
	meta: Meta;
}

export interface RoleStatus {
	ready: boolean;
	/** "provider:model" */
	label: string;
}

export interface BotStatus {
	teacher: RoleStatus;
	judge: RoleStatus;
	voice: RoleStatus;
	passcode: boolean;
	mock: boolean;
}
