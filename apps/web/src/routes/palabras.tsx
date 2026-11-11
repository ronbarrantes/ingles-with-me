import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { Art, onColor } from "#/components/Art";
import { Card } from "#/components/Card";
import { CheckIcon, SearchIcon } from "#/components/icons";
import { colorOf, TOPIC_COLOR, TOPIC_IDS, type TopicId } from "#/data/topics";
import { ALL_WORDS, type Word } from "#/data/words";
import { t, topicName } from "#/i18n";
import { speak } from "#/lib/speech";
import { isLearned, useStore } from "#/lib/store";

export const Route = createFileRoute("/palabras")({ component: Words });

type Filter = TopicId | "favorites" | "bonus";

const normalize = (s: string) =>
	s.toLowerCase().normalize("NFD").replace(/[̀-ͯ]/g, "");

/** Palabras: every word as a mini card. Tap one to open the full card. */
function Words() {
	const state = useStore();
	const [filter, setFilter] = useState<Filter>("todas");
	const [query, setQuery] = useState("");
	const [open, setOpen] = useState<Word | null>(null);

	const q = normalize(query.trim());
	const words = ALL_WORDS.filter((w) => {
		if (filter === "favorites" && !state.favorites.includes(w.id)) return false;
		if (filter === "bonus" && !w.bonus) return false;
		if (
			filter !== "todas" &&
			filter !== "favorites" &&
			filter !== "bonus" &&
			w.group !== filter
		)
			return false;
		return !q || normalize(w.en).includes(q) || normalize(w.es).includes(q);
	});

	const chips: { id: Filter; label: string; color: string }[] = [
		...TOPIC_IDS.map((id) => ({
			id,
			label: topicName(id),
			color: TOPIC_COLOR[id],
		})),
		{ id: "favorites", label: `★ ${t.review.favorites}`, color: "#E0A100" },
		{ id: "bonus", label: t.words.bonus, color: "#C04ABC" },
	];

	return (
		<div className="px-5 py-8">
			<h1 className="px-1 text-5xl font-extrabold">{t.words.title}</h1>

			<label className="mt-5 flex h-12 items-center gap-2 border-2 border-ink bg-card px-3">
				<SearchIcon className="h-5 w-5 opacity-60" />
				<input
					type="search"
					value={query}
					onChange={(e) => setQuery(e.target.value)}
					placeholder={t.words.search}
					className="h-full flex-1 bg-transparent outline-none placeholder:text-muted"
				/>
			</label>

			<div className="-mx-5 mt-3 flex gap-2 overflow-x-auto px-5 pb-1 [scrollbar-width:none]">
				{chips.map((c) => {
					const on = filter === c.id;
					return (
						<button
							key={c.id}
							type="button"
							aria-pressed={on}
							onClick={() => setFilter(c.id)}
							className="h-9 shrink-0 border-2 px-3 text-sm font-bold"
							style={
								on
									? {
											background: c.color,
											borderColor: c.color,
											color: onColor(c.color),
										}
									: { borderColor: "var(--ink)" }
							}
						>
							{c.label}
						</button>
					);
				})}
			</div>

			{words.length === 0 ? (
				<p className="py-12 text-center text-muted">{t.words.empty}</p>
			) : (
				<ul className="mt-4 grid grid-cols-3 gap-2.5">
					{words.map((w) => (
						<li key={w.id}>
							<button
								type="button"
								onClick={() => setOpen(w)}
								className="relative flex aspect-[3/4] w-full flex-col items-center justify-center gap-2 border-2 border-ink bg-card p-2 transition-transform active:scale-95"
							>
								<span
									className="absolute inset-x-0 top-0 h-1.5"
									style={{ background: colorOf(w) }}
								/>
								{isLearned(state, w.id) && (
									<CheckIcon
										className="absolute top-2.5 right-1.5 h-4 w-4"
										style={{ color: colorOf(w) }}
									/>
								)}
								{state.favorites.includes(w.id) && (
									<span className="absolute top-2 left-2 text-xs text-[#E0A100]">
										★
									</span>
								)}
								<Art word={w} size="md" />
								<span className="text-center text-base leading-tight font-extrabold break-words">
									{w.en}
								</span>
							</button>
						</li>
					))}
				</ul>
			)}

			{open && <WordOverlay word={open} onClose={() => setOpen(null)} />}
		</div>
	);
}

/** A full card over the list: tap to flip, like in the deck. */
function WordOverlay({ word, onClose }: { word: Word; onClose: () => void }) {
	const [flipped, setFlipped] = useState(false);
	const color = colorOf(word);
	const flip = () => {
		if (!flipped) speak(word.en);
		setFlipped((f) => !f);
	};

	useEffect(() => {
		const onKey = (e: KeyboardEvent) => e.key === "Escape" && onClose();
		window.addEventListener("keydown", onKey);
		document.body.style.overflow = "hidden";
		return () => {
			window.removeEventListener("keydown", onKey);
			document.body.style.overflow = "";
		};
	}, [onClose]);

	return (
		<div className="fixed inset-0 z-30 flex flex-col bg-paper/95 p-5 pt-[calc(1.25rem+env(safe-area-inset-top))] pb-[calc(1.25rem+env(safe-area-inset-bottom))] backdrop-blur-sm">
			<div className="mx-auto flex w-full max-w-md flex-1 flex-col">
				<div className="flex justify-end">
					<button
						type="button"
						onClick={onClose}
						className="grid h-10 w-10 place-items-center text-2xl"
						aria-label={t.words.close}
					>
						✕
					</button>
				</div>
				{/* biome-ignore lint/a11y/useSemanticElements: holds its own buttons, so it can't be a <button> */}
				<div
					role="button"
					tabIndex={0}
					onClick={flip}
					onKeyDown={(e) => {
						if (e.key === "Enter" || e.key === " ") {
							e.preventDefault();
							flip();
						}
					}}
					aria-label={t.deck.hint}
					className="mt-2 flex-1 cursor-pointer outline-none"
				>
					<Card word={word} flipped={flipped} color={color} />
				</div>
				<button
					type="button"
					onClick={() => speak(word.en)}
					className="mt-5 h-16 border-2 border-ink text-xl font-bold"
				>
					🔊 {t.deck.listen}
				</button>
			</div>
		</div>
	);
}
