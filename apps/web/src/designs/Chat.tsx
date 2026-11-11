// Design 5 · "Chat": a conversation with a tutor, Sam. No pages: you pick a
// topic by replying, then Sam shows pictures and you answer with chips.

import { useEffect, useRef, useState } from "react";
import { hasPic, Pic } from "#/data/pics";
import type { Word } from "#/data/words";
import { CORE_WORDS } from "#/data/words";
import { speak } from "#/lib/speech";
import { PICKS, type Pick, type Screen, shuffle } from "./shared";

type Msg =
	| { from: "sam"; text: string }
	| { from: "sam"; pic: string; id: string }
	| { from: "me"; text: string };

const TEAL = "#0F766E";
const font = {
	fontFamily:
		"-apple-system, BlinkMacSystemFont, 'Segoe UI', system-ui, sans-serif",
};

export default function Chat({ start }: { start: Screen }) {
	const [msgs, setMsgs] = useState<Msg[]>([]);
	const [typing, setTyping] = useState(false);
	const [deck, setDeck] = useState<Word[] | null>(null);
	const [stage, setStage] = useState<"pick" | "ask" | "next">("pick");
	const end = useRef<HTMLDivElement>(null);
	const started = useRef(false);

	const sam = (items: Msg[], then?: () => void) => {
		setTyping(true);
		let i = 0;
		const step = () => {
			if (i >= items.length) {
				setTyping(false);
				then?.();
				return;
			}
			const item = items[i++];
			setMsgs((m) => [...m, item]);
			setTimeout(step, 550);
		};
		setTimeout(step, 650);
	};

	const ask = (d: Word[]) => {
		const w = d[0];
		if (!w) {
			sam(
				[
					{
						from: "sam",
						text: "¡Terminamos! 🎉 Lo hiciste muy bien. ¿Otro tema?",
					},
				],
				() => setStage("pick"),
			);
			return;
		}
		sam(
			[
				w.pic || hasPic(w.id)
					? { from: "sam", pic: w.pic, id: w.id }
					: {
							from: "sam",
							text: `“${w.example.replace(new RegExp(`\\b${w.en}\\b`, "i"), "____")}”`,
						},
				{ from: "sam", text: "¿Sabes cómo se dice en inglés?" },
			],
			() => setStage("ask"),
		);
	};

	const choose = (p: Pick) => {
		const name = PICKS.find((x) => x.id === p)?.name ?? "";
		setMsgs((m) => [
			...m,
			{ from: "me", text: `${PICKS.find((x) => x.id === p)?.emoji} ${name}` },
		]);
		const pool =
			p === "todas" ? CORE_WORDS : CORE_WORDS.filter((w) => w.group === p);
		const d = shuffle([...pool]).slice(0, 8);
		setDeck(d);
		setStage("next");
		sam(
			[
				{
					from: "sam",
					text: `¡Buena elección! Vamos con ${name.toLowerCase()}. 👇`,
				},
			],
			() => ask(d),
		);
	};

	const reply = (knew: boolean) => {
		if (!deck?.[0]) return;
		const w = deck[0];
		setMsgs((m) => [
			...m,
			{ from: "me", text: knew ? "¡Sí, la sé! 😎" : "No, dime 🙏" },
		]);
		setStage("next");
		const rest = knew ? deck.slice(1) : [...deck.slice(1), w];
		setDeck(rest);
		sam(
			[
				{
					from: "sam",
					text: knew
						? `¡Eso! Es “${w.en}”. 🙌`
						: `Es “${w.en}”. Te la pregunto otra vez luego 😉`,
				},
				{ from: "sam", text: w.example },
			],
			() => {
				speak(w.en);
				ask(rest);
			},
		);
	};

	// biome-ignore lint/correctness/useExhaustiveDependencies: run once on mount
	useEffect(() => {
		if (started.current) return;
		started.current = true;
		if (start === "study") {
			setMsgs([{ from: "sam", text: "¡Hola! Soy Sam 🦅" }]);
			choose("casa");
		} else {
			sam(
				[
					{ from: "sam", text: "¡Hola! Soy Sam 🦅" },
					{
						from: "sam",
						text: "Vamos a aprender inglés como los niños: con dibujos, sin traducir.",
					},
					{ from: "sam", text: "¿De qué quieres hablar hoy?" },
				],
				() => setStage("pick"),
			);
			setStage("next");
		}
	}, []);

	// biome-ignore lint/correctness/useExhaustiveDependencies: scroll on new content
	useEffect(() => {
		end.current?.scrollIntoView({ behavior: "smooth", block: "end" });
	}, [msgs.length, typing, stage]);

	return (
		<div
			className="flex min-h-dvh flex-col bg-[#EEF1F4] text-[#111]"
			style={font}
		>
			<header className="sticky top-0 z-10 flex items-center gap-3 border-b border-black/10 bg-white/90 px-4 pt-8 pb-3 backdrop-blur">
				<span className="grid h-10 w-10 place-items-center rounded-full bg-[#1C2541] text-xl">
					🦅
				</span>
				<span>
					<span className="block font-semibold">Sam</span>
					<span className="block text-xs text-black/50">
						{typing ? "escribiendo…" : "tu profe de inglés"}
					</span>
				</span>
			</header>

			<div className="mx-auto flex w-full max-w-md flex-1 flex-col gap-1.5 px-3 py-4">
				{msgs.map((m, i) => (
					<Bubble
						// biome-ignore lint/suspicious/noArrayIndexKey: append-only log
						key={i}
						msg={m}
					/>
				))}
				{typing && (
					<div className="flex w-16 gap-1 self-start rounded-2xl bg-white px-4 py-3">
						{[0, 1, 2].map((d) => (
							<span
								key={d}
								className="h-2 w-2 animate-bounce rounded-full bg-black/30"
								style={{ animationDelay: `${d * 120}ms` }}
							/>
						))}
					</div>
				)}
				<div ref={end} className="h-2" />
			</div>

			<div className="sticky bottom-0 border-t border-black/10 bg-white/95 px-3 pt-3 pb-[calc(0.75rem+env(safe-area-inset-bottom))] backdrop-blur">
				<div className="mx-auto flex max-w-md flex-wrap justify-end gap-2">
					{!typing &&
						stage === "pick" &&
						PICKS.map((p) => (
							<Chip key={p.id} onClick={() => choose(p.id)}>
								{p.emoji} {p.name}
							</Chip>
						))}
					{!typing && stage === "ask" && deck?.[0] && (
						<>
							<Chip onClick={() => speak(deck[0].en)} ghost>
								🔊 Escuchar
							</Chip>
							<Chip onClick={() => reply(false)} ghost>
								No, dime
							</Chip>
							<Chip onClick={() => reply(true)}>¡Sí, la sé!</Chip>
						</>
					)}
					{(typing || stage === "next") && (
						<span className="h-10 text-sm text-black/40">…</span>
					)}
				</div>
			</div>
		</div>
	);
}

function Bubble({ msg }: { msg: Msg }) {
	const me = msg.from === "me";
	if ("pic" in msg) {
		return (
			<div className="self-start rounded-2xl rounded-bl-sm bg-white px-6 py-4 text-8xl">
				{msg.pic || <Pic id={msg.id} className="h-24 w-24" />}
			</div>
		);
	}
	return (
		<div
			className={`max-w-[80%] rounded-2xl px-4 py-2.5 text-[17px] leading-snug ${me ? "self-end rounded-br-sm text-white" : "self-start rounded-bl-sm bg-white"}`}
			style={me ? { background: TEAL } : undefined}
		>
			{msg.text}
		</div>
	);
}

function Chip({
	children,
	onClick,
	ghost = false,
}: {
	children: React.ReactNode;
	onClick: () => void;
	ghost?: boolean;
}) {
	return (
		<button
			type="button"
			onClick={onClick}
			className="h-10 rounded-full border px-4 text-[15px] font-medium"
			style={
				ghost
					? { borderColor: TEAL, color: TEAL }
					: { background: TEAL, borderColor: TEAL, color: "#fff" }
			}
		>
			{children}
		</button>
	);
}
