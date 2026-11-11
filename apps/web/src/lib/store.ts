// Progress saved on the device (localStorage). No accounts.

import { useSyncExternalStore } from "react";

/** Spaced repetition (Leitner boxes). Box 0 = still learning. */
export interface Srs {
	box: number;
	due: number;
	seen: number;
}

export interface State {
	srs: Record<string, Srs>;
	favorites: string[];
	marked: string[];
}

const KEY = "iwm:v1";
const DAY = 24 * 60 * 60 * 1000;
/** Days until the next review, by box. */
const INTERVALS = [0, 1, 3, 7, 14, 30];
/** A word counts as learned once it reached this box. */
export const LEARNED_BOX = 2;

const initial: State = {
	srs: {},
	favorites: [],
	marked: [],
};

let state: State = initial;
let loaded = false;
const listeners = new Set<() => void>();

function load() {
	if (loaded || typeof window === "undefined") return;
	loaded = true;
	try {
		const raw = window.localStorage.getItem(KEY);
		if (raw) state = { ...initial, ...JSON.parse(raw) };
	} catch {
		// Private mode or corrupted data: start fresh.
	}
}

function set(next: State) {
	state = next;
	try {
		window.localStorage.setItem(KEY, JSON.stringify(state));
	} catch {
		// Storage full or blocked: keep working in memory.
	}
	for (const l of listeners) l();
}

function subscribe(l: () => void) {
	listeners.add(l);
	const onStorage = (e: StorageEvent) => {
		if (e.key !== KEY) return;
		loaded = false;
		load();
		l();
	};
	window.addEventListener("storage", onStorage);
	return () => {
		listeners.delete(l);
		window.removeEventListener("storage", onStorage);
	};
}

function getSnapshot() {
	load();
	return state;
}

export function useStore(): State {
	return useSyncExternalStore(subscribe, getSnapshot, () => initial);
}

function toggle(list: string[], id: string) {
	return list.includes(id) ? list.filter((x) => x !== id) : [...list, id];
}

export const actions = {
	toggleFavorite(id: string) {
		set({ ...state, favorites: toggle(state.favorites, id) });
	},
	toggleMarked(id: string) {
		set({ ...state, marked: toggle(state.marked, id) });
	},
	grade(id: string, knew: boolean) {
		const prev = state.srs[id] ?? { box: 0, due: 0, seen: 0 };
		const box = knew ? Math.min(prev.box + 1, INTERVALS.length - 1) : 0;
		const due = Date.now() + INTERVALS[box] * DAY;
		set({
			...state,
			srs: { ...state.srs, [id]: { box, due, seen: prev.seen + 1 } },
		});
	},
};

export const isLearned = (s: State, id: string) =>
	(s.srs[id]?.box ?? 0) >= LEARNED_BOX;

export const isDue = (s: State, id: string, now = Date.now()) => {
	const r = s.srs[id];
	return r !== undefined && r.due <= now;
};
