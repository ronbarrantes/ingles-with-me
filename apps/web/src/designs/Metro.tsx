// Design 4 · "Metro": transit signage. Each topic is a subway line, each
// word a stop. Huge type, flat color, a route map as progress.

import { useState } from "react";
import { Pic } from "#/data/pics";
import { speak } from "#/lib/speech";
import {
	PICKS,
	type Pick,
	type Screen,
	splitExample,
	useRound,
} from "./shared";

const LINES: Record<Pick, { color: string; letter: string; dark?: boolean }> = {
	todas: { color: "#808183", letter: "T" },
	personas: { color: "#EE352E", letter: "P" },
	casa: { color: "#FF6319", letter: "C" },
	mundo: { color: "#00933C", letter: "M" },
	acciones: { color: "#0039A6", letter: "A" },
	describir: { color: "#FCCC0A", letter: "D", dark: true },
	clave: { color: "#B933AD", letter: "K" },
};
const font = { fontFamily: "'Archivo', 'Helvetica Neue', Arial, sans-serif" };

function Bullet({ pick, size = 44 }: { pick: Pick; size?: number }) {
	const l = LINES[pick];
	return (
		<span
			className="grid shrink-0 place-items-center rounded-full font-black"
			style={{
				width: size,
				height: size,
				background: l.color,
				color: l.dark ? "#000" : "#fff",
				fontSize: size * 0.55,
			}}
		>
			{l.letter}
		</span>
	);
}

export default function Metro({ start }: { start: Screen }) {
	const [pick, setPick] = useState<Pick | null>(
		start === "study" ? "acciones" : null,
	);
	return (
		<div className="min-h-dvh bg-white text-black" style={font}>
			{pick ? (
				<Ride pick={pick} onBack={() => setPick(null)} />
			) : (
				<Lines onPick={setPick} />
			)}
		</div>
	);
}

function Lines({ onPick }: { onPick: (p: Pick) => void }) {
	return (
		<div className="mx-auto max-w-md">
			<div className="bg-black px-5 pt-10 pb-5 text-white">
				<p className="text-sm font-bold tracking-wide opacity-70">
					INGLÉS WITH ME
				</p>
				<h1 className="mt-1 text-4xl font-black tracking-tight">
					Elige tu línea
				</h1>
			</div>
			<div className="h-2 bg-white" />
			{PICKS.map((p) => (
				<button
					key={p.id}
					type="button"
					onClick={() => onPick(p.id)}
					className="flex w-full items-center gap-4 border-b-2 border-black px-5 py-4 text-left active:bg-black/5"
				>
					<Bullet pick={p.id} />
					<span className="flex-1 text-2xl font-black tracking-tight">
						{p.name}
					</span>
					<span className="text-2xl font-black">→</span>
				</button>
			))}
		</div>
	);
}

function Ride({ pick, onBack }: { pick: Pick; onBack: () => void }) {
	const round = useRound(pick);
	const [open, setOpen] = useState(false);
	const line = LINES[pick];
	if (!round.ready) return null;
	const w = round.word;

	const go = (knew: boolean) => {
		setOpen(false);
		round.answer(knew);
	};

	return (
		<div className="mx-auto flex min-h-dvh max-w-md flex-col">
			<div className="flex items-center gap-3 bg-black px-5 pt-8 pb-4 text-white">
				<button
					type="button"
					onClick={onBack}
					className="text-2xl font-black"
					aria-label="Volver"
				>
					←
				</button>
				<Bullet pick={pick} size={36} />
				<span className="text-lg font-bold">Próxima parada</span>
			</div>

			{/* Route map */}
			<div className="relative mx-5 mt-5 h-6">
				<div
					className="absolute inset-x-0 top-1/2 h-2 -translate-y-1/2"
					style={{ background: line.color }}
				/>
				<div className="relative flex justify-between">
					{Array.from({ length: round.total }, (_, i) => (
						<span
							// biome-ignore lint/suspicious/noArrayIndexKey: fixed stops
							key={i}
							className="h-6 w-6 rounded-full border-4"
							style={{
								borderColor: i < round.known ? line.color : "#000",
								background: i === round.known ? "#000" : "#fff",
							}}
						/>
					))}
				</div>
			</div>

			{round.finished || !w ? (
				<div className="flex flex-1 flex-col items-center justify-center gap-4 p-6 text-center">
					<Bullet pick={pick} size={88} />
					<p className="text-4xl font-black">Fin de la línea</p>
					<button
						type="button"
						onClick={round.restart}
						className="mt-4 h-14 w-full bg-black font-black text-white"
					>
						Viajar otra vez
					</button>
				</div>
			) : (
				<>
					<div className="flex-1 px-5 pt-8">
						<p className="text-sm font-bold tracking-widest opacity-50">
							PARADA {round.known + 1} DE {round.total}
						</p>
						<button
							type="button"
							onClick={() => speak(w.en)}
							className="mt-1 block text-left text-7xl leading-[0.9] font-black tracking-tighter break-words"
						>
							{w.en}
						</button>
						{open ? (
							<div className="mt-6 flex items-center gap-4 border-4 border-black p-4">
								<span className="text-6xl">
									{w.pic || <Pic id={w.id} className="h-16 w-16" />}
								</span>
								<span className="text-lg font-bold">
									{(() => {
										const [b, h, a] = splitExample(w);
										return (
											<>
												{b}
												<span
													className="px-1"
													style={{
														background: line.color,
														color: line.dark ? "#000" : "#fff",
													}}
												>
													{h}
												</span>
												{a}
											</>
										);
									})()}
								</span>
							</div>
						) : (
							<button
								type="button"
								onClick={() => {
									setOpen(true);
									speak(w.en);
								}}
								className="mt-6 h-14 w-full border-4 border-black text-lg font-black"
							>
								👁 Ver dibujo
							</button>
						)}
					</div>
					<div className="grid grid-cols-2">
						<button
							type="button"
							onClick={() => go(false)}
							className="h-20 bg-[#E5E5E5] text-xl font-black"
						>
							↺ Otra vez
						</button>
						<button
							type="button"
							onClick={() => go(true)}
							className="h-20 text-xl font-black"
							style={{
								background: line.color,
								color: line.dark ? "#000" : "#fff",
							}}
						>
							Siguiente →
						</button>
					</div>
				</>
			)}
		</div>
	);
}
