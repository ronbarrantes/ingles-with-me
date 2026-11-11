import { createFileRoute, Link, notFound } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { BackIcon } from "#/components/icons";
import { Session } from "#/components/Session";
import { CORE_WORDS, GROUPS } from "#/data/words";
import { fmt, t } from "#/i18n";
import { type DeckId, dealNew, unseenIn } from "#/lib/deck";
import { isDue, useStore } from "#/lib/store";
import { useHydrated } from "#/lib/useHydrated";

const DECKS: DeckId[] = ["todas", ...GROUPS.map((g) => g.id)];

export const Route = createFileRoute("/aprender/$group")({
	beforeLoad: ({ params }) => {
		if (!DECKS.includes(params.group as DeckId)) throw notFound();
	},
	component: Study,
});

/** Aprender, step 2: just the cards. */
function Study() {
	const group = Route.useParams().group as DeckId;
	const state = useStore();
	const hydrated = useHydrated();
	const [deck, setDeck] = useState<string[] | null>(null);
	const [finished, setFinished] = useState(0);

	useEffect(() => {
		if (hydrated && deck === null) setDeck(dealNew(state, group));
	}, [hydrated, deck, state, group]);

	const name = group === "todas" ? t.learn.all : t.groups[group].name;
	const due = CORE_WORDS.filter((w) => isDue(state, w.id)).length;
	const empty = deck !== null && deck.length === 0;

	return (
		<div className="space-y-3">
			<header className="flex items-center justify-between">
				<Link
					to="/"
					className="-ml-1 flex h-10 items-center gap-1 pr-2 text-accent"
				>
					<BackIcon className="h-5 w-5" />
					<span>{t.learn.back}</span>
				</Link>
				<span className="font-display text-lg">{name}</span>
			</header>

			{deck === null ? null : finished > 0 || empty ? (
				<div className="border border-line bg-card p-6 text-center">
					<p className="font-display text-3xl">
						{empty
							? fmt(t.learn.categoryDone, { category: name })
							: t.learn.sessionDone}
					</p>
					<p className="mt-2 text-muted">
						{empty
							? t.learn.allDoneHint
							: fmt(t.learn.sessionDoneHint, { n: finished })}
					</p>
					<div className="mt-6 grid gap-3">
						{unseenIn(state, group).length > 0 && (
							<button
								type="button"
								onClick={() => {
									setFinished(0);
									setDeck(dealNew(state, group));
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
						<Link
							to="/"
							className="grid h-13 place-items-center text-muted underline underline-offset-4"
						>
							{t.learn.categories}
						</Link>
					</div>
				</div>
			) : (
				<Session key={deck.join()} ids={deck} onDone={setFinished} />
			)}
		</div>
	);
}
