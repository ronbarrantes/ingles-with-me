// Design 1 · "Pila": a swipeable deck. Right = la sé, left = otra vez,
// tap = flip. Picker is a snap carousel of big colored cards.

import { useRef, useState } from "react";
import { Pic } from "#/data/pics";
import { speak } from "#/lib/speech";
import {
	PICKS,
	type Pick,
	pickName,
	type Screen,
	splitExample,
	useRound,
} from "./shared";

const COLORS: Record<Pick, string> = {
	todas: "#111111",
	personas: "#E4572E",
	casa: "#F3A712",
	mundo: "#29335C",
	acciones: "#3BB273",
	describir: "#7768AE",
	clave: "#1B998B",
};

const font = { fontFamily: "'Bricolage Grotesque', system-ui, sans-serif" };

export default function Pila({ start }: { start: Screen }) {
	const [pick, setPick] = useState<Pick | null>(
		start === "study" ? "todas" : null,
	);
	return (
		<div className="min-h-dvh bg-[#F6F4EF] text-[#111]" style={font}>
			{pick ? (
				<Deck pick={pick} onBack={() => setPick(null)} />
			) : (
				<Picker onPick={setPick} />
			)}
		</div>
	);
}

function Picker({ onPick }: { onPick: (p: Pick) => void }) {
	return (
		<div className="flex min-h-dvh flex-col justify-center gap-6 py-10">
			<div className="px-6">
				<p className="text-sm font-semibold uppercase tracking-widest opacity-50">
					Inglés With Me
				</p>
				<h1 className="mt-1 text-5xl leading-[0.95] font-extrabold">
					¿Qué vamos
					<br />a aprender?
				</h1>
			</div>
			<div className="flex snap-x snap-mandatory gap-4 overflow-x-auto px-6 pb-4 [scrollbar-width:none]">
				{PICKS.map((p) => (
					<button
						key={p.id}
						type="button"
						onClick={() => onPick(p.id)}
						className="flex h-[52dvh] w-[72vw] max-w-72 shrink-0 snap-center flex-col justify-between p-6 text-left text-white transition-transform active:scale-[0.97]"
						style={{ background: COLORS[p.id] }}
					>
						<span className="text-8xl">{p.emoji}</span>
						<span>
							<span className="block text-4xl leading-none font-extrabold">
								{p.name}
							</span>
							<span className="mt-3 block text-sm opacity-80">
								Toca para empezar →
							</span>
						</span>
					</button>
				))}
			</div>
			<p className="px-6 text-sm opacity-50">Desliza para ver más</p>
		</div>
	);
}

