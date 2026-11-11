import { useCallback, useEffect, useRef, useState } from "react";
import type { Word } from "#/data/words";
import { t } from "#/i18n";
import { speak } from "#/lib/speech";
import { actions } from "#/lib/store";
import { onColor } from "./Art";
import { Card } from "./Card";

const FLING_DISTANCE = 100; // px
const FLING_SPEED = 0.45; // px per ms
const LONG_PRESS = 550; // ms
const SPRING = "transform 420ms cubic-bezier(.2,1.5,.35,1)";

type Gesture = {
	x: number;
	y: number;
	t: number;
	lx: number;
	vx: number;
	moved: boolean;
	long: boolean;
};

/**
 * The swipeable deck. `words[0]` is on top. Right = la sé, left = otra vez,
 * tap = flip, long-press = favorite. A flick keeps its speed; a slow, short
 * drag springs back. The next card grows into place as the top one leaves.
 */
export function SwipeDeck({
	words,
	color,
	onAnswer,
	hint = false,
}: {
	words: Word[];
	color: string;
	onAnswer: (word: Word, knew: boolean) => void;
	hint?: boolean;
}) {
	const [dx, setDx] = useState(0);
	const [dy, setDy] = useState(0);
	const [dragging, setDragging] = useState(false);
	const [leaving, setLeaving] = useState<{ dir: 1 | -1; ms: number } | null>(
		null,
	);
	const [flipped, setFlipped] = useState(false);
	const [favStamp, setFavStamp] = useState(false);
	const g = useRef<Gesture | null>(null);
	const timer = useRef<ReturnType<typeof setTimeout>>(undefined);
	const top = words[0];

	const fling = useCallback(
		(dir: 1 | -1, speed = 0) => {
			if (!top || leaving) return;
			const ms = Math.round(
				Math.max(170, Math.min(360, 300 / Math.max(Math.abs(speed), 0.8))),
			);
			setLeaving({ dir, ms });
			setTimeout(() => {
				onAnswer(top, dir === 1);
				setLeaving(null);
				setDx(0);
				setDy(0);
				setFlipped(false);
			}, ms);
		},
		[top, leaving, onAnswer],
	);

	// Keyboard (desktop): Space flips, ←/→ answer, S speaks.
	useEffect(() => {
		const onKey = (e: KeyboardEvent) => {
			if (
				(e.target as HTMLElement).closest("input, textarea") ||
				e.metaKey ||
				e.ctrlKey
			)
				return;
			if (e.key === " ") {
				e.preventDefault();
				setFlipped((f) => !f);
			} else if (e.key === "ArrowRight") fling(1, 1.2);
			else if (e.key === "ArrowLeft") fling(-1, 1.2);
			else if (e.key.toLowerCase() === "s" && top) speak(top.en);
		};
		window.addEventListener("keydown", onKey);
		return () => window.removeEventListener("keydown", onKey);
	}, [fling, top]);

	if (!top) return null;

	const x = leaving
		? leaving.dir *
			(typeof window === "undefined" ? 600 : window.innerWidth + 260)
		: dx;
	const y = leaving ? dy + 40 : dy;
	const progress = leaving ? 1 : Math.min(1, Math.abs(dx) / 140);
	const transition = dragging
		? "none"
		: leaving
			? `transform ${leaving.ms}ms cubic-bezier(.3,.7,.6,1)`
			: SPRING;
	const under = words.slice(1, 3);

	return (
		<div className="flex flex-1 flex-col">
			<div className="relative flex-1">
				{under
					.map((w, i) => ({ w, i }))
					.reverse()
					.map(({ w, i }) => {
						// i = 0 is the next card: it rises as the top card leaves.
						const depth = i + 1 - (i === 0 ? progress : progress * 0.5);
						return (
							<div
								key={w.id}
								className="absolute inset-0 border-2 border-ink bg-card"
								style={{
									transform: `translateY(${depth * 12}px) scale(${1 - depth * 0.045})`,
									transition: dragging ? "none" : "transform 300ms ease-out",
								}}
							/>
						);
					})}

				{/* biome-ignore lint/a11y/useSemanticElements: holds its own buttons, so it can't be a <button> */}
				<div
					role="button"
					tabIndex={0}
					aria-label={t.deck.hint}
					className="absolute inset-0 touch-none select-none outline-none"
					style={{
						transform: `translate(${x}px, ${y}px) rotate(${x / 16}deg)`,
						transition,
					}}
					onKeyDown={(e) => {
						if (e.key === "Enter") setFlipped((f) => !f);
					}}
					onPointerDown={(e) => {
						if (leaving) return;
						g.current = {
							x: e.clientX,
							y: e.clientY,
							t: e.timeStamp,
							lx: 0,
							vx: 0,
							moved: false,
							long: false,
						};
						e.currentTarget.setPointerCapture(e.pointerId);
						setDragging(true);
						clearTimeout(timer.current);
						timer.current = setTimeout(() => {
							if (!g.current || g.current.moved) return;
							g.current.long = true;
							actions.toggleFavorite(top.id);
							navigator.vibrate?.(15);
							setFavStamp(true);
							setTimeout(() => setFavStamp(false), 800);
						}, LONG_PRESS);
					}}
					onPointerMove={(e) => {
						const s = g.current;
						if (!s) return;
						const nx = e.clientX - s.x;
						const ny = e.clientY - s.y;
						if (Math.hypot(nx, ny) > 8) s.moved = true;
						const dt = Math.max(1, e.timeStamp - s.t);
						// Smoothed horizontal velocity, px/ms.
						s.vx = 0.7 * ((nx - s.lx) / dt) + 0.3 * s.vx;
						s.lx = nx;
						s.t = e.timeStamp;
						setDx(nx);
						setDy(ny * 0.25);
					}}
					onPointerUp={() => {
						clearTimeout(timer.current);
						const s = g.current;
						g.current = null;
						setDragging(false);
						if (!s) return;
						if (s.long) {
							setDx(0);
							setDy(0);
							return;
						}
						const flick =
							Math.abs(s.vx) > FLING_SPEED &&
							Math.sign(s.vx) === Math.sign(dx) &&
							Math.abs(dx) > 24;
						if (Math.abs(dx) > FLING_DISTANCE || flick)
							fling(dx > 0 ? 1 : -1, s.vx);
						else {
							setDx(0);
							setDy(0);
							if (!s.moved) {
								if (!flipped) speak(top.en);
								setFlipped((f) => !f);
							}
						}
					}}
					onPointerCancel={() => {
						clearTimeout(timer.current);
						g.current = null;
						setDragging(false);
						setDx(0);
						setDy(0);
					}}
				>
					<Card
						key={top.id}
						word={top}
						flipped={flipped}
						color={color}
						hint={hint}
					/>
					<Stamp
						show={dx > 30 || leaving?.dir === 1}
						text={t.deck.stampKnow}
						color="#3BB273"
						side="left"
					/>
					<Stamp
						show={dx < -30 || leaving?.dir === -1}
						text={t.deck.stampAgain}
						color="#E4572E"
						side="right"
					/>
					<Stamp
						show={favStamp}
						text={t.deck.stampFav}
						color="#E0A100"
						side="center"
					/>
				</div>
			</div>

			<div className="grid grid-cols-3 gap-3 pt-5">
				<button
					type="button"
					onClick={() => fling(-1, 1.2)}
					className="h-16 border-2 border-ink text-2xl font-bold"
					aria-label={t.deck.again}
				>
					✕
				</button>
				<button
					type="button"
					onClick={() => speak(top.en)}
					className="h-16 border-2 border-ink text-2xl"
					aria-label={t.deck.listen}
				>
					🔊
				</button>
				<button
					type="button"
					onClick={() => fling(1, 1.2)}
					className="h-16 text-2xl font-bold"
					style={{ background: color, color: onColor(color) }}
					aria-label={t.deck.know}
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
	side: "left" | "right" | "center";
}) {
	const pos = {
		left: "left-5 top-14 -rotate-12",
		right: "right-5 top-14 rotate-12",
		center: "left-1/2 top-1/3 -translate-x-1/2 -rotate-6",
	}[side];
	return (
		<span
			className={`pointer-events-none absolute border-4 bg-card/80 px-3 py-1 text-2xl font-extrabold transition-[opacity,scale] duration-150 ${pos} ${show ? "scale-100 opacity-100" : "scale-110 opacity-0"}`}
			style={{ color, borderColor: color }}
		>
			{text}
		</span>
	);
}
