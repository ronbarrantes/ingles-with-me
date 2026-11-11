import { useState } from "react";
import type { Word } from "#/data/words";
import { t } from "#/i18n";
import { speak } from "#/lib/speech";
import { actions, useStore } from "#/lib/store";
import { Art, hasArt, onColor } from "./Art";
import { BookmarkIcon, SpeakerIcon, StarIcon } from "./icons";

const escapeRe = (s: string) => s.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");

/** Stop a tap on an inner control from also flipping or dragging the card. */
const stop = {
	onPointerDown: (e: React.PointerEvent) => e.stopPropagation(),
	onClick: (e: React.MouseEvent) => e.stopPropagation(),
};

/**
 * A word card. Front: the English word. Back: picture, word and example
 * sentence, with the Spanish on a tab at the bottom. Corners: favorite and
 * mark. Flipping and dragging are handled by the parent.
 */
export function Card({
	word,
	flipped,
	color,
	hint = false,
}: {
	word: Word;
	flipped: boolean;
	color: string;
	hint?: boolean;
}) {
	const state = useStore();
	const [es, setEs] = useState(false);
	const fav = state.favorites.includes(word.id);
	const marked = state.marked.includes(word.id);
	const parts = word.example.split(
		new RegExp(`\\b(${escapeRe(word.en)})\\b`, "i"),
	);

	return (
		<div className="relative h-full w-full [perspective:1400px]">
			<div
				className="relative h-full w-full transition-transform duration-500 [transform-style:preserve-3d] motion-reduce:transition-none"
				style={{ transform: flipped ? "rotateY(180deg)" : "none" }}
			>
				{/* Front */}
				<div className="absolute inset-0 flex flex-col items-center justify-center gap-3 border-2 border-ink bg-card p-6 [backface-visibility:hidden]">
					<span className="text-center text-6xl font-extrabold break-words">
						{word.en}
					</span>
					{hint && (
						<span className="absolute bottom-5 text-sm text-muted">
							{t.deck.hint}
						</span>
					)}
				</div>

				{/* Back */}
				<div className="absolute inset-0 flex flex-col border-2 border-ink bg-card [backface-visibility:hidden] [transform:rotateY(180deg)]">
					<span className="absolute inset-x-14 top-5 text-center text-[11px] font-bold tracking-[0.18em] text-muted uppercase">
						{t.categories[word.category]}
					</span>
					<div className="flex flex-1 flex-col items-center justify-center gap-3 p-6 pt-14">
						<Art word={word} />
						<span
							className={`text-center font-extrabold ${hasArt(word) ? "text-4xl" : "text-6xl"}`}
						>
							{word.en}
						</span>
						<button
							type="button"
							{...stop}
							onClick={(e) => {
								e.stopPropagation();
								speak(word.example, 0.8);
							}}
							aria-label={t.deck.listenSentence}
							className="text-center text-lg leading-snug underline decoration-dotted decoration-2 underline-offset-[6px]"
							style={{ textDecorationColor: color }}
						>
							<SpeakerIcon
								className="mr-1.5 inline h-5 w-5 align-[-3px]"
								style={{ color }}
							/>
							{parts.map((p, i) =>
								i % 2 ? (
									// biome-ignore lint/suspicious/noArrayIndexKey: static split
									<b key={i} style={{ color }}>
										{p}
									</b>
								) : (
									p
								),
							)}
						</button>
					</div>
					<button
						type="button"
						{...stop}
						onClick={(e) => {
							e.stopPropagation();
							setEs((v) => !v);
						}}
						aria-expanded={es}
						className="w-full text-left transition-[padding] duration-300"
						style={{ background: color, color: onColor(color) }}
					>
						<span className={`block px-5 ${es ? "pt-3 pb-4" : "py-2.5"}`}>
							{es ? (
								<>
									<span className="block text-xs font-bold tracking-widest opacity-80">
										{t.deck.spanish} ↓
									</span>
									<span className="mt-1 block text-2xl font-extrabold">
										{word.es}
									</span>
									<span className="block text-sm opacity-85">
										{t.pos[word.pos]}
										{word.cognate && <> · {t.deck.cognate}</>}
									</span>
								</>
							) : (
								<span className="text-sm font-bold tracking-widest">
									{t.deck.spanish} ↑
								</span>
							)}
						</span>
					</button>
				</div>
			</div>

			{/* Corners: stay put while the card flips */}
			<CornerButton
				side="left"
				on={fav}
				label={t.deck.favorite}
				onPress={() => actions.toggleFavorite(word.id)}
				color={color}
			>
				<StarIcon filled={fav} className="h-5 w-5" />
			</CornerButton>
			<CornerButton
				side="right"
				on={marked}
				label={t.deck.mark}
				onPress={() => actions.toggleMarked(word.id)}
				color={color}
			>
				<BookmarkIcon filled={marked} className="h-5 w-5" />
			</CornerButton>
		</div>
	);
}

function CornerButton({
	side,
	on,
	label,
	onPress,
	color,
	children,
}: {
	side: "left" | "right";
	on: boolean;
	label: string;
	onPress: () => void;
	color: string;
	children: React.ReactNode;
}) {
	return (
		<button
			type="button"
			{...stop}
			onClick={(e) => {
				e.stopPropagation();
				onPress();
			}}
			aria-label={label}
			aria-pressed={on}
			className={`absolute top-3 grid h-9 w-9 place-items-center border-2 border-ink ${side === "left" ? "left-3" : "right-3"}`}
			style={
				on
					? { background: color, color: onColor(color), borderColor: color }
					: { background: "var(--card)" }
			}
		>
			{children}
		</button>
	);
}
