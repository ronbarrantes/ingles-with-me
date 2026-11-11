import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { Flashcard } from "#/components/Flashcard";
import { CheckIcon, CloseIcon, SearchIcon, StarIcon } from "#/components/icons";
import {
	ALL_WORDS,
	CATEGORY_ORDER,
	type CategoryId,
	type Word,
} from "#/data/words";
import { t } from "#/i18n";
import { isLearned, useStore } from "#/lib/store";

export const Route = createFileRoute("/palabras")({ component: Words });

type Filter = "all" | "favorites" | CategoryId;

const normalize = (s: string) =>
	s.toLowerCase().normalize("NFD").replace(/[̀-ͯ]/g, "");

function Words() {
	const state = useStore();
	const [filter, setFilter] = useState<Filter>("all");
	const [query, setQuery] = useState("");
	const [open, setOpen] = useState<Word | null>(null);

	const q = normalize(query.trim());
	const words = ALL_WORDS.filter((w) => {
		if (filter === "favorites" && !state.favorites.includes(w.id)) return false;
		if (filter !== "all" && filter !== "favorites" && w.category !== filter)
			return false;
		return !q || normalize(w.en).includes(q) || normalize(w.es).includes(q);
	});

	const chips: [Filter, string][] = [
		["all", t.words.all],
		["favorites", t.words.favorites],
		...CATEGORY_ORDER.map((c) => [c, t.categories[c]] as [Filter, string]),
	];

	return (
		<div className="space-y-4">
			<h1 className="font-display text-3xl">{t.nav.words}</h1>

			<label className="flex h-12 items-center gap-2 rounded-xl border border-line bg-card px-3">
				<SearchIcon className="text-muted" />
				<input
					type="search"
					value={query}
					onChange={(e) => setQuery(e.target.value)}
					placeholder={t.words.search}
					className="h-full flex-1 bg-transparent outline-none placeholder:text-muted"
				/>
			</label>

			<div className="-mx-4 flex gap-2 overflow-x-auto px-4 pb-1 [scrollbar-width:none]">
				{chips.map(([key, label]) => (
					<button
						key={key}
						type="button"
						aria-pressed={filter === key}
						onClick={() => setFilter(key)}
						className={`shrink-0 rounded-sm border px-3.5 py-1.5 text-sm font-bold ${filter === key ? "border-ink bg-ink text-paper" : "border-line text-muted"}`}
					>
						{label}
					</button>
				))}
			</div>

			{words.length === 0 ? (
				<p className="py-10 text-center text-muted">{t.words.empty}</p>
			) : (
				<ul className="divide-y divide-line rounded-2xl border border-line bg-card">
					{words.map((w) => (
						<li key={w.id}>
							<button
								type="button"
								onClick={() => setOpen(w)}
								className="flex w-full items-center gap-3 px-4 py-2.5 text-left"
							>
								<span className="grid h-10 w-10 shrink-0 place-items-center text-2xl">
									{w.pic || (
										<span className="font-display text-xl text-muted">
											{w.en[0]}
										</span>
									)}
								</span>
								<span className="flex-1 font-display text-xl">{w.en}</span>
								{state.favorites.includes(w.id) && (
									<StarIcon filled className="h-4 w-4 text-accent" />
								)}
								{isLearned(state, w.id) && (
									<span title={t.words.learned}>
										<CheckIcon className="h-5 w-5 text-accent" />
										<span className="sr-only">{t.words.learned}</span>
									</span>
								)}
							</button>
						</li>
					))}
				</ul>
			)}

			{open && <WordSheet word={open} onClose={() => setOpen(null)} />}
		</div>
	);
}

function WordSheet({ word, onClose }: { word: Word; onClose: () => void }) {
	const [flipped, setFlipped] = useState(false);

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
		<div className="fixed inset-0 z-30 flex items-end justify-center">
			<button
				type="button"
				aria-label={t.words.close}
				onClick={onClose}
				className="absolute inset-0 bg-ink/40"
			/>
			<div className="relative w-full max-w-md rounded-t-sm bg-paper p-4 pb-[calc(1rem+env(safe-area-inset-bottom))]">
				<div className="mb-2 flex justify-end">
					<button
						type="button"
						onClick={onClose}
						aria-label={t.words.close}
						className="grid h-10 w-10 place-items-center rounded-sm text-muted"
					>
						<CloseIcon />
					</button>
				</div>
				<Flashcard
					key={word.id}
					word={word}
					direction="word"
					flipped={flipped}
					onFlip={() => setFlipped((f) => !f)}
				/>
			</div>
		</div>
	);
}
