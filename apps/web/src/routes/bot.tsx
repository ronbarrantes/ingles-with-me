import { createFileRoute, Link } from "@tanstack/react-router";
import { useEffect, useRef, useState } from "react";
import { onColor } from "#/components/Art";
import {
	BotError,
	fetchReply,
	fetchStatus,
	getPasscode,
	setPasscode,
} from "#/lib/bot/api";
import {
	AzureEars,
	BrowserEars,
	browserEarsAvailable,
	type Ears,
} from "#/lib/bot/ears";
import type {
	Attempt,
	BotStatus,
	ReplyResponse,
	Topic,
	Turn,
	TutorReply,
} from "#/lib/bot/types";
import { AzureVoice, BrowserVoice, type Voice } from "#/lib/bot/voice";

// Hidden for now: not linked anywhere, not indexed.
export const Route = createFileRoute("/bot")({
	head: () => ({ meta: [{ name: "robots", content: "noindex, nofollow" }] }),
	component: Bot,
});

const TOPICS: { id: Topic; label: string; emoji: string; color: string }[] = [
	{ id: "libre", label: "Libre", emoji: "💬", color: "#2B59C3" },
	{ id: "cocina", label: "Cocina", emoji: "🍳", color: "#F3A712" },
	{ id: "jardin", label: "Jardín", emoji: "🌻", color: "#3BB273" },
	{ id: "casa", label: "Casa", emoji: "🏠", color: "#E4572E" },
];

type Mode = "idle" | "listening" | "thinking" | "speaking";

const FACE: Record<Mode, { emoji: string; label: string }> = {
	idle: { emoji: "😊", label: "Toca «Hablar» para empezar" },
	listening: { emoji: "👂", label: "Te escucho…" },
	thinking: { emoji: "🤔", label: "Pensando…" },
	speaking: { emoji: "🗣️", label: "Sam está hablando" },
};

const scoreColor = (n: number) =>
	n >= 80 ? "#3BB273" : n >= 60 ? "#F3A712" : "#E4572E";

