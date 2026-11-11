import { createFileRoute, Link, notFound } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { DeckHeader } from "#/components/DeckHeader";
import { SwipeDeck } from "#/components/SwipeDeck";
import { colorOf } from "#/data/topics";
import { WORDS_BY_ID, type Word } from "#/data/words";
import { t } from "#/i18n";
import { dueIds, shuffle } from "#/lib/deck";
import { REVIEW_LISTS, type ReviewList } from "#/lib/review";
import { actions, useStore } from "#/lib/store";
import { useHydrated } from "#/lib/useHydrated";

export const Route = createFileRoute("/repasar/$list")({
	beforeLoad: ({ params }) => {
		if (!(params.list in REVIEW_LISTS)) throw notFound();
	},
	component: ReviewDeck,
});

/** A review deck: due, marked or favorite words. */
function ReviewDeck() {
	const list = Route.useParams().list as ReviewList;
	const state = useStore();
	const hydrated = useHydrated();
	const [ids, setIds] = useState<string[] | null>(null);
	const [total, setTotal] = useState(0);
	const [known, setKnown] = useState(0);

	useEffect(() => {
		if (!hydrated || ids) return;
		const all =
			list === "due"
				? dueIds(state)
				: shuffle(list === "marked" ? state.marked : state.favorites);
		setIds(all);
		setTotal(all.length);
	}, [hydrated, ids, state, list]);

	if (!ids) return null;
	const words = ids
		.map((id) => WORDS_BY_ID.get(id))
		.filter((w): w is Word => !!w);
	const name = {
		due: t.review.due,
		marked: t.review.marked,
		favorites: t.review.favorites,
	}[list];

	const answer = (w: Word, knew: boolean) => {
		actions.grade(w.id, knew);
		const [, ...rest] = ids;
		if (knew) setKnown((k) => k + 1);
		setIds(knew ? rest : [...rest, w.id]);
	};

	return (
		<div className="flex min-h-dvh flex-col p-5 pt-[calc(1.25rem+env(safe-area-inset-top))] pb-[calc(1.25rem+env(safe-area-inset-bottom))]">
			<DeckHeader
				title={name}
				known={known}
				total={total}
				color={REVIEW_LISTS[list].color}
				back="/repasar"
			/>
			{words.length === 0 ? (
				<div className="flex flex-1 flex-col items-center justify-center gap-5 text-center">
					<p className="text-8xl">🎉</p>
					<p className="text-4xl font-extrabold">{t.review.done}</p>
					<Link to="/repasar" className="py-2 underline underline-offset-4">
						{t.deck.back}
					</Link>
				</div>
			) : (
				<div className="mt-5 flex flex-1 flex-col">
					<SwipeDeck
						words={words}
						color={colorOf(words[0])}
						onAnswer={answer}
					/>
				</div>
			)}
		</div>
	);
}
