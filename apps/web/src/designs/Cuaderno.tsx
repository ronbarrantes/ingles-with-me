// Design 3 · "Cuaderno": a school notebook. Topics are sticky notes; each
// word is a taped polaroid you tap to "write" the word. Known words become
// stickers collected at the top of the page.

import { useState } from "react";
import { speak } from "#/lib/speech";
import {
	PICKS,
	type Pick,
	pickName,
	type Screen,
	splitExample,
	useRound,
} from "./shared";

const INK = "#2B4C9B";
const hand = { fontFamily: "'Caveat', cursive" };
const paper = {
	backgroundColor: "#FBF7EC",
	backgroundImage:
		"linear-gradient(90deg, transparent 38px, #F2A7A7 38px, #F2A7A7 40px, transparent 40px), repeating-linear-gradient(#FBF7EC 0 31px, #CFE0F2 31px 32px)",
	color: INK,
};
const NOTES = [
	"#FFE66D",
	"#FFB5C2",
	"#B8F2C9",
	"#A9D6FF",
	"#FFD3A5",
	"#D9C8FF",
	"#FFF3B0",
];

export default function Cuaderno({ start }: { start: Screen }) {
	const [pick, setPick] = useState<Pick | null>(
		start === "study" ? "todas" : null,
	);
	return (
		<div className="min-h-dvh" style={paper}>
			{pick ? (
				<Page pick={pick} onBack={() => setPick(null)} />
			) : (
				<Topics onPick={setPick} />
			)}
		</div>
	);
}

function Topics({ onPick }: { onPick: (p: Pick) => void }) {
	return (
		<div className="mx-auto max-w-md py-8 pr-6 pl-14">
			<p className="text-xl" style={hand}>
				lunes, 11 de noviembre
			</p>
			<h1 className="text-6xl leading-none" style={hand}>
				Mis temas ✏️
			</h1>
			<div className="mt-8 grid grid-cols-2 gap-5">
				{PICKS.map((p, i) => (
					<button
						key={p.id}
						type="button"
						onClick={() => onPick(p.id)}
						className="flex aspect-square flex-col items-start justify-between p-3 text-left text-[#3a3a3a] transition-transform active:scale-95"
						style={{
							background: NOTES[i % NOTES.length],
							transform: `rotate(${[-3, 2, -1.5, 3, -2, 1.5, -2.5][i % 7]}deg)`,
							boxShadow: "2px 4px 0 rgba(0,0,0,0.08)",
						}}
					>
						<span className="text-5xl">{p.emoji}</span>
						<span className="text-3xl leading-none" style={hand}>
							{p.name}
						</span>
					</button>
				))}
			</div>
		</div>
	);
}

function Page({ pick, onBack }: { pick: Pick; onBack: () => void }) {
	const round = useRound(pick);
	const [shown, setShown] = useState(false);
	const [stickers, setStickers] = useState<string[]>([]);

	if (!round.ready) return null;
	const w = round.word;

	const next = (knew: boolean) => {
		if (knew && w) setStickers((s) => [...s, w.pic || "⭐"]);
		setShown(false);
		round.answer(knew);
	};

	return (
		<div className="mx-auto flex min-h-dvh max-w-md flex-col py-6 pr-5 pl-14">
			<header className="flex items-baseline justify-between" style={hand}>
				<button type="button" onClick={onBack} className="text-2xl">
					← temas
				</button>
				<span className="text-3xl">{pickName(pick)}</span>
			</header>

			<div
				className="mt-3 flex min-h-12 flex-wrap gap-1 border-2 border-dashed p-1.5"
				style={{ borderColor: "#CFE0F2" }}
			>
				{stickers.length === 0 && (
					<span className="text-xl opacity-50" style={hand}>
						tus stickers van aquí…
					</span>
				)}
				{stickers.map((s, i) => (
					<span
						// biome-ignore lint/suspicious/noArrayIndexKey: append-only list
						key={i}
						className="grid h-9 w-9 place-items-center rounded-full bg-white text-xl"
						style={{
							transform: `rotate(${((i * 37) % 30) - 15}deg)`,
							boxShadow: "0 1px 2px rgba(0,0,0,.2)",
						}}
					>
						{s}
					</span>
				))}
			</div>

			{round.finished || !w ? (
				<div className="mt-16 text-center" style={hand}>
					<p className="text-6xl">¡Página completa!</p>
					<button
						type="button"
						onClick={() => {
							setStickers([]);
							round.restart();
						}}
						className="mt-6 text-3xl underline"
					>
						nueva página
					</button>
				</div>
			) : (
				<>
					<button
						type="button"
						onClick={() => {
							if (!shown) speak(w.en);
							setShown(true);
						}}
						className="relative mx-auto mt-8 w-64 bg-white p-3 pb-2"
						style={{
							transform: "rotate(-2deg)",
							boxShadow: "0 6px 14px rgba(0,0,0,0.15)",
						}}
					>
						<span className="absolute -top-3 left-1/2 h-6 w-24 -translate-x-1/2 rotate-2 bg-[#F5E6A8]/80" />
						<span className="grid h-52 place-items-center bg-[#EEF3F8] text-[7rem]">
							{w.pic || "💭"}
						</span>
						<span
							className="block h-14 pt-1 text-center text-5xl"
							style={{ ...hand, color: INK }}
						>
							{shown ? w.en : "¿…?"}
						</span>
					</button>

					<p className="mt-6 text-3xl leading-8" style={hand}>
						{shown ? (
							(() => {
								const [b, h, a] = splitExample(w);
								return (
									<>
										{b}
										<u className="decoration-[#E4572E] decoration-2">{h}</u>
										{a}
									</>
								);
							})()
						) : (
							<span className="opacity-50">
								toca la foto para escribir la palabra
							</span>
						)}
					</p>

					<div
						className="mt-auto flex items-center justify-between pt-6"
						style={hand}
					>
						<button
							type="button"
							onClick={() => next(false)}
							className="text-3xl"
						>
							↺ otra vez
						</button>
						<button
							type="button"
							onClick={() => speak(w.en)}
							className="text-3xl"
							aria-label="Escuchar"
						>
							🔊
						</button>
						<button
							type="button"
							onClick={() => next(true)}
							className="-rotate-6 border-4 border-[#E4572E] px-3 text-3xl text-[#E4572E]"
						>
							¡la sé! ✓
						</button>
					</div>
				</>
			)}
		</div>
	);
}