function Bot() {
	const [status, setStatus] = useState<BotStatus | null>(null);
	const [locked, setLocked] = useState(true);
	const [topic, setTopic] = useState<Topic>("libre");
	const [turns, setTurns] = useState<Turn[]>([]);
	const [mode, setMode] = useState<Mode>("idle");
	const [handsFree, setHandsFree] = useState(false);
	const [partial, setPartial] = useState("");
	const [typed, setTyped] = useState("");
	const [error, setError] = useState("");
	const [meta, setMeta] = useState<ReplyResponse["meta"] | null>(null);
	const [spent, setSpent] = useState(0);
	const [earsNote, setEarsNote] = useState("");

	// Refs so async callbacks always see the latest values.
	const turnsRef = useRef<Turn[]>([]);
	const handsFreeRef = useRef(false);
	const topicRef = useRef<Topic>("libre");
	const ears = useRef<Ears | null>(null);
	const voice = useRef<Voice | null>(null);
	const busy = useRef(false);
	const wakeLock = useRef<{ release: () => Promise<void> } | null>(null);
	const end = useRef<HTMLDivElement>(null);

	const color = TOPICS.find((t) => t.id === topic)?.color ?? "#2B59C3";

	useEffect(() => {
		fetchStatus()
			.then((s) => {
				setStatus(s);
				setLocked(s.passcode && !getPasscode());
			})
			.catch(() => setError("No pude conectar con el servidor."));
	}, []);

	// biome-ignore lint/correctness/useExhaustiveDependencies: scroll on new content
	useEffect(() => {
		end.current?.scrollIntoView({ behavior: "smooth", block: "end" });
	}, [turns.length, partial, mode]);

	const pushTurn = (t: Turn) => {
		turnsRef.current = [...turnsRef.current, t];
		setTurns(turnsRef.current);
	};

	const handleError = (e: unknown) => {
		if (e instanceof BotError && e.code === "wrong_passcode") {
			setPasscode("");
			setLocked(true);
			setError("Código incorrecto.");
		} else if (e instanceof BotError && e.code === "not_configured") {
			setError(`Falta configurar: ${e.missing.join(", ")}`);
		} else setError(e instanceof Error ? e.message : String(e));
	};

	const stopListening = async () => {
		setPartial("");
		await ears.current?.stop();
	};

	// Ask Sam for the next line (latest = null opens the conversation), then say it.
	async function askSam(latest: Attempt | null) {
		if (busy.current) return;
		busy.current = true;
		setError("");
		try {
			const history = turnsRef.current;
			if (latest) pushTurn({ role: "learner", attempt: latest });
			setMode("thinking");
			const res = await fetchReply(topicRef.current, history, latest);
			pushTurn({ role: "tutor", reply: res.reply });
			setMeta(res.meta);
			setSpent((s) => s + res.meta.costUsd);
			setMode("speaking");
			await voice.current?.speak(res.reply.say);
		} catch (e) {
			// Don't leave her message hanging without a reply; typed text goes back in the box.
			if (latest) {
				turnsRef.current = turnsRef.current.slice(0, -1);
				setTurns(turnsRef.current);
				if (!latest.words) setTyped(latest.text);
			}
			handleError(e);
		} finally {
			busy.current = false;
			setMode("idle");
			if (handsFreeRef.current) void listen();
		}
	}

	async function listen() {
		if (!ears.current || !handsFreeRef.current) return;
		setMode("listening");
		try {
			await ears.current.start({
				onPartial: setPartial,
				onUtterance: async (a) => {
					await stopListening();
					void askSam(a);
				},
				onError: (m) => setError(`Micrófono: ${m}`),
			});
		} catch (e) {
			// Azure failed (bad key, blocked mic…): fall back to the phone's recognition.
			if (ears.current instanceof AzureEars && browserEarsAvailable()) {
				ears.current = new BrowserEars();
				setEarsNote(
					"Azure no respondió: uso el reconocimiento del teléfono (sin puntajes).",
				);
				void listen();
			} else {
				handleError(e);
				setMode("idle");
			}
		}
	}

	const setup = () => {
		ears.current ??= status?.speech
			? new AzureEars()
			: browserEarsAvailable()
				? new BrowserEars()
				: null;
		voice.current ??= status?.speech ? new AzureVoice() : new BrowserVoice();
		if (!ears.current)
			setEarsNote("Este navegador no puede escuchar: escribe tus respuestas.");
		else if (!ears.current.scored)
			setEarsNote(
				"Sin Azure: uso el reconocimiento del teléfono, sin puntajes.",
			);
	};

	const start = async () => {
		setup();
		handsFreeRef.current = true;
		setHandsFree(true);
		try {
			const nav = navigator as Navigator & {
				wakeLock?: {
					request: (t: "screen") => Promise<{ release: () => Promise<void> }>;
				};
			};
			wakeLock.current = (await nav.wakeLock?.request("screen")) ?? null;
		} catch {
			// The screen may dim; the conversation still works.
		}
		if (turnsRef.current.length === 0) await askSam(null);
		else void listen();
	};

	const pause = async () => {
		handsFreeRef.current = false;
		setHandsFree(false);
		voice.current?.stop();
		await stopListening();
		setMode("idle");
		void wakeLock.current?.release();
		wakeLock.current = null;
	};

	const sendTyped = async () => {
		const text = typed.trim();
		if (!text) return;
		setup();
		setTyped("");
		await stopListening();
		void askSam({ text });
	};

	const changeTopic = async (t: Topic) => {
		await pause();
		topicRef.current = t;
		setTopic(t);
		turnsRef.current = [];
		setTurns([]);
		setMeta(null);
	};

	useEffect(
		() => () => {
			handsFreeRef.current = false;
			void ears.current?.stop();
			voice.current?.stop();
		},
		[],
	);

	if (locked) {
		return <PasscodeScreen onDone={() => setLocked(false)} error={error} />;
	}

	const missing = status
		? [
				!status.tutor && "ANTHROPIC_API_KEY",
				!status.speech && "AZURE_SPEECH_KEY + AZURE_SPEECH_REGION",
				!status.passcode && "BOT_PASSCODE",
			].filter(Boolean)
		: [];
	const face = FACE[mode];

	return (
		<div className="mx-auto flex h-dvh max-w-md flex-col pt-[env(safe-area-inset-top)] pb-[env(safe-area-inset-bottom)]">
			<header className="flex items-center justify-between px-5 pt-4">
				<Link
					to="/"
					className="-ml-2 grid h-10 w-10 place-items-center text-2xl"
					aria-label="Volver"
				>
					←
				</Link>
				<span className="font-bold">Habla con Sam</span>
				<span className="w-10 text-right text-xs text-muted tabular-nums">
					${spent.toFixed(3)}
				</span>
			</header>

			{missing.length > 0 && (
				<p className="mx-5 mt-3 border-2 border-dashed border-line px-3 py-2 text-xs text-muted">
					Falta configurar: {missing.join(" · ")}
				</p>
			)}

			<div className="mt-3 flex gap-2 overflow-x-auto px-5 [scrollbar-width:none]">
				{TOPICS.map((t) => {
					const on = t.id === topic;
					return (
						<button
							key={t.id}
							type="button"
							aria-pressed={on}
							onClick={() => changeTopic(t.id)}
							className="h-9 shrink-0 border-2 px-3 text-sm font-bold"
							style={
								on
									? {
											background: t.color,
											borderColor: t.color,
											color: onColor(t.color),
										}
									: { borderColor: "var(--ink)" }
							}
						>
							{t.emoji} {t.label}
						</button>
					);
				})}
			</div>

			<div className="mt-4 flex items-center gap-4 px-5">
				<span
					className={`grid h-16 w-16 shrink-0 place-items-center border-2 border-ink text-3xl ${mode === "listening" ? "animate-pulse" : ""}`}
					style={{ background: color }}
					aria-hidden
				>
					{face.emoji}
				</span>
				<div className="min-w-0">
					<p className="text-xl font-extrabold">Sam</p>
					<p className="truncate text-sm text-muted">{face.label}</p>
				</div>
			</div>

			<div className="mt-4 min-h-0 flex-1 space-y-3 overflow-y-auto border-t-2 border-line px-5 py-4">
				{turns.length === 0 && (
					<p className="pt-6 text-center text-muted">
						Habla en inglés o pregunta en español:
						<br />
						<i>«¿Cómo se dice mariposa?»</i>
					</p>
				)}
				{turns.map((t, i) =>
					t.role === "learner" ? (
						// biome-ignore lint/suspicious/noArrayIndexKey: append-only transcript
						<LearnerBubble key={i} attempt={t.attempt} />
					) : (
						// biome-ignore lint/suspicious/noArrayIndexKey: append-only transcript
						<TutorBubble key={i} reply={t.reply} color={color} />
					),
				)}
				{partial && (
					<p className="ml-auto max-w-[85%] text-right text-muted italic">
						{partial}…
					</p>
				)}
				<div ref={end} />
			</div>

			{(error || earsNote) && (
				<p
					className="px-5 pb-2 text-xs"
					style={{ color: error ? "#E4572E" : "var(--muted)" }}
				>
					{error || earsNote}
				</p>
			)}

			<div className="border-t-2 border-line px-5 pt-3 pb-4">
				<button
					type="button"
					onClick={handsFree ? pause : start}
					disabled={!status}
					className="h-14 w-full text-lg font-extrabold disabled:opacity-40"
					style={
						handsFree
							? { border: "2px solid var(--ink)" }
							: { background: color, color: onColor(color) }
					}
				>
					{handsFree ? "⏸ Pausar" : "🎙 Hablar"}
				</button>
				<form
					className="mt-2 flex gap-2"
					onSubmit={(e) => {
						e.preventDefault();
						void sendTyped();
					}}
				>
					<input
						value={typed}
						onChange={(e) => setTyped(e.target.value)}
						placeholder="…o escribe aquí"
						className="h-11 min-w-0 flex-1 border-2 border-ink bg-card px-3 outline-none placeholder:text-muted"
						maxLength={600}
					/>
					<button
						type="submit"
						className="h-11 border-2 border-ink px-4 font-bold"
						disabled={!typed.trim()}
					>
						Enviar
					</button>
				</form>
				{meta && (
					<p className="mt-2 text-center text-[11px] text-muted tabular-nums">
						{meta.model} · {(meta.ms / 1000).toFixed(1)}s · {meta.inputTokens}→
						{meta.outputTokens} tokens · ${meta.costUsd.toFixed(4)}
					</p>
				)}
			</div>
		</div>
	);
}

