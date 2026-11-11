import { createFileRoute, Link } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { Session } from "#/components/Session";
import { CATEGORY_ORDER, type CategoryId, CORE_WORDS } from "#/data/words";
import { fmt, t } from "#/i18n";
import { actions, isDue, isLearned, type State, useStore } from "#/lib/store";
import { useHydrated } from "#/lib/useHydrated";

export const Route = createFileRoute("/")({ component: Learn });

const DECK_SIZE = 10;
const LEARN_CATEGORIES = CATEGORY_ORDER.filter((c) => c !== "bonus");

const unseen = (s: State) =>
	CORE_WORDS.filter(
		(w) => !s.srs[w.id] && (s.category === "all" || w.category === s.category),
	);

/** Up to DECK_SIZE new words, picked at random. */
function nextNew(s: State) {
	const pool = unseen(s).map((w) => w.id);
	for (let i = pool.length - 1; i > 0; i--) {
		const j = Math.floor(Math.random() * (i + 1));
		[pool[i], pool[j]] = [pool[j], pool[i]];
	}
	return pool.slice(0, DECK_SIZE);
}

function Learn() {
	const state = useStore();
	const hydrated = useHydrated();
	const [deck, setDeck] = useState<string[] | null>(null);
	const [finished, setFinished] = useState(0);

	useEffect(() => {
		if (hydrated && deck === null) setDeck(nextNew(state));
	}, [hydrated, deck, state]);

	const pickCategory = (c: CategoryId | "all") => {
		actions.setCategory(c);
		setFinished(0);
		setDeck(null); // re-deal from the new category
	};

	const learned = CORE_WORDS.filter((w) => isLearned(state, w.id)).length;
	const due = CORE_WORDS.filter((w) => isDue(state, w.id)).length;
	const total = CORE_WORDS.length;
	const empty = deck !== null && deck.length === 0;

	return (
		<div className="space-y-3">
			<header>
				<div className="flex items-baseline justify-between">
					<p className="font-display text-xl md:hidden">{t.appName}</p>
					<p className="text-sm text-muted">
						{fmt(t.progress, { n: learned, total })}
					</p>
				</div>
				<div className="mt-2 h-1 overflow-hidden bg-line">
					<div
						className="h-full bg-ink"
						style={{ width: `${(learned / total) * 100}%` }}
					/>
				</div>
			</header>

			<div className="-mx-4 flex gap-1.5 overflow-x-auto px-4 [scrollbar-width:none] md:mx-0 md:px-0">
				{(["all", ...LEARN_CATEGORIES] as const).map((c) => (
					<button
						key={c}
						type="button"
						aria-pressed={state.category === c}
						onClick={() => pickCategory(c)}
						className={`h-8 shrink-0 rounded-sm border px-3 text-sm ${state.category === c ? "border-ink bg-ink text-paper" : "border-line text-muted"}`}
					>
						{c === "all" ? t.learn.all : t.categories[c]}
					</button>
				))}
			</div>

			{deck === null ? null : finished > 0 || empty ? (
				<div className="rounded-sm border border-line bg-card p-6 text-center">
					<p className="font-display text-3xl">
						{!empty
							? t.learn.sessionDone
							: state.category === "all"
								? fmt(t.learn.allDone, { total })
								: fmt(t.learn.categoryDone, {
										category: t.categories[state.category],
									})}
					</p>
					<p className="mt-2 text-muted">
						{empty
							? t.learn.allDoneHint
							: fmt(t.learn.sessionDoneHint, { n: finished })}
					</p>
					<div className="mt-6 grid gap-3">
						{unseen(state).length > 0 && (
							<button
								type="button"
								onClick={() => {
									setFinished(0);
									setDeck(nextNew(state));
								}}
								className="h-13 rounded-sm bg-ink font-bold text-paper"
							>
								{t.learn.more}
							</button>
						)}
						{due > 0 && (
							<Link
								to="/repasar"
								className="grid h-13 place-items-center rounded-sm border-2 border-ink font-bold"
							>
								{fmt(t.learn.reviewDue, { n: due })}
							</Link>
						)}
					</div>
				</div>
			) : (
				<Session key={deck.join()} ids={deck} onDone={setFinished} />
			)}
		</div>
	);
}
