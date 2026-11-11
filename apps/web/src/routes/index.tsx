import { createFileRoute, Link } from "@tanstack/react-router";
import { ChevronIcon } from "#/components/icons";
import { CORE_WORDS, GROUPS } from "#/data/words";
import { fmt, t } from "#/i18n";
import { type DeckId, wordsIn } from "#/lib/deck";
import { isLearned, useStore } from "#/lib/store";

export const Route = createFileRoute("/")({ component: Categories });

/** Aprender, step 1: pick what to study. */
function Categories() {
	const state = useStore();
	const learned = CORE_WORDS.filter((w) => isLearned(state, w.id)).length;
	const total = CORE_WORDS.length;

	const rows: { id: DeckId; name: string; hint: string }[] = [
		{ id: "todas", name: t.learn.all, hint: t.learn.allHint },
		...GROUPS.map((g) => ({ id: g.id, ...t.groups[g.id] })),
	];

	return (
		<div className="space-y-5">
			<header>
				<h1 className="font-display text-3xl">{t.nav.learn}</h1>
				<p className="mt-1 text-sm text-muted">
					{fmt(t.progress, { n: learned, total })}
				</p>
			</header>

			<ul className="divide-y divide-line border-y border-line">
				{rows.map(({ id, name, hint }) => {
					const words = wordsIn(id);
					const done = words.filter((w) => isLearned(state, w.id)).length;
					return (
						<li key={id}>
							<Link
								to="/aprender/$group"
								params={{ group: id }}
								className="flex items-center gap-4 py-4"
							>
								<span className="flex-1">
									<span className="block font-display text-xl">{name}</span>
									<span className="block text-sm text-muted">{hint}</span>
									<span className="mt-2 block h-0.5 w-full bg-line">
										<span
											className="block h-full bg-accent"
											style={{ width: `${(done / words.length) * 100}%` }}
										/>
									</span>
								</span>
								<span className="text-sm tabular-nums text-muted">
									{done}/{words.length}
								</span>
								<ChevronIcon className="h-5 w-5 text-muted" />
							</Link>
						</li>
					);
				})}
			</ul>
		</div>
	);
}