function LearnerBubble({ attempt }: { attempt: Attempt }) {
	return (
		<div className="ml-auto max-w-[85%] border-2 border-ink bg-card px-3 py-2">
			<p className="text-lg leading-snug">
				{attempt.words?.length
					? attempt.words.map((w, i) => (
							<span
								// biome-ignore lint/suspicious/noArrayIndexKey: fixed list
								key={i}
								className="underline decoration-4 underline-offset-4"
								style={{ textDecorationColor: scoreColor(w.accuracy) }}
								title={`${Math.round(w.accuracy)}`}
							>
								{w.word}{" "}
							</span>
						))
					: attempt.text}
			</p>
			{attempt.accuracy !== undefined && (
				<p className="mt-1 text-xs text-muted tabular-nums">
					Pronunciación {Math.round(attempt.accuracy)} · Fluidez{" "}
					{Math.round(attempt.fluency ?? 0)}
				</p>
			)}
		</div>
	);
}

function TutorBubble({ reply, color }: { reply: TutorReply; color: string }) {
	return (
		<div className="max-w-[90%]">
			<p className="text-lg leading-snug font-semibold">{reply.say}</p>
			{reply.corrections.map((c) => (
				<p
					key={c.word}
					className="mt-1 border-l-4 pl-2 text-sm"
					style={{ borderColor: "#E4572E" }}
				>
					<b>{c.word}</b>
					{c.heard && (
						<span className="text-muted"> (dijiste «{c.heard}»)</span>
					)}{" "}
					· {c.tip}
				</p>
			))}
			{reply.new_words.length > 0 && (
				<div className="mt-2 flex flex-wrap gap-1.5">
					{reply.new_words.map((w) => (
						<span
							key={w.en}
							className="px-2 py-0.5 text-xs font-bold"
							style={{ background: color, color: onColor(color) }}
						>
							+ {w.en} · {w.es}
						</span>
					))}
				</div>
			)}
		</div>
	);
}

function PasscodeScreen({
	onDone,
	error,
}: {
	onDone: () => void;
	error: string;
}) {
	const [code, setCode] = useState("");
	return (
		<form
			className="mx-auto flex h-dvh max-w-md flex-col justify-center gap-4 px-6"
			onSubmit={(e) => {
				e.preventDefault();
				setPasscode(code.trim());
				onDone();
			}}
		>
			<h1 className="text-4xl font-extrabold">Habla con Sam</h1>
			<p className="text-muted">Escribe el código de acceso.</p>
			<input
				type="password"
				value={code}
				onChange={(e) => setCode(e.target.value)}
				autoComplete="off"
				className="h-12 border-2 border-ink bg-card px-3 outline-none"
			/>
			{error && <p className="text-sm text-[#E4572E]">{error}</p>}
			<button
				type="submit"
				className="h-13 bg-ink font-extrabold text-paper"
				disabled={!code.trim()}
			>
				Entrar
			</button>
		</form>
	);
}
