// Hand-made pictograms for words without an emoji. Line drawings in the
// current text color, with the accent color marking "the thing that matters".
// viewBox is 0 0 100 100.

import type { ReactNode } from "react";

const A = "var(--accent, #b22234)";
const rnd = (n: number) => Math.round(n * 100) / 100;
type N = number;

// ── Primitives ──────────────────────────────────────────────────────────────

/** Stick figure standing with feet at y + 20. `kid` is smaller. */
function P({
	x,
	y,
	hl,
	girl,
	kid,
	arms = "down",
	dim,
}: {
	x: N;
	y: N;
	hl?: boolean;
	girl?: boolean;
	kid?: boolean;
	arms?: "down" | "up" | "point" | "self" | "hold";
	dim?: boolean;
}) {
	const s = kid ? 0.72 : 1;
	const c = hl ? A : "currentColor";
	const t = `translate(${x} ${y + 20}) scale(${s}) translate(0 -20)`;
	const armPath = {
		down: "M-9 4 L0 -6 L9 4",
		up: "M-9 -16 L0 -6 L9 -16",
		point: "M-9 4 L0 -6 L13 -8",
		self: "M-9 4 L0 -6 L5 -2 L1 -1",
		hold: "M-9 -2 L0 -6 L9 -2",
	}[arms];
	return (
		<g transform={t} stroke={c} opacity={dim ? 0.35 : 1}>
			<circle
				cx={0}
				cy={-17}
				r={6}
				vectorEffect="non-scaling-stroke"
				fill={hl ? A : "none"}
			/>
			{girl ? (
				<path d="M0 -10 L-8 8 L8 8 Z" fill={hl ? A : "none"} />
			) : (
				<path d="M0 -10 L0 6" />
			)}
			<path d={armPath} vectorEffect="non-scaling-stroke" />
			<path
				d={girl ? "M-4 8 L-4 20 M4 8 L4 20" : "M-7 20 L0 6 L7 20"}
				vectorEffect="non-scaling-stroke"
			/>
		</g>
	);
}

function Arrow({
	x1,
	y1,
	x2,
	y2,
	c = "currentColor",
	dash,
}: {
	x1: N;
	y1: N;
	x2: N;
	y2: N;
	c?: string;
	dash?: boolean;
}) {
	const a = Math.atan2(y2 - y1, x2 - x1);
	const h = 7;
	// Rounded so the server and the browser render the exact same path.
	const p1 = [rnd(x2 - h * Math.cos(a - 0.5)), rnd(y2 - h * Math.sin(a - 0.5))];
	const p2 = [rnd(x2 - h * Math.cos(a + 0.5)), rnd(y2 - h * Math.sin(a + 0.5))];
	return (
		<g stroke={c}>
			<path
				d={`M${x1} ${y1} L${x2} ${y2}`}
				strokeDasharray={dash ? "4 5" : undefined}
			/>
			<path d={`M${p1[0]} ${p1[1]} L${x2} ${y2} L${p2[0]} ${p2[1]}`} />
		</g>
	);
}

const Ball = ({
	x,
	y,
	r = 7,
	hl = true,
}: {
	x: N;
	y: N;
	r?: N;
	hl?: boolean;
}) => (
	<circle
		cx={x}
		cy={y}
		r={r}
		fill={hl ? A : "none"}
		stroke={hl ? A : "currentColor"}
	/>
);

const Q = ({ x, y, s = 30 }: { x: N; y: N; s?: N }) => (
	<text
		x={x}
		y={y}
		fontSize={s}
		fontWeight={800}
		fill={A}
		stroke="none"
		textAnchor="middle"
		fontFamily="system-ui, sans-serif"
	>
		?
	</text>
);

const T = ({
	x,
	y,
	s = 14,
	c = "currentColor",
	children,
}: {
	x: N;
	y: N;
	s?: N;
	c?: string;
	children: ReactNode;
}) => (
	<text
		x={x}
		y={y}
		fontSize={s}
		fontWeight={700}
		fill={c}
		stroke="none"
		textAnchor="middle"
		fontFamily="system-ui, sans-serif"
	>
		{children}
	</text>
);

function Clock({
	x,
	y,
	r = 18,
	h = 3,
	m = 0,
	hl,
}: {
	x: N;
	y: N;
	r?: N;
	h?: N;
	m?: N;
	hl?: boolean;
}) {
	const ha = ((h % 12) / 12) * 2 * Math.PI + (m / 60) * (Math.PI / 6);
	const ma = (m / 60) * 2 * Math.PI;
	return (
		<g stroke={hl ? A : "currentColor"}>
			<circle cx={x} cy={y} r={r} />
			<path
				d={`M${x} ${y} L${rnd(x + Math.sin(ha) * r * 0.5)} ${rnd(y - Math.cos(ha) * r * 0.5)}`}
			/>
			<path
				d={`M${x} ${y} L${rnd(x + Math.sin(ma) * r * 0.75)} ${rnd(y - Math.cos(ma) * r * 0.75)}`}
			/>
		</g>
	);
}

