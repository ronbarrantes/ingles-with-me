import { useCallback, useEffect, useState } from "react";
import { WORDS_BY_ID } from "#/data/words";
import { t } from "#/i18n";
import { speak } from "#/lib/speech";
import { actions, type Direction } from "#/lib/store";
import { Flashcard } from "./Flashcard";

const randomDirection = (): Direction =>
	Math.random() < 0.5 ? "word" : "picture";

/**
 * Runs through a deck of cards, each shown word-first or picture-first at
 * random. "Otra vez" sends the card to the back of the deck; "La sé" moves
 * on. Both update spaced repetition. Keyboard: Space flips, ←/→ grade,
 * S speaks.
 */
export function Session({
	ids,
	onDone,
}: {
	ids: string[];
	onDone: (count: number) => void;
}) {
	const [queue, setQueue] = useState(ids);
	const [flipped, setFlipped] = useState(false);
	const [done, setDone] = useState(0);
	const [direction, setDirection] = useState(randomDirection);
	const [first, setFirst] = useState(true);

	const word = WORDS_BY_ID.get(queue[0] ?? "");

	const grade = useCallback(
		(knew: boolean) => {
			if (!word) return;
			actions.grade(word.id, knew);
			const rest = queue.slice(1);
			const next = knew ? rest : [...rest, word.id];
			setFlipped(false);
			setFirst(false);
			setDirection(randomDirection());
			if (knew) setDone((d) => d + 1);
			if (next.length === 0) onDone(ids.length);
			else setQueue(next);
		},
		[word, queue, ids.length, onDone],
	);

	useEffect(() => {
		const onKey = (e: KeyboardEvent) => {
			const el = e.target as HTMLElement;
			if (el.closest("input, textarea, select") || e.metaKey || e.ctrlKey)
				return;
			if (e.key === " ") {
				e.preventDefault();
				setFlipped((f) => !f);
			} else if (flipped && (e.key === "ArrowLeft" || e.key === "1")) {
				e.preventDefault();
				grade(false);
			} else if (flipped && (e.key === "ArrowRight" || e.key === "2")) {
				e.preventDefault();
				grade(true);
			} else if (e.key.toLowerCase() === "s" && word) {
				speak(word.en);
			}
		};
		window.addEventListener("keydown", onKey);
		return () => window.removeEventListener("keydown", onKey);
	}, [flipped, grade, word]);

	if (!word) return null;

	return (
		<div>
			<div className="mb-2 flex items-center gap-3">
				<div className="h-1 flex-1 overflow-hidden bg-line">
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
				peek={first}
			/>

			<div
				className={`mt-3 grid grid-cols-2 gap-3 transition-opacity ${flipped ? "" : "pointer-events-none opacity-0"}`}
				aria-hidden={!flipped}
			>
				<button
					type="button"
					tabIndex={flipped ? 0 : -1}
					onClick={() => grade(false)}
					className="h-13 rounded-sm border-2 border-ink font-bold"
				>
					{t.grade.again}
				</button>
				<button
					type="button"
					tabIndex={flipped ? 0 : -1}
					onClick={() => grade(true)}
					className="h-13 rounded-sm bg-ink font-bold text-paper"
				>
					{t.grade.know}
				</button>
			</div>

			<p className="mt-4 hidden text-center text-xs text-muted md:block">
				{t.shortcuts}
			</p>
		</div>
	);
}
