import { createFileRoute, Link, notFound } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { onColor } from "#/components/Art";
import { DeckHeader } from "#/components/DeckHeader";
import { SwipeDeck } from "#/components/SwipeDeck";
import { isTopic, TOPIC_COLOR, type TopicId } from "#/data/topics";
import { WORDS_BY_ID, type Word } from "#/data/words";
import { fmt, t, topicName } from "#/i18n";
import { dealNew, dueIds, unseenIn } from "#/lib/deck";
import { actions, type SavedDeck, useStore } from "#/lib/store";
import { useHydrated } from "#/lib/useHydrated";

export const Route = createFileRoute("/aprender/$group")({
	beforeLoad: ({ params }) => {
		if (!isTopic(params.group)) throw notFound();
	},
	component: Study,
});

/** One topic's deck. Picks up exactly where you left it. */
function Study() {
	const topic = Route.useParams().group as TopicId;
	const state = useStore();
	const hydrated = useHydrated();
	const [deck, setDeck] = useState<SavedDeck | null>(null);
	const [finished, setFinished] = useState<SavedDeck | null>(null);
	const color = TOPIC_COLOR[topic];

	useEffect(() => {
		if (!hydrated || deck) return;
		actions.setLastTopic(topic);
		const saved = state.decks[topic];
		if (saved?.ids.length) setDeck(saved);
		else {
			const fresh = dealNew(state, topic);
			setDeck(fresh);
			if (fresh.ids.length) actions.saveDeck(topic, fresh);
		}
	}, [hydrated, deck, state, topic]);

	if (!deck) return null;

	const words = deck.ids
		.map((id) => WORDS_BY_ID.get(id))
		.filter((w): w is Word => !!w);

	const answer = (w: Word, knew: boolean) => {
		actions.grade(w.id, knew);
		const [, ...rest] = deck.ids;
		const next: SavedDeck = {
			ids: knew ? rest : [...rest, w.id],
			total: deck.total,
			known: deck.known + (knew ? 1 : 0),
		};
		if (next.ids.length === 0) {
			actions.saveDeck(topic, null);
			setFinished(next);
		} else actions.saveDeck(topic, next);
		setDeck(next);
	};

	const again = () => {
		const fresh = dealNew(state, topic);
		setFinished(null);
		setDeck(fresh);
		if (fresh.ids.length) actions.saveDeck(topic, fresh);
	};

	const due = dueIds(state).length;
	const empty = words.length === 0;

	return (
		<div className="flex min-h-dvh flex-col p-5 pt-[calc(1.25rem+env(safe-area-inset-top))] pb-[calc(1.25rem+env(safe-area-inset-bottom))]">
			<DeckHeader
				title={topicName(topic)}
				known={deck.known}
				total={deck.total}
				color={color}
			/>

			{empty ? (
				<div className="flex flex-1 flex-col items-center justify-center gap-5 text-center">
					<p className="text-8xl">🎉</p>
					<p className="text-4xl font-extrabold">
						{finished
							? fmt(t.deck.done, { n: finished.known, total: finished.total })
							: t.deck.allSeen}
					</p>
					{!finished && <p className="text-muted">{t.deck.allSeenHint}</p>}
					<div className="mt-2 grid w-full max-w-xs gap-3">
						{unseenIn(state, topic).length > 0 && (
							<button
								type="button"
								onClick={again}
								className="h-14 font-bold"
								style={{ background: color, color: onColor(color) }}
							>
								{t.deck.another}
							</button>
						)}
						{due > 0 && (
							<Link
								to="/repasar/$list"
								params={{ list: "due" }}
								className="grid h-14 place-items-center border-2 border-ink font-bold"
							>
								{fmt(t.deck.reviewDue, { n: due })}
							</Link>
						)}
						<Link to="/" className="py-2 underline underline-offset-4">
							{t.deck.changeTopic}
						</Link>
					</div>
				</div>
			) : (
				<div className="mt-5 flex flex-1 flex-col">
					<SwipeDeck
						words={words}
						color={color}
						onAnswer={answer}
						hint={deck.known === 0 && deck.ids.length === deck.total}
					/>
				</div>
			)}
		</div>
	);
}
