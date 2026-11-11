import { createFileRoute } from "@tanstack/react-router";
import { useState } from "react";
import { Session } from "#/components/Session";
import { ALL_WORDS } from "#/data/words";
import { t } from "#/i18n";
import { isDue, useStore } from "#/lib/store";

export const Route = createFileRoute("/repasar")({ component: Review });

type Tab = "due" | "marked" | "favorites";

function Review() {
	const state = useStore();
	const [tab, setTab] = useState<Tab>("due");
	const [deck, setDeck] = useState<string[] | null>(null);
	const [done, setDone] = useState(false);

	const lists: Record<Tab, string[]> = {
		due: ALL_WORDS.filter((w) => isDue(state, w.id))
			.sort((a, b) => state.srs[a.id].due - state.srs[b.id].due)
			.map((w) => w.id),
		marked: state.marked,
		favorites: state.favorites,
	};
	const tabs: [Tab, string, string][] = [
		["due", t.review.due, t.review.emptyDue],
		["marked", t.review.marked, t.review.emptyMarked],
		["favorites", t.review.favorites, t.review.emptyFavorites],
	];

	const reset = () => {
		setDeck(null);
		setDone(false);
	};

	if (deck && !done) {
		return (
			<div className="space-y-4">
				<button type="button" onClick={reset} className="text-sm text-muted">
					← {t.review.back}
				</button>
				<Session ids={deck} onDone={() => setDone(true)} />
			</div>
		);
	}

	const current = lists[tab];
	const empty = tabs.find(([k]) => k === tab)?.[2];

	return (
		<div className="space-y-5">
			<h1 className="font-display text-3xl">{t.nav.review}</h1>

			{done && (
				<p className="rounded-xl bg-card p-4 text-center font-bold">
					{t.review.done}
				</p>
			)}

			<div className="grid grid-cols-3 gap-2">
				{tabs.map(([key, label]) => (
					<button
						key={key}
						type="button"
						aria-pressed={tab === key}
						onClick={() => {
							setTab(key);
							setDone(false);
						}}
						className={`rounded-xl border px-2 py-3 text-left ${tab === key ? "border-ink bg-ink text-paper" : "border-line"}`}
					>
						<span className="block font-display text-3xl tabular-nums">
							{lists[key].length}
						</span>
						<span className="text-sm">{label}</span>
					</button>
				))}
			</div>

			{current.length === 0 ? (
				<p className="py-10 text-center text-muted">{empty}</p>
			) : (
				<button
					type="button"
					onClick={() => {
						setDone(false);
						setDeck([...current]);
					}}
					className="h-13 w-full rounded-sm bg-ink font-bold text-paper"
				>
					{t.review.start} ({current.length})
				</button>
			)}
		</div>
	);
}