/** A calendar page. */
function Cal({
	x,
	y,
	w = 22,
	h = 24,
	hl,
	children,
}: {
	x: N;
	y: N;
	w?: N;
	h?: N;
	hl?: boolean;
	children?: ReactNode;
}) {
	const c = hl ? A : "currentColor";
	return (
		<g stroke={c}>
			<rect
				x={x}
				y={y}
				width={w}
				height={h}
				fill={hl ? A : "none"}
				fillOpacity={hl ? 0.12 : 0}
			/>
			<path d={`M${x} ${y + 6} H${x + w}`} />
			<path
				d={`M${x + 6} ${y - 3} V${y + 3} M${x + w - 6} ${y - 3} V${y + 3}`}
			/>
			{children}
		</g>
	);
}

const Bubble = ({
	x,
	y,
	w = 34,
	h = 22,
	tail = "left",
	children,
}: {
	x: N;
	y: N;
	w?: N;
	h?: N;
	tail?: "left" | "right";
	children?: ReactNode;
}) => (
	<g>
		<rect x={x} y={y} width={w} height={h} />
		<path
			d={
				tail === "left"
					? `M${x + 6} ${y + h} L${x + 2} ${y + h + 8} L${x + 14} ${y + h}`
					: `M${x + w - 6} ${y + h} L${x + w - 2} ${y + h + 8} L${x + w - 14} ${y + h}`
			}
		/>
		{children}
	</g>
);

const Box = ({ x, y, w, h, hl }: { x: N; y: N; w: N; h: N; hl?: boolean }) => (
	<rect x={x} y={y} width={w} height={h} stroke={hl ? A : "currentColor"} />
);

const Table = ({ x = 20, y = 50, w = 60 }: { x?: N; y?: N; w?: N }) => (
	<path
		d={`M${x} ${y} H${x + w} M${x + 6} ${y} V${y + 30} M${x + w - 6} ${y} V${y + 30}`}
	/>
);

const House = ({ x, y, s = 1, hl }: { x: N; y: N; s?: N; hl?: boolean }) => (
	<g
		transform={`translate(${x} ${y}) scale(${s})`}
		stroke={hl ? A : "currentColor"}
	>
		<path d="M-14 0 L0 -13 L14 0 M-10 -3 V14 H10 V-3" />
		<rect x={-3} y={5} width={6} height={9} />
	</g>
);

const Cup = ({
	x,
	y,
	fill = 0,
	hl,
}: {
	x: N;
	y: N;
	fill?: N;
	hl?: boolean;
}) => (
	<g>
		{fill > 0 && (
			<path
				d={`M${x - 11 + 2 * (1 - fill)} ${y + 24 - 24 * fill} H${x + 11 - 2 * (1 - fill)} L${x + 9} ${y + 24} H${x - 9} Z`}
				fill={A}
				stroke="none"
				opacity={0.85}
			/>
		)}
		<path
			d={`M${x - 12} ${y} L${x - 9} ${y + 24} H${x + 9} L${x + 12} ${y}`}
			stroke={hl ? A : "currentColor"}
		/>
	</g>
);

const Dots = ({
	n,
	hl,
	y = 50,
	r = 6,
}: {
	n: N;
	hl: (i: N) => boolean;
	y?: N;
	r?: N;
}) => (
	<g>
		{Array.from({ length: n }, (_, i) => (
			<Ball
				key={i}
				x={50 + (i - (n - 1) / 2) * (r * 2.8)}
				y={y}
				r={r}
				hl={hl(i)}
			/>
		))}
	</g>
);

