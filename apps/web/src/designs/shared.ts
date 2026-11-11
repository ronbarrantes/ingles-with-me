// Shared bits for the /designs prototypes. Prototypes keep their own state
// and never touch the real saved progress.

import { useEffect, useState } from "react";
import { CORE_WORDS, GROUPS, type GroupId, type Word } from "#/data/words";
import { t } from "#/i18n";

export type Pick = GroupId | "todas";
export type Screen = "picker" | "study";

export const PICKS: { id: Pick; name: string; emoji: string }[] = [
	{ id: "todas", name: t.learn.all, emoji: "🎲" },
	...GROUPS.map((g) => ({
		id: g.id,
		name: t.groups[g.id],
		emoji: {
			personas: "👪",
			casa: "🍲",
			mundo: "🌎",
			acciones: "🏃",
			describir: "🎨",
			clave: "🔑",
		}[g.id],
	})),
];

export const pickName = (p: Pick) => PICKS.find((x) => x.id === p)?.name ?? "";

const wordsFor = (p: Pick) =>
	p === "todas" ? [...CORE_WORDS] : CORE_WORDS.filter((w) => w.group === p);

export function shuffle<T>(a: T[]): T[] {
	const r = [...a];
	for (let i = r.length - 1; i > 0; i--) {
		const j = Math.floor(Math.random() * (i + 1));
		[r[i], r[j]] = [r[j], r[i]];
	}
	return r;
}

/**
 * A round of `size` random words. `answer(false)` puts the word back at
 * the end; `answer(true)` moves on. Dealt after mount so SSR stays stable.
 */
export function useRound(pick: Pick, size = 10) {
	const [queue, setQueue] = useState<Word[] | null>(null);
	const [known, setKnown] = useState(0);
	const [seed, setSeed] = useState(0);

	// biome-ignore lint/correctness/useExhaustiveDependencies: seed re-deals
	useEffect(() => {
		setQueue(shuffle(wordsFor(pick)).slice(0, size));
		setKnown(0);
	}, [pick, size, seed]);

	const answer = (knew: boolean) => {
		if (!queue?.length) return;
		const [head, ...rest] = queue;
		if (knew) setKnown((k) => k + 1);
		setQueue(knew ? rest : [...rest, head]);
	};

	return {
		ready: queue !== null,
		word: queue?.[0],
		upNext: queue?.slice(1, 3) ?? [],
		known,
		total: size,
		finished: queue !== null && queue.length === 0,
		answer,
		restart: () => setSeed((s) => s + 1),
	};
}

/** The right word plus `n - 1` others from the same group, shuffled. */
export function choicesFor(word: Word, n = 4) {
	const pool = CORE_WORDS.filter(
		(w) => w.id !== word.id && w.group === word.group && w.pos === word.pos,
	);
	const others = shuffle(
		pool.length >= n - 1 ? pool : CORE_WORDS.filter((w) => w.id !== word.id),
	);
	return shuffle([word, ...others.slice(0, n - 1)]);
}

const escapeRe = (s: string) => s.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");

/** Split the example sentence around the word: [before, word, after]. */
export function splitExample(w: Word): [string, string, string] {
	const m = w.example.match(
		new RegExp(`^(.*?)\\b(${escapeRe(w.en)})\\b(.*)$`, "i"),
	);
	return m ? [m[1], m[2], m[3]] : [w.example, "", ""];
}
