import { createFileRoute, Link } from "@tanstack/react-router";
import { onColor } from "#/components/Art";
import { t } from "#/i18n";
import { dueIds } from "#/lib/deck";
import { REVIEW_LISTS, type ReviewList } from "#/lib/review";
import { useStore } from "#/lib/store";

export const Route = createFileRoute("/repasar/")({ component: Review });

/** Repasar: three decks, each a big block with its count. */
function Review() {
	const state = useStore();
	const lists: {
		id: ReviewList;
		name: string;
		count: number;
		empty: string;
	}[] = [
		{
			id: "due",
			name: t.review.due,
			count: dueIds(state).length,
			empty: t.review.emptyDue,
		},
		{
			id: "marked",
			name: t.review.marked,
			count: state.marked.length,
			empty: t.review.emptyMarked,
		},
		{
			id: "favorites",
			name: t.review.favorites,
			count: state.favorites.length,
			empty: t.review.emptyFavorites,
		},
	];

	return (
		<div className="px-6 py-8">
			<h1 className="text-5xl font-extrabold">{t.review.title}</h1>
			<div className="mt-6 grid gap-4">
				{lists.map((l) => {
					const { color, emoji } = REVIEW_LISTS[l.id];
					const body = (
						<>
							<span className="flex items-start justify-between">
								<span className="text-5xl">{emoji}</span>
								<span className="text-6xl leading-none font-extrabold tabular-nums">
									{l.count}
								</span>
							</span>
							<span>
								<span className="block text-3xl font-extrabold">{l.name}</span>
								{l.count === 0 && (
									<span className="mt-1 block text-sm opacity-85">
										{l.empty}
									</span>
								)}
							</span>
						</>
					);
					const cls = "flex min-h-40 flex-col justify-between p-5";
					return l.count > 0 ? (
						<Link
							key={l.id}
							to="/repasar/$list"
							params={{ list: l.id }}
							className={`${cls} transition-transform active:scale-[0.98]`}
							style={{ background: color, color: onColor(color) }}
						>
							{body}
						</Link>
					) : (
						<div
							key={l.id}
							className={`${cls} border-2 border-dashed border-line text-muted`}
						>
							{body}
						</div>
					);
				})}
			</div>
		</div>
	);
}
