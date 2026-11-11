import { useState } from "react";
import { WORDS_BY_ID } from "#/data/words";
import { t } from "#/i18n";
import { actions, useStore } from "#/lib/store";
import { Flashcard } from "./Flashcard";

/**
 * Runs through a deck of cards. "Otra vez" sends the card to the back of
 * the deck; "La sé" moves on. Both update spaced repetition.
 */
export function Session({
	ids,
	onDone,
}: {
	ids: string[];
	onDone: (count: number) => void;
}) {
	const { direction } = useStore();
	const [queue, setQueue] = useState(ids);
	const [flipped, setFlipped] = useState(false);
	const [done, setDone] = useState(0);

	const word = WORDS_BY_ID.get(queue[0] ?? "");
	if (!word) return null;

	const grade = (knew: boolean) => {
		actions.grade(word.id, knew);
		const rest = queue.slice(1);
		const next = knew ? rest : [...rest, word.id];
		setFlipped(false);
		if (knew) setDone((d) => d + 1);
		if (next.length === 0) onDone(ids.length);
		else setQueue(next);
	};

	return (
		<div>
			<div className="mb-2 flex items-center gap-3">
				<div className="h-1.5 flex-1 overflow-hidden rounded-full bg-line">
					<div
						className="h-full bg-accent transition-[width]"
						style={{ width: `${(done / ids.length) * 100}%` }}
					/>
				</div>
				<span className="text-sm tabular-nums text-muted">
					{done}/{ids.length}
				</span>
			</div>

			<Flashcard
				key={word.id}
				word={word}
				direction={direction}
				flipped={flipped}
				onFlip={() => setFlipped((f) => !f)}
			/>

			<div
				className={`mt-3 grid grid-cols-2 gap-3 transition-opacity ${flipped ? "" : "pointer-events-none opacity-0"}`}
				aria-hidden={!flipped}
			>
				<button
					type="button"
					tabIndex={flipped ? 0 : -1}
					onClick={() => grade(false)}
					className="h-13 rounded-xl border-2 border-ink font-bold"
				>
					{t.grade.again}
				</button>
				<button
					type="button"
					tabIndex={flipped ? 0 : -1}
					onClick={() => grade(true)}
					className="h-13 rounded-xl bg-accent font-bold text-on-accent"
				>
					{t.grade.know}
				</button>
			</div>
		</div>
	);
}
