// What to talk about with Ale. Topics come from the 300 words (only the
// categories you can hold a conversation about), plus free talk and the
// learner's hard words. Suggestions adapt: favorites first, mostly-learned
// topics drop off, topics with words to review come up.

import { TOPIC_COLOR } from "#/data/topics";
import { type CategoryId, CORE_WORDS, type Word } from "#/data/words";
import { t } from "#/i18n";
import { isDue, isLearned, type State } from "#/lib/store";

/** Categories that work as conversation subjects. */
export const CHAT_CATEGORIES = [
	"comida",
	"casa",
	"personas",
	"mundo",
	"sentimientos",
	"lugares",
	"trabajo",
	"acciones",
	"cuerpo",
	"tiempo",
	"numeros",
] as const satisfies readonly CategoryId[];

export type ChatCategory = (typeof CHAT_CATEGORIES)[number];
export type Topic = "libre" | "hard" | ChatCategory;

export const isChatTopic = (s: string): s is Topic =>
	s === "libre" ||
	s === "hard" ||
	(CHAT_CATEGORIES as readonly string[]).includes(s);

const EMOJI: Record<ChatCategory, string> = {
	comida: "🍲",
	casa: "🏠",
	personas: "👨‍👩‍👧",
	mundo: "🌳",
	sentimientos: "😊",
	lugares: "🏙️",
	trabajo: "💼",
	acciones: "🏃",
	cuerpo: "🖐️",
	tiempo: "🕒",
	numeros: "🔢",
};

export interface TopicChip {
	id: Topic;
	label: string;
	emoji: string;
	color: string;
}

const groupColor = (c: ChatCategory) => {
	const w = CORE_WORDS.find((x) => x.category === c);
	return w?.group ? TOPIC_COLOR[w.group] : TOPIC_COLOR.todas;
};

export function chip(id: Topic, hardCount = 0): TopicChip {
	if (id === "libre")
		return { id, label: "De lo que quieras", emoji: "💬", color: "#2B59C3" };
	if (id === "hard")
		return {
			id,
			label: `Palabras difíciles${hardCount ? ` (${hardCount})` : ""}`,
			emoji: "🎯",
			color: "#E4572E",
		};
	return {
		id,
		label: t.categories[id],
		emoji: EMOJI[id],
		color: groupColor(id),
	};
}

const wordsOf = (c: ChatCategory): Word[] =>
	CORE_WORDS.filter((w) => w.category === c);

/** Share of a topic's words she has learned, 0..1. */
export const learnedShare = (s: State, c: ChatCategory) => {
	const ws = wordsOf(c);
	return ws.filter((w) => isLearned(s, w.id)).length / ws.length;
};

/**
 * Up to `n` words for Ale to build the chat around: due for review first,
 * then seen but not learned, then new ones.
 */
export function focusWords(
	s: State,
	c: ChatCategory,
	n = 10,
	now = Date.now(),
) {
	const ws = wordsOf(c);
	const due = ws.filter((w) => isDue(s, w.id, now) && !isLearned(s, w.id));
	const seen = ws.filter(
		(w) => s.srs[w.id] && !isLearned(s, w.id) && !due.includes(w),
	);
	const fresh = ws.filter((w) => !s.srs[w.id]);
	return [...due, ...seen, ...fresh].slice(0, n).map((w) => w.en);
}

export interface Interests {
	/** Times each topic was picked. */
	counts: Partial<Record<Topic, number>>;
	last?: Topic;
}

/** Small stable shuffle so the list changes from day to day. */
const dayJitter = (id: string, day: number) => {
	let h = day;
	for (const ch of id) h = (h * 31 + ch.charCodeAt(0)) >>> 0;
	return (h % 100) / 100;
};

/**
 * What to offer when a chat starts: hard words (if any), then the best
 * topics for her, then free talk.
 */
export function suggestTopics(
	s: State,
	interests: Interests,
	hardCount: number,
	{ max = 5, now = Date.now() } = {},
): TopicChip[] {
	const day = Math.floor(now / 86_400_000);
	const scored = CHAT_CATEGORIES.map((c) => {
		const share = learnedShare(s, c);
		const picked = interests.counts[c] ?? 0;
		const hasDue = wordsOf(c).some((w) => isDue(s, w.id, now));
		const score =
			Math.min(picked, 5) * 2 +
			(c === interests.last ? 3 : 0) +
			(share > 0 && share < 0.9 ? 1.5 : 0) +
			(hasDue ? 2 : 0) +
			dayJitter(c, day) * 2;
		return { c, share, score };
	})
		.filter((x) => x.share < 0.9) // mostly learned: let others shine
		.sort((a, b) => b.score - a.score)
		.slice(0, max);

	return [
		...(hardCount > 0 ? [chip("hard", hardCount)] : []),
		...scored.map((x) => chip(x.c)),
		chip("libre"),
	];
}

const KEY = "iwm:chat-topics";

export function getInterests(): Interests {
	try {
		const v = JSON.parse(localStorage.getItem(KEY) ?? "null");
		return v && typeof v === "object" && v.counts ? v : { counts: {} };
	} catch {
		return { counts: {} };
	}
}

/** The interests after picking a topic (save them with saveInterestsLocal). */
export const notePicked = (i: Interests, id: Topic): Interests => ({
	counts: { ...i.counts, [id]: (i.counts[id] ?? 0) + 1 },
	last: id,
});

export function saveInterestsLocal(i: Interests) {
	try {
		localStorage.setItem(KEY, JSON.stringify(i));
	} catch {
		// Private mode: suggestions just won't learn this time.
	}
}
