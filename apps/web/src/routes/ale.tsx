import { createFileRoute, Link } from "@tanstack/react-router";
import { useEffect, useRef, useState } from "react";
import { onColor } from "#/components/Art";
import {
	BotError,
	checkSavedPasscode,
	fetchHear,
	fetchReply,
	fetchStatus,
	getPasscode,
	setPasscode,
} from "#/lib/bot/api";
import { Captions, captionsAvailable } from "#/lib/bot/captions";
import { getLearner, setLearner } from "#/lib/bot/learner";
import { Mic } from "#/lib/bot/mic";
import type {
	Attempt,
	BotStatus,
	LearnerName,
	Meta,
	Topic,
	Turn,
	TutorReply,
} from "#/lib/bot/types";
import { Voice } from "#/lib/bot/voice";

// Hidden for now: not linked anywhere, not indexed.
export const Route = createFileRoute("/ale")({
	head: () => ({ meta: [{ name: "robots", content: "noindex, nofollow" }] }),
	component: Bot,
});

const TOPICS: { id: Topic; label: string; emoji: string; color: string }[] = [
	{ id: "libre", label: "Libre", emoji: "💬", color: "#2B59C3" },
	{ id: "cocina", label: "Cocina", emoji: "🍳", color: "#F3A712" },
	{ id: "jardin", label: "Jardín", emoji: "🌻", color: "#3BB273" },
	{ id: "casa", label: "Casa", emoji: "🏠", color: "#E4572E" },
];

type Mode = "idle" | "listening" | "hearing" | "thinking" | "speaking";

const FACE: Record<Mode, { emoji: string; label: string }> = {
	idle: { emoji: "😊", label: "Toca «Hablar» para empezar" },
	listening: { emoji: "👂", label: "Te escucho…" },
	hearing: { emoji: "🎧", label: "Revisando tu pronunciación…" },
	thinking: { emoji: "🤔", label: "Pensando…" },
	speaking: { emoji: "🗣️", label: "Ale está hablando" },
};