const Check = ({ x, y, s = 1, c = A }: { x: N; y: N; s?: N; c?: string }) => (
	<path
		d={`M${x - 10 * s} ${y} L${x - 3 * s} ${y + 8 * s} L${x + 12 * s} ${y - 9 * s}`}
		stroke={c}
		strokeWidth={5}
	/>
);
const Cross = ({ x, y, s = 1, c = A }: { x: N; y: N; s?: N; c?: string }) => (
	<path
		d={`M${x - 9 * s} ${y - 9 * s} L${x + 9 * s} ${y + 9 * s} M${x + 9 * s} ${y - 9 * s} L${x - 9 * s} ${y + 9 * s}`}
		stroke={c}
		strokeWidth={5}
	/>
);
const Heart = ({ x, y, s = 1 }: { x: N; y: N; s?: N }) => (
	<path
		transform={`translate(${x} ${y}) scale(${s})`}
		d="M0 8 C-14 -2 -8 -14 0 -6 C8 -14 14 -2 0 8 Z"
		fill={A}
		stroke={A}
	/>
);
const Head = ({ x, y, children }: { x: N; y: N; children?: ReactNode }) => (
	<g>
		<path
			d={`M${x - 16} ${y + 26} C${x - 18} ${y + 8} ${x - 20} ${y - 22} ${x + 4} ${y - 22} C${x + 22} ${y - 22} ${x + 26} ${y - 4} ${x + 20} ${y + 6} L${x + 25} ${y + 14} L${x + 18} ${y + 15} C${x + 18} ${y + 26} ${x + 8} ${y + 26} ${x + 2} ${y + 24} L${x + 2} ${y + 30}`}
		/>
		{children}
	</g>
);
const Bulb = ({ x, y, s = 1 }: { x: N; y: N; s?: N }) => (
	<g transform={`translate(${x} ${y}) scale(${s})`} stroke={A}>
		<path d="M-6 6 C-14 0 -12 -14 0 -14 C12 -14 14 0 6 6 V11 H-6 Z" />
		<path d="M-5 15 H5" />
	</g>
);
const Timeline = ({ hl }: { hl: "left" | "right" }) => (
	<g>
		<Arrow x1={10} y1={55} x2={92} y2={55} />
		<Ball x={34} y={55} r={8} hl={hl === "left"} />
		<Ball x={66} y={55} r={8} hl={hl === "right"} />
		<T x={34} y={35} s={12} c={hl === "left" ? A : "currentColor"}>
			1
		</T>
		<T x={66} y={35} s={12} c={hl === "right" ? A : "currentColor"}>
			2
		</T>
	</g>
);
const Days = ({ hl }: { hl: 0 | 1 | 2 }) => (
	<g>
		{[0, 1, 2].map((i) => (
			<Cal key={i} x={10 + i * 29} y={40} w={22} h={26} hl={hl === i}>
				<T x={21 + i * 29} y={61} s={11} c={hl === i ? A : "currentColor"}>
					{["−1", "0", "+1"][i]}
				</T>
			</Cal>
		))}
		<P x={50} y={10} arms="down" />
		<path d="M50 32 V36" />
	</g>
);
const Mag = ({ x, y }: { x: N; y: N }) => (
	<g>
		<circle cx={x} cy={y} r={13} />
		<path d={`M${x + 9} ${y + 9} L${x + 22} ${y + 22}`} strokeWidth={5} />
	</g>
);
const Gift = ({ x, y }: { x: N; y: N }) => (
	<g>
		<rect x={x - 11} y={y - 8} width={22} height={18} stroke={A} />
		<path
			d={`M${x - 13} ${y - 8} H${x + 13} M${x} ${y - 8} V${y + 10}`}
			stroke={A}
		/>
		<path
			d={`M${x} ${y - 8} C${x - 8} ${y - 18} ${x - 12} ${y - 10} ${x} ${y - 8} C${x + 8} ${y - 18} ${x + 12} ${y - 10} ${x} ${y - 8}`}
			stroke={A}
		/>
	</g>
);
const Drop = ({ x, y, hl = true }: { x: N; y: N; hl?: boolean }) => (
	<path
		d={`M${x} ${y - 9} C${x + 7} ${y} ${x + 7} ${y + 7} ${x} ${y + 7} C${x - 7} ${y + 7} ${x - 7} ${y} ${x} ${y - 9} Z`}
		fill={hl ? A : "none"}
		stroke={hl ? A : "currentColor"}
	/>
);
const Cloud = ({ x, y }: { x: N; y: N }) => (
	<path
		d={`M${x - 16} ${y + 6} C${x - 22} ${y + 6} ${x - 22} ${y - 4} ${x - 14} ${y - 4} C${x - 12} ${y - 14} ${x + 2} ${y - 14} ${x + 4} ${y - 6} C${x + 14} ${y - 10} ${x + 20} ${y + 6} ${x + 12} ${y + 6} Z`}
	/>
);
const Tie = ({ x, y }: { x: N; y: N }) => (
	<path
		d={`M${x - 3} ${y} H${x + 3} L${x + 4} ${y + 12} L${x} ${y + 16} L${x - 4} ${y + 12} Z`}
		fill={A}
		stroke={A}
	/>
);
const Spot = ({ x }: { x: N }) => (
	<path
		d={`M${x - 4} 10 L${x - 16} 62 H${x + 16} L${x + 4} 10 Z`}
		fill={A}
		fillOpacity={0.15}
		stroke="none"
	/>
);

// ── Pictures ────────────────────────────────────────────────────────────────

