import { createFileRoute } from "@tanstack/react-router";
import { PICS, Pic } from "#/data/pics";
import { WORDS_BY_ID } from "#/data/words";

export const Route = createFileRoute("/designs/pics")({ component: Sheet });

/** Every pictogram on one page, for review. */
function Sheet() {
	const ids = Object.keys(PICS);
	const missing = ids.filter((id) => !WORDS_BY_ID.has(id));
	return (
		<div className="p-4">
			<h1 className="font-display text-3xl">Dibujos ({ids.length})</h1>
			{missing.length > 0 && (
				<p className="text-accent">Sin palabra: {missing.join(", ")}</p>
			)}
			<div className="mt-4 grid grid-cols-[repeat(auto-fill,minmax(110px,1fr))] gap-2">
				{ids.map((id) => (
					<figure
						key={id}
						className="border border-line bg-card p-2 text-center"
					>
						<Pic id={id} className="mx-auto h-20 w-20" />
						<figcaption className="text-sm font-bold">
							{WORDS_BY_ID.get(id)?.en ?? id}
						</figcaption>
					</figure>
				))}
			</div>
		</div>
	);
}