function Deck({ pick, onBack }: { pick: Pick; onBack: () => void }) {
	const round = useRound(pick);
	const [flipped, setFlipped] = useState(false);
	const [dx, setDx] = useState(0);
	const [leaving, setLeaving] = useState<0 | 1 | -1>(0);
	const drag = useRef<{ x: number; moved: boolean } | null>(null);
	const color = COLORS[pick];

	const decide = (dir: 1 | -1) => {
		setLeaving(dir);
		setTimeout(() => {
			round.answer(dir === 1);
			setLeaving(0);
			setDx(0);
			setFlipped(false);
		}, 220);
	};

	if (!round.ready) return null;
	if (round.finished || !round.word) {
		return (
			<div className="flex min-h-dvh flex-col items-center justify-center gap-6 p-6 text-center">
				<p className="text-8xl">🎉</p>
				<p className="text-4xl font-extrabold">
					¡{round.total} de {round.total}!
				</p>
				<button
					type="button"
					onClick={round.restart}
					className="h-14 w-full max-w-xs font-bold text-white"
					style={{ background: color }}
				>
					Otra ronda
				</button>
				<button type="button" onClick={onBack} className="underline">
					Cambiar tema
				</button>
			</div>
		);
	}

	const w = round.word;
	const [before, hit, after] = splitExample(w);
	const x = leaving ? leaving * 500 : dx;
	const tilt = x / 18;

	return (
		<div className="flex min-h-dvh flex-col p-5">
			<header className="flex items-center justify-between">
				<button
					type="button"
					onClick={onBack}
					className="text-2xl"
					aria-label="Volver"
				>
					←
				</button>
				<span className="font-bold">{pickName(pick)}</span>
				<span className="tabular-nums opacity-60">
					{round.known}/{round.total}
				</span>
			</header>

			<div className="relative mt-6 flex-1">
				{round.upNext
					.slice()
					.reverse()
					.map((n, i) => (
						<div
							key={n.id}
							className="absolute inset-x-0 top-0 h-[58dvh] border-2 border-[#111] bg-white"
							style={{
								transform: `translateY(${(round.upNext.length - i) * 10}px) scale(${1 - (round.upNext.length - i) * 0.04})`,
							}}
						/>
					))}
				<button
					type="button"
					aria-label="Voltear"
					className="absolute inset-x-0 top-0 flex h-[58dvh] touch-none flex-col items-center justify-center gap-4 border-2 border-[#111] bg-white p-6 select-none"
					style={{
						transform: `translateX(${x}px) rotate(${tilt}deg)`,
						transition: drag.current ? "none" : "transform 0.22s ease-out",
					}}
					onPointerDown={(e) => {
						drag.current = { x: e.clientX, moved: false };
						(e.target as HTMLElement).setPointerCapture(e.pointerId);
					}}
					onPointerMove={(e) => {
						if (!drag.current) return;
						const d = e.clientX - drag.current.x;
						if (Math.abs(d) > 6) drag.current.moved = true;
						setDx(d);
					}}
					onPointerUp={() => {
						const moved = drag.current?.moved;
						drag.current = null;
						if (dx > 90) decide(1);
						else if (dx < -90) decide(-1);
						else {
							setDx(0);
							if (!moved) {
								if (!flipped) speak(w.en);
								setFlipped((f) => !f);
							}
						}
					}}
				>
					<Stamp show={dx > 30} text="LA SÉ" color="#3BB273" side="left" />
					<Stamp show={dx < -30} text="OTRA VEZ" color="#E4572E" side="right" />
					{flipped ? (
						<>
							<span className="text-[7rem] leading-none">
								{w.pic || <Pic id={w.id} className="h-36 w-36" />}
							</span>
							<span className="text-5xl font-extrabold">{w.en}</span>
							<span className="text-center text-lg">
								{before}
								<b style={{ color }}>{hit}</b>
								{after}
							</span>
						</>
					) : (
						<>
							<span className="text-6xl font-extrabold">{w.en}</span>
							<span className="text-sm opacity-50">
								Toca para ver · desliza para responder
							</span>
						</>
					)}
				</button>
			</div>

			<div className="grid grid-cols-3 gap-3 pt-4">
				<button
					type="button"
					onClick={() => decide(-1)}
					className="h-16 border-2 border-[#111] text-2xl font-bold"
					aria-label="Otra vez"
				>
					✕
				</button>
				<button
					type="button"
					onClick={() => speak(w.en)}
					className="h-16 border-2 border-[#111] text-2xl"
					aria-label="Escuchar"
				>
					🔊
				</button>
				<button
					type="button"
					onClick={() => decide(1)}
					className="h-16 text-2xl font-bold text-white"
					style={{ background: color }}
					aria-label="La sé"
				>
					✓
				</button>
			</div>
		</div>
	);
}

function Stamp({
	show,
	text,
	color,
	side,
}: {
	show: boolean;
	text: string;
	color: string;
	side: "left" | "right";
}) {
	return (
		<span
			className={`absolute top-6 border-4 px-3 py-1 text-2xl font-extrabold transition-opacity ${side === "left" ? "left-6 -rotate-12" : "right-6 rotate-12"} ${show ? "opacity-100" : "opacity-0"}`}
			style={{ color, borderColor: color }}
		>
			{text}
		</span>
	);
}