export const PICS: Record<string, ReactNode> = {
	// People
	brother: (
		<>
			<P x={35} y={45} kid hl />
			<P x={65} y={45} kid girl />
		</>
	),
	sister: (
		<>
			<P x={35} y={45} kid />
			<P x={65} y={45} kid girl hl />
		</>
	),
	son: (
		<>
			<P x={35} y={40} />
			<P x={65} y={45} kid hl />
		</>
	),
	daughter: (
		<>
			<P x={35} y={40} />
			<P x={65} y={45} kid girl hl />
		</>
	),
	boss: (
		<>
			<P x={50} y={30} />
			<Tie x={50} y={22} />
			<P x={22} y={60} kid dim />
			<P x={78} y={60} kid dim />
		</>
	),
	body: (
		<g transform="translate(50 46) scale(1.9) translate(-50 -46)">
			<P x={50} y={46} hl />
		</g>
	),

	// Things & places
	sky: (
		<>
			<path d="M5 80 H95" />
			<rect
				x={5}
				y={10}
				width={90}
				height={70}
				fill={A}
				fillOpacity={0.12}
				stroke="none"
			/>
			<Cloud x={35} y={35} />
			<Cloud x={70} y={55} />
			<path d="M58 25 l4 3 l4 -3 M70 30 l4 3 l4 -3" />
		</>
	),
	table: (
		<>
			<Table x={18} y={48} w={64} />
			<Cup x={40} y={30} />
			<Ball x={64} y={40} r={7} hl />
		</>
	),

	// Asking
	who: (
		<>
			<P x={40} y={45} />
			<Q x={70} y={45} s={40} />
		</>
	),
	where: (
		<>
			<path d="M40 70 C20 45 22 22 40 22 C58 22 60 45 40 70 Z" />
			<circle cx={40} cy={38} r={6} />
			<Q x={74} y={52} s={40} />
		</>
	),
	when: (
		<>
			<Clock x={40} y={50} r={22} h={4} m={10} />
			<Q x={78} y={60} s={40} />
		</>
	),
	why: (
		<>
			<Bulb x={38} y={48} s={1.8} />
			<Q x={76} y={60} s={40} />
		</>
	),
	how: (
		<>
			<g transform="translate(40 50)">
				<circle r={12} />
				<path
					d="M0 -20 V-12 M0 12 V20 M-20 0 H-12 M12 0 H20 M-14 -14 L-8 -8 M8 8 L14 14 M-14 14 L-8 8 M8 -8 L14 -14"
					strokeWidth={5}
				/>
			</g>
			<Q x={78} y={62} s={40} />
		</>
	),
	which: (
		<>
			<Cup x={28} y={50} />
			<Cup x={56} y={50} hl />
			<Q x={56} y={40} s={30} />
			<Cup x={84} y={50} />
		</>
	),
	"how-much": (
		<>
			<path d="M20 40 L45 20 H75 V50 L50 75 Z" />
			<circle cx={63} cy={33} r={4} />
			<Q x={48} y={58} s={28} />
		</>
	),
	ask: (
		<>
			<P x={30} y={50} arms="point" />
			<Bubble x={45} y={15} w={36} h={26}>
				<Q x={63} y={37} s={24} />
			</Bubble>
		</>
	),
	mean: (
		<>
			<rect x={10} y={35} width={34} height={24} />
			<path d="M17 47 h20" strokeWidth={4} />
			<T x={56} y={54} s={22}>
				=
			</T>
			<Bulb x={80} y={45} s={1.4} />
		</>
	),
	say: (
		<>
			<P x={30} y={50} />
			<Bubble x={45} y={15} w={42} h={26}>
				<path d="M52 24 h28 M52 32 h18" />
			</Bubble>
		</>
	),
	slowly: (
		<>
			<P x={30} y={50} />
			<Bubble x={45} y={15} w={46} h={26}>
				<path
					d="M50 28 c4 -8 8 8 12 0 c4 -8 8 8 12 0 c4 -8 8 8 12 0"
					stroke={A}
				/>
			</Bubble>
			<path d="M60 82 c0 -10 22 -10 22 0 Z M82 82 h6" />
		</>
	),
	"thank-you": (
		<>
			<P x={28} y={45} />
			<P x={72} y={45} />
			<Heart x={50} y={38} s={1.1} />
		</>
	),
	sorry: (
		<>
			<g transform="rotate(-18 40 70)">
				<P x={40} y={45} />
			</g>
			<path d="M62 34 c-3 5 -3 8 0 8 c3 0 3 -3 0 -8" stroke={A} fill={A} />
			<P x={75} y={45} dim />
		</>
	),
	understand: (
		<>
			<Head x={45} y={50}>
				<Bulb x={46} y={34} s={1.1} />
			</Head>
		</>
	),
	know: (
		<>
			<Head x={45} y={50}>
				<Check x={46} y={30} s={0.9} />
			</Head>
		</>
	),
	example: (
		<>
			<Ball x={20} y={60} r={6} hl={false} />
			<Ball x={36} y={60} r={6} hl={false} />
			<Ball x={52} y={60} r={6} hl={false} />
			<Arrow x1={52} y1={52} x2={68} y2={36} c={A} />
			<Ball x={78} y={28} r={12} />
		</>
	),
	different: (
		<>
			<Ball x={22} y={50} r={10} hl={false} />
			<Ball x={50} y={50} r={10} hl={false} />
			<path d="M78 38 L90 60 H66 Z" stroke={A} fill={A} />
		</>
	),

	// Actions
	come: (
		<>
			<P x={25} y={45} />
			<Arrow x1={40} y1={50} x2={62} y2={50} c={A} />
			<P x={78} y={45} arms="up" hl />
		</>
	),
	sit: (
		<>
			<path d="M50 50 H72 V80 M50 50 V80 M72 50 V22" />
			<g stroke="currentColor">
				<circle cx={52} cy={24} r={6} />
				<path d="M52 31 V48 H40 V64 M52 36 L42 44" />
			</g>
		</>
	),
	open: (
		<>
			<rect x={30} y={20} width={36} height={60} />
			<path d="M30 20 L16 28 V88 L30 80" stroke={A} />
			<Arrow x1={62} y1={50} x2={78} y2={50} c={A} />
		</>
	),
	close: (
		<>
			<rect x={30} y={20} width={36} height={60} stroke={A} />
			<circle cx={58} cy={52} r={2} fill="currentColor" />
			<Arrow x1={14} y1={50} x2={28} y2={50} c={A} />
		</>
	),
	take: (
		<>
			<Table x={50} y={62} w={40} />
			<Ball x={70} y={54} r={7} />
			<Arrow x1={62} y1={44} x2={36} y2={44} c={A} />
			<P x={20} y={42} arms="hold" />
		</>
	),
	learn: (
		<>
			<Head x={30} y={50} />
			<path d="M62 70 V40 L80 34 V64 Z M62 40 L46 34 V64 L62 70" />
			<Arrow x1={54} y1={30} x2={40} y2={18} c={A} />
		</>
	),
	live: (
		<>
			<House x={50} y={52} s={2.6} />
			<P x={50} y={40} kid hl />
		</>
	),
	find: (
		<>
			<Ball x={62} y={58} r={7} />
			<Mag x={56} y={52} />
			<Check x={30} y={30} s={0.9} />
		</>
	),
	put: (
		<>
			<Table x={25} y={62} w={50} />
			<Ball x={50} y={54} r={7} />
			<Arrow x1={50} y1={14} x2={50} y2={40} c={A} />
		</>
	),
	start: (
		<>
			<circle cx={50} cy={50} r={30} />
			<path d="M42 34 L68 50 L42 66 Z" fill={A} stroke={A} />
		</>
	),

	// Describing
	young: (
		<>
			<P x={30} y={40} dim />
			<P x={66} y={46} kid hl />
		</>
	),
	long: (
		<>
			<path d="M10 40 H90" stroke={A} strokeWidth={8} />
			<path d="M10 64 H40" strokeWidth={8} />
		</>
	),
	short: (
		<>
			<path d="M10 40 H90" strokeWidth={8} />
			<path d="M10 64 H40" stroke={A} strokeWidth={8} />
		</>
	),
	easy: (
		<>
			<path d="M8 78 H40 L92 66" />
			<Ball x={70} y={62} r={7} />
			<Check x={30} y={36} />
		</>
	),
	hard: (
		<>
			<path d="M8 80 H40 L70 18 H92" />
			<Ball x={46} y={60} r={7} />
			<Cross x={82} y={50} s={0.8} />
		</>
	),
	beautiful: (
		<>
			<circle cx={50} cy={46} r={8} fill={A} stroke={A} />
			{[0, 72, 144, 216, 288].map((a) => (
				<ellipse
					key={a}
					cx={50}
					cy={30}
					rx={7}
					ry={11}
					transform={`rotate(${a} 50 46)`}
				/>
			))}
			<path d="M50 62 V88 M50 76 c-8 -8 -14 -4 -16 -2" />
			<path d="M80 18 v10 M75 23 h10 M18 28 v8 M14 32 h8" stroke={A} />
		</>
	),
	full: <Cup x={50} y={30} fill={0.9} />,
	empty: (
		<>
			<Cup x={50} y={30} />
			<path d="M50 18 v4" opacity={0} />
		</>
	),

	// Feelings
	feel: (
		<>
			<P x={50} y={42} arms="self" />
			<Heart x={50} y={38} s={0.6} />
		</>
	),

	// Time
	month: (
		<Cal x={20} y={18} w={60} h={64}>
			{Array.from({ length: 30 }, (_, i) => (
				<circle
					key={`${i}m`}
					cx={27 + (i % 7) * 7.5}
					cy={34 + Math.floor(i / 7) * 10}
					r={1.8}
					fill={A}
					stroke="none"
				/>
			))}
		</Cal>
	),
	year: (
		<g>
			{Array.from({ length: 12 }, (_, i) => (
				<Cal
					key={`${i}y`}
					x={12 + (i % 4) * 20}
					y={18 + Math.floor(i / 4) * 24}
					w={15}
					h={16}
					hl={i === 0}
				/>
			))}
		</g>
	),
	today: <Days hl={1} />,
	tomorrow: <Days hl={2} />,
	yesterday: <Days hl={0} />,
	now: (
		<>
			<Clock x={50} y={52} r={28} h={10} m={10} />
			<circle cx={50} cy={52} r={5} fill={A} stroke={A} />
			<path d="M44 18 h12 M50 18 v6" />
			<path d="M76 26 l6 -6 M80 34 l8 -2" stroke={A} />
		</>
	),
	always: (
		<path
			d="M50 50 C38 30 14 32 14 50 C14 68 38 70 50 50 C62 30 86 32 86 50 C86 68 62 70 50 50 Z"
			stroke={A}
			strokeWidth={6}
		/>
	),
	never: (
		<>
			<Cal x={28} y={26} w={44} h={46} />
			<circle cx={50} cy={50} r={34} stroke={A} strokeWidth={5} />
			<path d="M26 26 L74 74" stroke={A} strokeWidth={5} />
		</>
	),
	sometimes: <Dots n={7} r={5} hl={(i) => i === 1 || i === 4} />,
	late: (
		<>
			<Clock x={32} y={42} r={20} h={9} m={20} hl />
			<P x={72} y={46} arms="up" />
			<path d="M54 70 h-10 M56 62 h-8" />
		</>
	),
	later: (
		<>
			<Clock x={38} y={50} r={20} h={3} m={0} />
			<path d="M66 32 C82 40 82 60 66 68" stroke={A} />
			<path d="M66 68 l2 -8 M66 68 l8 -2" stroke={A} />
		</>
	),

	// Basic ideas
	kind: (
		<>
			<rect x={8} y={30} width={40} height={40} stroke={A} />
			<Ball x={20} y={42} r={5} hl={false} />
			<Ball x={36} y={42} r={5} hl={false} />
			<Ball x={28} y={58} r={5} hl={false} />
			<rect x={58} y={36} width={10} height={10} />
			<rect x={76} y={36} width={10} height={10} />
			<rect x={67} y={54} width={10} height={10} />
		</>
	),
	be: (
		<>
			<P x={28} y={45} />
			<T x={52} y={60} s={26}>
				=
			</T>
			<circle cx={76} cy={50} r={14} stroke={A} />
			<path d="M70 54 c3 4 9 4 12 0" stroke={A} />
			<circle cx={71} cy={46} r={1.5} fill={A} stroke={A} />
			<circle cx={81} cy={46} r={1.5} fill={A} stroke={A} />
		</>
	),
	have: (
		<>
			<P x={44} y={44} arms="hold" />
			<Ball x={60} y={38} r={8} />
		</>
	),
	do: (
		<>
			<rect x={22} y={22} width={56} height={56} />
			<path d="M32 36 h6 M32 50 h6 M32 64 h6 M46 36 h22 M46 50 h22 M46 64 h22" />
			<Check x={36} y={36} s={0.6} />
			<Check x={36} y={50} s={0.6} />
		</>
	),
	make: (
		<>
			<rect x={28} y={44} width={44} height={34} />
			<path d="M28 44 L50 30 L72 44" />
			<path d="M78 18 v12 M72 24 h12 M18 24 v8 M14 28 h8" stroke={A} />
			<path d="M50 30 V78" stroke={A} />
		</>
	),
	use: (
		<>
			<rect x={58} y={60} width={6} height={22} />
			<path d="M40 60 H82" />
			<path d="M24 22 L46 44" strokeWidth={6} />
			<rect
				x={36}
				y={30}
				width={22}
				height={12}
				transform="rotate(45 47 36)"
				fill={A}
				stroke={A}
			/>
		</>
	),
	can: (
		<>
			<P x={44} y={44} arms="up" />
			<rect x={30} y={8} width={28} height={14} stroke={A} />
			<Check x={80} y={60} />
		</>
	),
	want: (
		<>
			<P x={30} y={50} />
			<Bubble x={46} y={12} w={40} h={30}>
				<Ball x={66} y={27} r={8} />
			</Bubble>
		</>
	),
	need: (
		<>
			<P x={30} y={50} />
			<Bubble x={46} y={12} w={40} h={30}>
				<Drop x={60} y={28} />
				<T x={76} y={36} s={20} c={A}>
					!
				</T>
			</Bubble>
		</>
	),
	like: (
		<>
			<Cup x={36} y={44} />
			<path d="M48 50 c8 0 8 12 0 12" />
			<Heart x={72} y={36} s={1.3} />
		</>
	),
	hear: (
		<>
			<path d="M40 30 C26 30 24 46 32 54 C36 58 34 66 40 70 C46 74 52 68 50 62" />
			<path d="M38 44 c0 -6 8 -6 8 0" />
			<path d="M62 38 c6 6 6 18 0 24 M72 30 c10 10 10 30 0 40" stroke={A} />
		</>
	),
	all: (
		<>
			<Dots n={5} hl={() => true} />
			<path d="M14 66 v6 H86 v-6" stroke={A} />
		</>
	),
	some: <Dots n={5} hl={(i) => i < 2} />,
	many: (
		<g>
			{Array.from({ length: 24 }, (_, i) => (
				<circle
					key={`${i}n`}
					cx={18 + (i % 6) * 13}
					cy={26 + Math.floor(i / 6) * 15}
					r={4.5}
					fill={A}
					stroke={A}
				/>
			))}
		</g>
	),
	other: (
		<>
			<Ball x={30} y={50} r={10} hl={false} />
			<Ball x={70} y={50} r={10} />
			<Arrow x1={42} y1={32} x2={62} y2={36} />
		</>
	),
	very: (
		<>
			<rect x={40} y={14} width={20} height={72} />
			<rect x={44} y={20} width={12} height={62} fill={A} stroke={A} />
			<T x={78} y={40} s={24} c={A}>
				!!
			</T>
		</>
	),
	inside: (
		<>
			<Box x={25} y={30} w={50} h={44} />
			<Ball x={50} y={54} r={9} />
		</>
	),
	outside: (
		<>
			<Box x={15} y={30} w={44} h={44} />
			<Ball x={80} y={54} r={9} />
		</>
	),
	before: <Timeline hl="left" />,
	after: <Timeline hl="right" />,
	near: (
		<>
			<House x={40} y={50} s={1.6} />
			<P x={68} y={44} hl />
		</>
	),
	far: (
		<>
			<House x={18} y={54} s={0.8} />
			<path d="M28 72 H66" strokeDasharray="4 5" />
			<P x={80} y={44} hl />
		</>
	),
	true: (
		<>
			<circle cx={50} cy={50} r={32} stroke={A} strokeWidth={4} />
			<Check x={48} y={50} s={1.4} />
		</>
	),
	only: (
		<>
			<Ball x={22} y={50} r={10} />
			<circle cx={50} cy={50} r={10} strokeDasharray="3 4" opacity={0.5} />
			<circle cx={78} cy={50} r={10} strokeDasharray="3 4" opacity={0.5} />
		</>
	),
	also: (
		<>
			<Ball x={22} y={50} r={10} hl={false} />
			<T x={50} y={60} s={28}>
				+
			</T>
			<Ball x={78} y={50} r={10} />
		</>
	),

	// Little words
	i: (
		<>
			<P x={50} y={42} arms="self" hl />
			<P x={20} y={48} kid dim />
			<P x={80} y={48} kid dim />
		</>
	),
	you: (
		<>
			<P x={28} y={42} arms="point" />
			<P x={70} y={42} hl />
		</>
	),
	he: (
		<>
			<P x={22} y={45} dim />
			<P x={50} y={45} hl />
			<P x={78} y={45} girl dim />
		</>
	),
	she: (
		<>
			<P x={22} y={45} dim />
			<P x={50} y={45} girl hl />
			<P x={78} y={45} dim />
		</>
	),
	it: (
		<>
			<P x={28} y={42} dim />
			<Ball x={68} y={56} r={11} />
			<Arrow x1={68} y1={18} x2={68} y2={38} c={A} />
		</>
	),
	we: (
		<>
			<P x={24} y={45} hl />
			<P x={50} y={45} hl girl />
			<P x={76} y={45} hl />
		</>
	),
	they: (
		<>
			<P x={14} y={45} arms="point" />
			<P x={46} y={45} hl />
			<P x={66} y={45} hl girl />
			<P x={86} y={45} hl />
		</>
	),
	me: (
		<>
			<P x={26} y={42} arms="point" />
			<P x={70} y={42} arms="self" hl />
		</>
	),
	my: (
		<>
			<P x={34} y={42} arms="self" hl />
			<Ball x={72} y={60} r={9} />
			<path d="M40 40 C56 30 70 40 72 50" stroke={A} strokeDasharray="3 4" />
		</>
	),
	your: (
		<>
			<P x={22} y={42} arms="point" dim />
			<P x={58} y={42} hl />
			<Ball x={82} y={60} r={8} />
			<path d="M64 40 C76 34 84 44 82 52" stroke={A} strokeDasharray="3 4" />
		</>
	),
	his: (
		<>
			<P x={36} y={42} hl />
			<Ball x={72} y={60} r={9} />
			<path d="M42 40 C56 30 70 40 72 50" stroke={A} strokeDasharray="3 4" />
		</>
	),
	her: (
		<>
			<P x={36} y={42} girl hl />
			<Ball x={72} y={60} r={9} />
			<path d="M42 40 C56 30 70 40 72 50" stroke={A} strokeDasharray="3 4" />
		</>
	),
	this: (
		<>
			<P x={30} y={42} arms="point" />
			<Ball x={56} y={36} r={11} />
		</>
	),
	that: (
		<>
			<P x={18} y={42} arms="point" />
			<path d="M36 34 H70" strokeDasharray="3 5" />
			<Ball x={84} y={34} r={6} />
		</>
	),
	the: (
		<>
			<Spot x={50} />
			<Dots n={5} y={66} hl={(i) => i === 2} />
		</>
	),
	a: (
		<>
			<Ball x={50} y={48} r={14} />
			<Dots n={5} y={78} r={4} hl={() => false} />
		</>
	),
	and: (
		<>
			<Ball x={22} y={50} r={11} />
			<T x={50} y={60} s={28}>
				+
			</T>
			<rect x={68} y={39} width={22} height={22} fill={A} stroke={A} />
		</>
	),
	or: (
		<>
			<Arrow x1={14} y1={50} x2={38} y2={50} />
			<Arrow x1={40} y1={50} x2={62} y2={28} />
			<Arrow x1={40} y1={50} x2={62} y2={72} />
			<Ball x={78} y={24} r={9} />
			<rect x={70} y={64} width={17} height={17} fill={A} stroke={A} />
		</>
	),
	but: (
		<>
			<Check x={26} y={50} c="currentColor" />
			<T x={50} y={58} s={26}>
				,
			</T>
			<Cross x={76} y={50} />
		</>
	),
	because: (
		<>
			<Cloud x={22} y={36} />
			<path d="M14 52 l-3 7 M22 52 l-3 7 M30 52 l-3 7" stroke={A} />
			<Arrow x1={40} y1={50} x2={58} y2={50} />
			<path d="M66 50 C66 34 92 34 92 50 Z M79 50 V70 c0 5 -6 5 -6 0" />
		</>
	),
	if: (
		<>
			<path d="M40 30 L54 44 L40 58 L26 44 Z" stroke={A} />
			<Q x={40} y={50} s={14} />
			<Arrow x1={54} y1={44} x2={86} y2={24} />
			<Arrow x1={54} y1={44} x2={86} y2={66} />
			<Check x={84} y={14} s={0.5} c="currentColor" />
			<Cross x={84} y={82} s={0.5} c="currentColor" />
		</>
	),
	to: (
		<>
			<P x={18} y={45} />
			<Arrow x1={30} y1={56} x2={64} y2={56} c={A} />
			<House x={80} y={56} s={1.3} />
		</>
	),
	for: (
		<>
			<Gift x={28} y={56} />
			<Arrow x1={44} y1={56} x2={64} y2={56} />
			<P x={80} y={42} hl />
		</>
	),
	with: (
		<>
			<Cup x={40} y={40} />
			<Drop x={64} y={36} />
			<T x={64} y={70} s={22}>
				+
			</T>
		</>
	),
	without: (
		<>
			<Cup x={40} y={40} />
			<Drop x={70} y={44} hl={false} />
			<Cross x={70} y={44} s={1.1} />
		</>
	),
	in: (
		<>
			<Cup x={50} y={36} />
			<Ball x={50} y={52} r={7} />
		</>
	),
	on: (
		<>
			<Box x={28} y={50} w={44} h={32} />
			<Ball x={50} y={41} r={9} />
		</>
	),
	at: (
		<>
			<path d="M50 62 C34 44 36 22 50 22 C64 22 66 44 50 62 Z" stroke={A} />
			<circle cx={50} cy={36} r={5} stroke={A} />
			<path d="M24 78 H76" />
			<P x={50} y={56} kid dim />
		</>
	),
	from: (
		<>
			<House x={20} y={56} s={1.3} />
			<Arrow x1={36} y1={56} x2={70} y2={56} c={A} />
			<P x={84} y={45} />
		</>
	),
	of: (
		<>
			<circle cx={42} cy={50} r={26} />
			<path
				d="M42 50 L42 24 A26 26 0 0 1 64 37 Z"
				fill={A}
				stroke={A}
				transform="translate(14 -6)"
			/>
		</>
	),
	under: (
		<>
			<Table x={20} y={40} w={60} />
			<Ball x={50} y={62} r={9} />
		</>
	),

	// Bonus
	important: (
		<>
			<path
				d="M50 12 L60 38 H88 L66 54 L74 82 L50 66 L26 82 L34 54 L12 38 H40 Z"
				stroke={A}
			/>
			<T x={50} y={60} s={26} c={A}>
				!
			</T>
		</>
	),
	possible: (
		<>
			<circle cx={50} cy={50} r={30} strokeDasharray="5 5" />
			<Check x={48} y={50} s={1.3} />
		</>
	),
	normal: (
		<>
			<T x={50} y={66} s={48} c={A}>
				=
			</T>
		</>
	),
	moment: (
		<>
			<path d="M32 18 H68 M32 82 H68 M36 18 C36 40 64 40 64 50 C64 60 36 60 36 82 M64 18 C64 40 36 40 36 50 C36 60 64 60 64 82" />
			<path d="M42 74 H58 L50 64 Z" fill={A} stroke={A} />
		</>
	),
};

export function hasPic(id: string) {
	return Boolean(PICS[id]);
}

/** Renders a pictogram. Size via className (e.g. h-32 w-32). */
export function Pic({ id, className }: { id: string; className?: string }) {
	const art = PICS[id];
	if (!art) return null;
	return (
		<svg
			viewBox="0 0 100 100"
			className={className}
			fill="none"
			stroke="currentColor"
			strokeWidth={3}
			strokeLinecap="round"
			strokeLinejoin="round"
			aria-hidden="true"
		>
			{art}
		</svg>
	);
}
