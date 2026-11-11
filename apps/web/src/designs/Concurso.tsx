// Design 2 · "Concurso": a game show. See the picture, pick the right
// English word out of four. Points, streaks, chunky buttons.

import { useMemo, useState } from "react";
import { speak } from "#/lib/speech";
import {
	choicesFor,
	PICKS,
	type Pick,
	type Screen,
	splitExample,
	useRound,
} from "./shared";

const C = {
	bg: "#13183A",
	panel: "#1E2556",
	yellow: "#FFD23F",
	red: "#EF3E36",
	green: "#2EC4B6",
	white: "#FFFFFF",
};
const font = { fontFamily: "'Lilita One', system-ui, sans-serif" };
const chunky = (bg: string, fg = C.bg) => ({
	background: bg,
	color: fg,
	boxShadow: `0 6px 0 ${C.bg}, 0 6px 0 2px ${fg}`,
});

export default function Concurso({ start }: { start: Screen }) {
	const [pick, setPick] = useState<Pick | null>(
		start === "study" ? "todas" : null,
	);
	return (
		<div className="min-h-dvh text-white" style={{ ...font, background: C.bg }}>
			{pick ? (
				<Game pick={pick} onBack={() => setPick(null)} />
			) : (
				<Levels onPick={setPick} />
			)}
		</div>
	);
}

function Levels({ onPick }: { onPick: (p: Pick) => void }) {
	return (
		<div className="mx-auto max-w-md p-6">
			<div className="flex items-center justify-between text-xl">
				<span>🔥 3 días</span>
				<span style={{ color: C.yellow }}>★ 240</span>
			</div>
			<h1
				className="mt-8 text-center text-5xl leading-none"
				style={{ color: C.yellow, textShadow: `4px 4px 0 ${C.red}` }}
			>
				¡A JUGAR!
			</h1>
			<p
				className="mt-2 text-center opacity-70"
				style={{ fontFamily: "system-ui" }}
			>
				Elige un tema. 10 preguntas.
			</p>
			<div className="mt-8 grid gap-5">
				{PICKS.map((p, i) => (
					<button
						key={p.id}
						type="button"
						onClick={() => onPick(p.id)}
						className="flex h-16 items-center gap-4 border-2 px-4 text-2xl transition-transform active:translate-y-1.5"
						style={chunky(i === 0 ? C.yellow : C.white)}
					>
						<span className="text-3xl">{p.emoji}</span>
						<span className="flex-1 text-left">{p.name}</span>
						<span className="text-base" style={{ color: C.red }}>
							{"★".repeat((i * 7) % 4)}
							<span className="opacity-25">
								{"★".repeat(3 - ((i * 7) % 4))}
							</span>
						</span>
					</button>
				))}
			</div>
		</div>
	);
}

function Game({ pick, onBack }: { pick: Pick; onBack: () => void }) {
	const round = useRound(pick);
	const [chosen, setChosen] = useState<string | null>(null);
	const [score, setScore] = useState(0);
	const [streak, setStreak] = useState(0);
	const w = round.word;
	// biome-ignore lint/correctness/useExhaustiveDependencies: new options per word
	const options = useMemo(() => (w ? choicesFor(w) : []), [w?.id]);

	if (!round.ready) return null;
	if (round.finished || !w) {
		return (
			<div className="flex min-h-dvh flex-col items-center justify-center gap-4 p-6 text-center">
				<p className="text-7xl">🏆</p>
				<p className="text-5xl" style={{ color: C.yellow }}>
					{score} PUNTOS
				</p>
				<button
					type="button"
					onClick={() => {
						setScore(0);
						round.restart();
					}}
					className="mt-6 h-16 w-full max-w-xs border-2 text-2xl"
					style={chunky(C.yellow)}
				>
					OTRA VEZ
				</button>
				<button type="button" onClick={onBack} className="mt-4 opacity-70">
					Elegir tema
				</button>
			</div>
		);
	}

	const choose = (id: string) => {
		if (chosen) return;
		setChosen(id);
		const right = id === w.id;
		speak(w.en);
		if (right) {
			setStreak((s) => s + 1);
			setScore((s) => s + 10 + streak * 5);
		} else setStreak(0);
		setTimeout(() => {
			setChosen(null);
			round.answer(right);
		}, 1100);
	};

	const [before, , after] = splitExample(w);
	const answered = chosen !== null;

	return (
		<div className="mx-auto flex min-h-dvh max-w-md flex-col p-5">
			<header className="flex items-center gap-3 text-xl">
				<button type="button" onClick={onBack} aria-label="Salir">
					✕
				</button>
				<div className="flex flex-1 gap-1">
					{Array.from({ length: round.total }, (_, i) => (
						<span
							// biome-ignore lint/suspicious/noArrayIndexKey: fixed segments
							key={i}
							className="h-3 flex-1"
							style={{ background: i < round.known ? C.green : C.panel }}
						/>
					))}
				</div>
				<span style={{ color: C.yellow }}>★ {score}</span>
			</header>

			<div
				className="mt-6 flex h-56 flex-col items-center justify-center border-4 p-4 text-center"
				style={{ borderColor: C.yellow, background: C.panel }}
			>
				{w.pic ? (
					<span className="text-[7rem] leading-none">{w.pic}</span>
				) : (
					<span
						className="text-3xl"
						style={{ fontFamily: "system-ui", fontWeight: 700 }}
					>
						{before}
						<span style={{ color: C.yellow }}>____</span>
						{after}
					</span>
				)}
			</div>
			<p className="mt-3 h-7 text-center text-2xl" style={{ color: C.yellow }}>
				{streak >= 2 ? `🔥 ¡RACHA DE ${streak}!` : "¿Cómo se dice?"}
			</p>

			<div className="mt-4 grid grid-cols-2 gap-4">
				{options.map((o) => {
					const right = o.id === w.id;
					const bg = !answered
						? C.white
						: right
							? C.green
							: o.id === chosen
								? C.red
								: C.panel;
					const fg = answered && !right && o.id !== chosen ? "#6B72A8" : C.bg;
					return (
						<button
							key={o.id}
							type="button"
							onClick={() => choose(o.id)}
							className={`h-20 border-2 text-3xl transition-transform active:translate-y-1.5 ${answered && o.id === chosen && !right ? "animate-[shake_0.3s]" : ""}`}
							style={chunky(bg, fg)}
						>
							{o.en}
						</button>
					);
				})}
			</div>
			<style>
				{
					"@keyframes shake{25%{transform:translateX(-6px)}75%{transform:translateX(6px)}}"
				}
			</style>
		</div>
	);
}
