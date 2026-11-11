import { createFileRoute, Link } from "@tanstack/react-router";
import { CORE_WORDS, GROUPS } from "#/data/words";
import { fmt, t } from "#/i18n";
import type { DeckId } from "#/lib/deck";
import { isLearned, useStore } from "#/lib/store";

export const Route = createFileRoute("/")({ component: Categories });

/** Aprender, step 1: pick what to study. */
function Categories() {
	const state = useStore();
	const learned = CORE_WORDS.filter((w) => isLearned(state, w.id)).length;
	const total = CORE_WORDS.length;

	const groups: { id: DeckId; name: string }[] = GROUPS.map((g) => ({
		id: g.id,
		name: t.groups[g.id],
	}));

	return (
		<div className="space-y-5">
			<header>
				<h1 className="font-display text-3xl">{t.nav.learn}</h1>
				<p className="mt-1 text-sm text-muted">
					{fmt(t.progress, { n: learned, total })}
				</p>
			</header>

			<div className="grid grid-cols-2 gap-2">
				<Tile id="todas" name={t.learn.all} wide />
				{groups.map((g) => (
					<Tile key={g.id} id={g.id} name={g.name} />
				))}
			</div>
		</div>
	);
}

function Tile({
	id,
	name,
	wide = false,
}: {
	id: DeckId;
	name: string;
	wide?: boolean;
}) {
	return (
		<Link
			to="/aprender/$group"
			params={{ group: id }}
			className={`flex h-16 items-center justify-center rounded-sm border px-3 text-center font-bold ${wide ? "col-span-2 border-ink bg-ink text-paper" : "border-line bg-card"}`}
		>
			{name}
		</Link>
	);
}
