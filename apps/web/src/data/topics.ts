// Topics shown in the app: "Todas" plus the six groups, each with its color.

import { CORE_WORDS, GROUPS, type GroupId, type Word } from "./words";

export type TopicId = GroupId | "todas";

export const TOPIC_IDS: TopicId[] = ["todas", ...GROUPS.map((g) => g.id)];

export const TOPIC_COLOR: Record<TopicId, string> = {
	todas: "#2B59C3",
	personas: "#E4572E",
	casa: "#F3A712",
	mundo: "#34408A",
	acciones: "#3BB273",
	describir: "#7768AE",
	clave: "#1B998B",
};

export const TOPIC_EMOJI: Record<TopicId, string> = {
	todas: "🎲",
	personas: "🙋",
	casa: "🍲",
	mundo: "🌎",
	acciones: "🏃",
	describir: "🎨",
	clave: "🔑",
};

export const isTopic = (s: string): s is TopicId =>
	(TOPIC_IDS as string[]).includes(s);

export const wordsIn = (t: TopicId): Word[] =>
	t === "todas" ? [...CORE_WORDS] : CORE_WORDS.filter((w) => w.group === t);

/** Color for a single word (its group's color). */
export const colorOf = (w: Word) =>
	w.group ? TOPIC_COLOR[w.group] : TOPIC_COLOR.todas;