const scoreColor = (n: number) =>
	n >= 75 ? "#3BB273" : n >= 60 ? "#F3A712" : "#E4572E";

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
	const [note, setNote] = useState("");
	const [timing, setTiming] = useState<{ judge?: Meta; teacher?: Meta }>({});
	const [spent, setSpent] = useState(0);
	const [learner, setLearnerState] = useState<LearnerName | null>(null);

	// Refs so async callbacks always see the latest values.
	const turnsRef = useRef<Turn[]>([]);
	const learnerRef = useRef<LearnerName | null>(null);
	const handsFreeRef = useRef(false);
	const topicRef = useRef<Topic>("libre");
	const statusRef = useRef<BotStatus | null>(null);
	const mic = useRef<Mic | null>(null);
	const captions = useRef<Captions | null>(null);
	const voice = useRef<Voice | null>(null);
	const busy = useRef(false);
	// Bumped on every topic change, so a reply to the old chat is dropped.
	const convo = useRef(0);
	const wakeLock = useRef<{ release: () => Promise<void> } | null>(null);
	const end = useRef<HTMLDivElement>(null);

	const color = TOPICS.find((t) => t.id === topic)?.color ?? "#2B59C3";

	const rememberName = (l: LearnerName | null) => {
		learnerRef.current = l?.name ? l : null;
		setLearnerState(learnerRef.current);
		setLearner(learnerRef.current);
	};

	useEffect(() => {
		learnerRef.current = getLearner();
		setLearnerState(learnerRef.current);
		fetchStatus()
			.then((s) => {
				setStatus(s);
				statusRef.current = s;
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
			// Stop the hands-free loop, or it keeps retrying behind the lock screen.
			pause();
			setPasscode("");
			setLocked(true);
			setError("Código incorrecto.");
		} else if (e instanceof BotError && e.code === "not_configured") {
			setError(`Falta configurar: ${e.missing.join(", ")}`);
		} else setError(e instanceof Error ? e.message : String(e));
	};

	const addCost = (m: Meta) => setSpent((s) => s + (m.costUsd ?? 0));

	// Ask Ale for the next line (latest = null opens the conversation), then say it.
	async function askAle(latest: Attempt | null) {
		if (busy.current) return;
		busy.current = true;
		setError("");
		const mine = convo.current;
		const stale = () => mine !== convo.current;
		try {
			const history = turnsRef.current;
			if (latest) pushTurn({ role: "learner", attempt: latest });
			setMode("thinking");
			const res = await fetchReply(
				topicRef.current,
				history,
				latest,
				learnerRef.current,
			);
			if (stale()) return;
			// She told Ale her name (or fixed its spelling): remember it on this phone.
			if (res.reply.learner_name?.name) rememberName(res.reply.learner_name);
			pushTurn({ role: "tutor", reply: res.reply });
			setTiming((t) => ({ ...t, teacher: res.meta }));
			addCost(res.meta);
			setMode("speaking");
			await voice.current?.speak(res.reply.say);
		} catch (e) {
			if (stale()) return;
			// Don't leave her message hanging without a reply; typed text goes back in the box.
			if (latest) {
				turnsRef.current = turnsRef.current.slice(0, -1);
				setTurns(turnsRef.current);
				if (!latest.words) setTyped(latest.text);
			}
			handleError(e);
		} finally {
			// A topic change already reset everything for the new chat.
			if (!stale()) {
				busy.current = false;
				setMode("idle");
				if (handsFreeRef.current) listen();
			}
		}
	}

	// One spoken turn: record until she stops, have the judge hear it, then ask Ale.
	function listen() {
		if (!mic.current || !handsFreeRef.current) return;
		setMode("listening");
		setPartial("");
		captions.current?.start(setPartial);
		mic.current.listen({
			onTurn: async (wav) => {
				const caption = captions.current?.stop() ?? "";
				setPartial("");
				let attempt: Attempt | null = null;
				if (statusRef.current?.judge.ready) {
					setMode("hearing");
					try {
						const res = await fetchHear(wav, caption);
						attempt = res.attempt;
						setTiming((t) => ({ ...t, judge: res.meta }));
						addCost(res.meta);
					} catch (e) {
						handleError(e);
					}
				}
				// No judge (or it failed): use the live caption, without scores.
				if (!attempt && caption) attempt = { text: caption, lang: "en" };
				if (!attempt?.text.trim()) {
					setMode("idle");
					if (handsFreeRef.current) listen();
					return;
				}
				void askAle(attempt);
			},
		});
	}

	const start = async () => {
		setError("");
		voice.current ??= new Voice(Boolean(statusRef.current?.voice.ready));
		voice.current.unlock();
		captions.current ??= new Captions();
		try {
			mic.current ??= new Mic();
			await mic.current.open();
		} catch {
			mic.current = null;
			setError(
				"No pude usar el micrófono. Revisa el permiso, o escribe abajo.",
			);
			return;
		}
		if (!statusRef.current?.judge.ready) {
			setNote(
				captionsAvailable()
					? "Sin juez: uso el reconocimiento del teléfono, sin puntajes."
					: "Sin juez ni reconocimiento del teléfono: escribe tus respuestas.",
			);
		}
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
		if (turnsRef.current.length === 0) await askAle(null);
		else listen();
	};

	const pause = () => {
		handsFreeRef.current = false;
		setHandsFree(false);
		voice.current?.stop();
		mic.current?.pause();
		captions.current?.stop();
		setPartial("");
		setMode("idle");
		void wakeLock.current?.release();
		wakeLock.current = null;
	};

	const sendTyped = () => {
		const text = typed.trim();
		// While Ale is busy the text stays in the box (the button is disabled too).
		if (!text || busy.current) return;
		voice.current ??= new Voice(Boolean(statusRef.current?.voice.ready));
		voice.current.unlock();
		setTyped("");
		mic.current?.pause();
		captions.current?.stop();
		void askAle({ text });
	};

	const changeTopic = (t: Topic) => {
		pause();
		convo.current += 1;
		busy.current = false;
		topicRef.current = t;
		setTopic(t);
		turnsRef.current = [];
		setTurns([]);
		setTiming({});
	};

	useEffect(
		() => () => {
			handsFreeRef.current = false;
			mic.current?.close();
			captions.current?.stop();
			voice.current?.stop();
		},
		[],
	);

	if (locked) {
		return <PasscodeScreen onDone={() => setLocked(false)} error={error} />;
	}

	const missing = status
		? [
				!status.teacher.ready && `maestro (${status.teacher.label})`,
				!status.judge.ready && `juez (${status.judge.label})`,
				!status.voice.ready && !status.mock && `voz (${status.voice.label})`,
				!status.passcode && "BOT_PASSCODE",
			].filter(Boolean)
		: [];
	const face = FACE[mode];
	const fmt = (m?: Meta) => (m ? `${(m.ms / 1000).toFixed(1)}s` : "–");

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
				<span className="font-bold">Habla con Ale</span>
				<span className="w-10 text-right text-xs text-muted tabular-nums">
					${spent.toFixed(3)}
				</span>
			</header>

			{(missing.length > 0 || status?.mock) && (
				<p className="mx-5 mt-3 border-2 border-dashed border-line px-3 py-2 text-xs text-muted">
					{status?.mock ? "Modo de prueba (respuestas falsas). " : ""}
					{missing.length > 0 && `Sin configurar: ${missing.join(" · ")}`}
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
					<p className="text-xl font-extrabold">Ale</p>
					<p className="truncate text-sm text-muted" aria-live="polite">
						{face.label}
					</p>
				</div>
				{learner && (
					<button
						type="button"
						onClick={() => rememberName(null)}
						className="ml-auto shrink-0 border-2 border-ink px-2 py-1 text-xs font-bold"
						title="Ale olvidará tu nombre y te lo preguntará otra vez"
					>
						{learner.name} ✕
					</button>
				)}
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

			{(error || note) && (
				<p
					className="px-5 pb-2 text-xs"
					style={{ color: error ? "#E4572E" : "var(--muted)" }}
				>
					{error || note}
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
						sendTyped();
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
						disabled={
							!typed.trim() ||
							mode === "thinking" ||
							mode === "hearing" ||
							mode === "speaking"
						}
					>
						Enviar
					</button>
				</form>
				{(timing.judge || timing.teacher) && (
					<p className="mt-2 text-center text-[11px] text-muted tabular-nums">
						{timing.judge &&
							`juez ${timing.judge.model} ${fmt(timing.judge)} · `}
						maestro {timing.teacher?.model} {fmt(timing.teacher)}
						{timing.teacher?.costUsd != null &&
							` · $${timing.teacher.costUsd.toFixed(4)}`}
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
	const [checking, setChecking] = useState(false);
	const [show, setShow] = useState(false);
	const [problem, setProblem] = useState("");
	const submit = async () => {
		setChecking(true);
		setProblem("");
		setPasscode(code.trim());
		try {
			await checkSavedPasscode();
			onDone();
		} catch (e) {
			setPasscode("");
			setProblem(
				e instanceof BotError && e.code === "wrong_passcode"
					? "Código incorrecto."
					: e instanceof BotError && e.code === "not_configured"
						? "Falta configurar BOT_PASSCODE en el servidor."
						: "No pude conectar con el servidor.",
			);
		} finally {
			setChecking(false);
		}
	};
	return (
		<form
			className="mx-auto flex h-dvh max-w-md flex-col justify-center gap-4 px-6"
			onSubmit={(e) => {
				e.preventDefault();
				void submit();
			}}
		>
			<h1 className="text-4xl font-extrabold">Habla con Ale</h1>
			<p className="text-muted">
				Escribe el código de acceso. Se guarda en este teléfono.
			</p>
			<input
				type={show ? "text" : "password"}
				value={code}
				onChange={(e) => setCode(e.target.value)}
				autoComplete="off"
				autoCapitalize="none"
				autoCorrect="off"
				spellCheck={false}
				className="h-12 border-2 border-ink bg-card px-3 outline-none"
			/>
			<label className="flex items-center gap-2 text-sm">
				<input
					type="checkbox"
					checked={show}
					onChange={(e) => setShow(e.target.checked)}
					className="h-5 w-5 accent-[var(--ink)]"
				/>
				Mostrar código
			</label>
			{(problem || error) && (
				<p className="text-sm text-[#E4572E]">{problem || error}</p>
			)}
			<button
				type="submit"
				className="h-13 bg-ink font-extrabold text-paper"
				disabled={!code.trim() || checking}
			>
				{checking ? "Revisando…" : "Entrar"}
			</button>
		</form>
	);
}
