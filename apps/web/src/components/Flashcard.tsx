import { useState } from "react";
import type { Word } from "#/data/words";
import { t } from "#/i18n";
import { speak } from "#/lib/speech";
import { actions, type Direction, useStore } from "#/lib/store";
import { BookmarkIcon, FlipIcon, SpeakerIcon, StarIcon } from "./icons";
import { hasPicture, Picture, Sentence } from "./Picture";

interface Props {
	word: Word;
	direction: Direction;
	flipped: boolean;
	onFlip: () => void;
	/** Nudge the card once so it is obvious it turns. */
	peek?: boolean;
}

/**
 * One card. Front: the English word (or the picture, in reverse mode).
 * Back: picture + word + example. Spanish stays hidden behind a tap.
 * Parents should pass `key={word.id}` so the Spanish panel resets.
 */
export function Flashcard({
	word,
	direction,
	flipped,
	onFlip,
	peek = false,
}: Props) {
	const state = useStore();
	const [showEs, setShowEs] = useState(false);
	const favorite = state.favorites.includes(word.id);
	const marked = state.marked.includes(word.id);
	// Words without a picture can't be shown picture-first; use the
	// example sentence with the word blanked out instead.
	const reverse = direction === "picture";
	const answerVisible = flipped || !reverse;

	const flip = () => {
		if (!flipped && reverse) speak(word.en);
		onFlip();
	};

	return (
		<article className="rounded-2xl border border-line bg-card">
			<div className="flex items-center justify-between px-3 pt-2">
				<span className="px-2 text-xs uppercase tracking-[0.14em] text-muted">
					{t.categories[word.category]}
				</span>
				<div className="flex gap-1">
					<IconToggle
						label={t.card.favorite}
						on={favorite}
						onClick={() => actions.toggleFavorite(word.id)}
					>
						<StarIcon filled={favorite} />
					</IconToggle>
					<IconToggle
						label={t.card.mark}
						on={marked}
						onClick={() => actions.toggleMarked(word.id)}
					>
						<BookmarkIcon filled={marked} />
					</IconToggle>
				</div>
			</div>

			<button
				type="button"
				onClick={flip}
				aria-label={t.card.flip}
				className="flip-scene relative block h-48 w-full px-5 text-left md:h-60"
			>
				<div
					className={`flip-inner ${flipped ? "is-flipped" : ""} ${peek ? "peek" : ""}`}
				>
					<div className="flip-face">
						{reverse ? (
							hasPicture(word) ? (
								<Picture word={word} />
							) : (
								<div className="text-center">
									<p className="font-display text-2xl leading-snug">
										<Sentence word={word} blank />
									</p>
									<p className="mt-4 text-sm text-muted">{t.card.missing}</p>
								</div>
							)
						) : (
							<p className="font-display text-6xl break-words text-center">
								{word.en}
							</p>
						)}
					</div>
					<div className="flip-face flip-back gap-4">
						<Picture word={word} />
						{(reverse || !hasPicture(word)) && (
							<p className="font-display text-4xl text-center">{word.en}</p>
						)}
						<p className="text-center text-lg leading-snug">
							<Sentence word={word} />
						</p>
					</div>
				</div>
				<FlipIcon className="absolute right-3 bottom-2 h-5 w-5 text-muted" />
			</button>

			<div className="flex gap-2 px-3 pb-3">
				<button
					type="button"
					disabled={!answerVisible}
					style={{ visibility: answerVisible ? "visible" : "hidden" }}
					onClick={() => speak(word.en)}
					className="flex h-11 flex-1 items-center justify-center gap-2 rounded-xl border border-ink disabled:opacity-30"
				>
					<SpeakerIcon />
					<span className="font-bold">{t.card.listen}</span>
				</button>
				{flipped && (
					<button
						type="button"
						onClick={() => speak(word.example, 0.8)}
						aria-label={t.card.listenExample}
						className="flex h-11 items-center gap-2 rounded-xl border border-line px-4"
					>
						<SpeakerIcon />
						<span className="text-sm">{t.card.listenExample}</span>
					</button>
				)}
			</div>

			<div className="border-t border-line">
				{showEs ? (
					<div className="px-5 py-3">
						<p className="text-2xl font-bold">{word.es}</p>
						<p className="mt-1 text-sm text-muted">
							{t.pos[word.pos]}
							{word.cognate && <> · {t.card.cognate}</>}
						</p>
					</div>
				) : (
					<button
						type="button"
						onClick={() => setShowEs(true)}
						className="w-full px-5 py-3 text-left text-muted underline decoration-dotted underline-offset-4"
					>
						{t.card.showSpanish}
					</button>
				)}
			</div>
		</article>
	);
}

function IconToggle({
	label,
	on,
	onClick,
	children,
}: {
	label: string;
	on: boolean;
	onClick: () => void;
	children: React.ReactNode;
}) {
	return (
		<button
			type="button"
			aria-label={label}
			aria-pressed={on}
			title={label}
			onClick={onClick}
			className={`grid h-10 w-10 place-items-center rounded-sm ${on ? "text-accent" : "text-muted"}`}
		>
			{children}
		</button>
	);
}
