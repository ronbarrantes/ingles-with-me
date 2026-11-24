// Shapes shared by the /ale page and its server endpoints.

export type { Topic } from "./topics";

import type { Topic } from "./topics";

/** One word as the speech engine heard it, with its pronunciation score. */
export interface WordScore {
	word: string;
	/** 0–100. */
	accuracy: number;
	/** e.g. "None", "Mispronunciation", "Omission", "Insertion". */
	error: string;
	/** What sounded off, e.g. "la th sonó como t". */
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

/** What the teacher knows about her beyond this chat. */
export interface TeacherContext {
	learner: LearnerName | null;
	hard: HardWord[];
	/** Words from the topic to build the chat around (still being learned). */
	focus: string[];
}

/** A word she has trouble pronouncing, remembered across conversations. */
export interface HardWord {
	word: string;
	/** Times it scored under 75. */
	misses: number;
	last: number;
	best: number;
	/** Good tries in a row since the last miss. */
	streak: number;
	/** What sounded off last time, e.g. "la th sonó como t". */
	note: string;
	at: number;
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

/** Her name, as she spells it. */
export interface LearnerName {
	name: string;
}

export interface TutorReply {
	say: string;
	corrections: Correction[];
	new_words: NewWord[];
	/** Set when she tells the teacher her name (or corrects its spelling); name "" otherwise. */
	learner_name: LearnerName;
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
	/** Her name if the teacher already learned it, so it remembers across sessions. */
	learner: LearnerName | null;
	/** Words she struggles with, hardest first (a few). */
	hard: HardWord[];
	/** Words from the chosen topic to weave in. */
	focus: string[];
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
