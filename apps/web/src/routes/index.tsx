import { createFileRoute, Link } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { Session } from "#/components/Session";
import { CORE_WORDS } from "#/data/words";
import { fmt, t } from "#/i18n";
import { actions, isDue, isLearned, type State, useStore } from "#/lib/store";
import { useHydrated } from "#/lib/useHydrated";

export const Route = createFileRoute("/")({ component: Learn });

const DECK_SIZE = 10;

const nextNew = (s: State) =>
	CORE_WORDS.filter((w) => !s.srs[w.id])
		.slice(0, DECK_SIZE)
		.map((w) => w.id);

function Learn() {
	const state = useStore();
	const hydrated = useHydrated();
	const [deck, setDeck] = useState<string[] | null>(null);
	const [finished, setFinished] = useState(0);

	useEffect(() => {
		if (hydrated && deck === null) setDeck(nextNew(state));
	}, [hydrated, deck, state]);

	const learned = CORE_WORDS.filter((w) => isLearned(state, w.id)).length;
	const due = CORE_WORDS.filter((w) => isDue(state, w.id)).length;
	const total = CORE_WORDS.length;

	return (
		<div className="space-y-3">
			<header>
				<div className="flex items-baseline justify-between">
					<p className="font-display text-xl">{t.appName}</p>
					<p className="text-sm text-muted">
						{fmt(t.progress, { n: learned, total })}
					</p>
				</div>
				<div className="mt-2 h-1.5 overflow-hidden rounded-full bg-line">
					<div
						className="h-full bg-ink"
						style={{ width: `${(learned / total) * 100}%` }}
					/>
				</div>
			</header>

			<DirectionToggle />

			{deck === null ? null : finished > 0 || deck.length === 0 ? (
				<div className="rounded-2xl border border-line bg-card p-6 text-center">
					<p className="font-display text-3xl">
						{deck.length === 0
							? fmt(t.learn.allDone, { total })
							: t.learn.sessionDone}
					</p>
					<p className="mt-2 text-muted">
						{deck.length === 0
							? t.learn.allDoneHint
							: fmt(t.learn.sessionDoneHint, { n: finished })}
					</p>
					<div className="mt-6 grid gap-3">
						{nextNew(state).length > 0 && (
							<button
								type="button"
								onClick={() => {
									setFinished(0);
									setDeck(nextNew(state));
								}}
								className="h-14 rounded-xl bg-accent font-bold text-on-accent"
							>
								{t.learn.more}
							</button>
						)}
						{due > 0 && (
							<Link
								to="/repasar"
								className="grid h-14 place-items-center rounded-xl border-2 border-ink font-bold"
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

function DirectionToggle() {
	const { direction } = useStore();
	const options = [
		["word", t.direction.word],
		["picture", t.direction.picture],
	] as const;
	return (
		<fieldset className="grid grid-cols-2 rounded-xl border border-line p-1 text-sm">
			{options.map(([value, label]) => (
				<button
					key={value}
					type="button"
					aria-pressed={direction === value}
					onClick={() => actions.setDirection(value)}
					className={`h-9 rounded-lg font-bold ${direction === value ? "bg-ink text-paper" : "text-muted"}`}
				>
					{label}
				</button>
			))}
		</fieldset>
	);
}
