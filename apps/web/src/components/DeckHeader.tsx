import { Link } from "@tanstack/react-router";
import { t } from "#/i18n";

/** Back arrow, title and a segmented progress bar for a deck screen. */
export function DeckHeader({
	title,
	known,
	total,
	color,
	back = "/",
}: {
	title: string;
	known: number;
	total: number;
	color: string;
	back?: "/" | "/repasar";
}) {
	return (
		<header>
			<div className="flex items-center justify-between">
				<Link
					to={back}
					className="-ml-2 grid h-10 w-10 place-items-center text-2xl"
					aria-label={t.deck.back}
				>
					←
				</Link>
				<span className="font-bold">{title}</span>
				<span className="w-10 text-right tabular-nums opacity-60">
					{known}/{total}
				</span>
			</div>
			<div className="mt-2 flex gap-1">
				{Array.from({ length: total }, (_, i) => (
					<span
						// biome-ignore lint/suspicious/noArrayIndexKey: fixed segments
						key={i}
						className="h-1.5 flex-1 transition-colors duration-300"
						style={{ background: i < known ? color : "var(--line)" }}
					/>
				))}
			</div>
		</header>
	);
}
