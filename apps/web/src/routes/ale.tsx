import { createFileRoute, Link } from "@tanstack/react-router";
import { useEffect, useRef, useState } from "react";
import { onColor } from "#/components/Art";
import { track } from "#/lib/analytics";
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
import {
	chip,
	focusWords,
	getInterests,
	type Interests,
	notePicked,
	saveInterestsLocal,
	suggestTopics,
} from "#/lib/bot/topics";
import { getHardWords, recordScores, setHardWords } from "#/lib/bot/trouble";
import type {
	Attempt,
	BotStatus,
	HardWord,
	LearnerName,
	Meta,
	Topic,
	Turn,
	TutorReply,
} from "#/lib/bot/types";
import { Voice } from "#/lib/bot/voice";
import { useStore } from "#/lib/store";

// Hidden for now: not linked anywhere, not indexed.
export const Route = createFileRoute("/ale")({
	head: () => ({ meta: [{ name: "robots", content: "noindex, nofollow" }] }),
	component: Bot,
});

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
	const [timing, setTiming] = useState<{
		judge?: Meta;
		teacher?: Meta;
		voiceMs?: number;
	}>({});
	const timingRef = useRef<{ judge?: Meta }>({});
	const [spent, setSpent] = useState(0);
	const [learner, setLearnerState] = useState<LearnerName | null>(null);
	const [hard, setHard] = useState<HardWord[]>([]);
	const [interests, setInterests] = useState<Interests>({ counts: {} });
	const words = useStore();
	const wordsRef = useRef(words);
	wordsRef.current = words;
	const [panel, setPanel] = useState<"none" | "menu" | "hard">("none");

	// Refs so async callbacks always see the latest values.
	const turnsRef = useRef<Turn[]>([]);
	const learnerRef = useRef<LearnerName | null>(null);
	const hardRef = useRef<HardWord[]>([]);
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

	const current = chip(topic, hard.length);
	const color = current.color;

	const rememberName = (l: LearnerName | null) => {
		learnerRef.current = l?.name ? l : null;
		setLearnerState(learnerRef.current);
		setLearner(learnerRef.current);
	};

	const saveHard = (list: HardWord[]) => {
		hardRef.current = list;
		setHard(list);
		setHardWords(list);
	};

	const saveInterests = (i: Interests) => {
		setInterests(i);
		saveInterestsLocal(i);
	};

	// "Borrar lo que Ale sabe de mí": name, hard words and topics on this phone.
	const forgetMe = () => {
		rememberName(null);
		saveHard([]);
		saveInterests({ counts: {} });
	};

	// The judge scored a turn: remember hard words, celebrate mastered ones.
	const noteScores = (a: Attempt) => {
		if (a.lang !== "en" || !a.words?.length) return;
		const { list, mastered } = recordScores(hardRef.current, a.words);
		saveHard(list);
		if (mastered.length) setNote(`🎯 ¡Ya dices bien: ${mastered.join(", ")}!`);
	};

	useEffect(() => {
		learnerRef.current = getLearner();
		setLearnerState(learnerRef.current);
		hardRef.current = getHardWords();
		setHard(hardRef.current);
		setInterests(getInterests());
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
		} else if (e instanceof BotError && e.code === "timeout") {
			setError("Ale tardó demasiado en responder. Intenta otra vez.");
		} else if (e instanceof BotError && e.code === "not_configured") {
			setError(`Falta configurar: ${e.missing.join(", ")}`);
		} else setError(e instanceof Error ? e.message : String(e));
	};

	const addCost = (m: Meta) => setSpent((s) => s + (m.costUsd ?? 0));

	// Ask Ale for the next line (latest = null opens the conversation), then say it.
	async function askAle(latest: Attempt | null, spokeAt?: number) {
		if (busy.current) return;
		busy.current = true;
		const sentAt = performance.now();
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
				hardRef.current.slice(0, 8),
				topicRef.current === "libre" || topicRef.current === "hard"
					? []
					: focusWords(wordsRef.current, topicRef.current),
			);
			if (stale()) return;
			// Don't repeat new-word chips already shown in this chat.
			const shown = new Set(
				turnsRef.current.flatMap((t) =>
					t.role === "tutor"
						? t.reply.new_words.map((w) => w.en.toLowerCase())
						: [],
				),
			);
			res.reply.new_words = res.reply.new_words.filter(
				(w) => !shown.has(w.en.toLowerCase()),
			);
			// She told Ale her name (or fixed its spelling): remember it on this phone.
			if (res.reply.learner_name?.name) rememberName(res.reply.learner_name);
			pushTurn({ role: "tutor", reply: res.reply });
			setTiming((t) => ({ ...t, teacher: res.meta }));
			addCost(res.meta);
			// Let go of the mic while Ale talks: with a mic open, iPhones play
			// sound in "phone call" mode, very quietly. It reopens to listen.
			mic.current?.release();
			setMode("speaking");
			const judgeMeta = timingRef.current.judge;
			await voice.current?.speak(res.reply.say, () => {
				const voiceMs = voice.current?.lastFetchMs ?? 0;
				setTiming((t) => ({ ...t, voiceMs }));
				track("ale_turn", {
					topic: topicRef.current,
					typed: spokeAt === undefined,
					judge_ms: spokeAt !== undefined ? judgeMeta?.ms : undefined,
					judge_thoughts:
						spokeAt !== undefined ? judgeMeta?.thoughtTokens : undefined,
					teacher_ms: res.meta.ms,
					teacher_model: res.meta.model,
					voice_ms: voiceMs,
					// From the end of her speech (or the send tap) to Ale's first sound.
					total_ms: Math.round(performance.now() - (spokeAt ?? sentAt)),
				});
			});
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
				if (handsFreeRef.current) void listen();
			}
		}
	}

	// One spoken turn: record until she stops, have the judge hear it, then ask Ale.
	async function listen() {
		if (!mic.current || !handsFreeRef.current) return;
		try {
			await mic.current.open(); // no-op if it's already open
		} catch {
			pause();
			setError(
				"No pude usar el micrófono. Revisa el permiso, o escribe abajo.",
			);
			return;
		}
		if (!handsFreeRef.current) return;
		setMode("listening");
		setPartial("");
		captions.current?.start(setPartial);
		mic.current.listen({
			onTurn: async (wav) => {
				const spokeAt = performance.now();
				const caption = captions.current?.stop() ?? "";
				setPartial("");
				let attempt: Attempt | null = null;
				if (statusRef.current?.judge.ready) {
					setMode("hearing");
					try {
						const res = await fetchHear(wav, caption);
						attempt = res.attempt;
						noteScores(attempt);
						timingRef.current = { ...timingRef.current, judge: res.meta };
						setTiming((t) => ({ ...t, judge: res.meta }));
						addCost(res.meta);
					} catch (e) {
						// Passcode/config problems stop the page; a judge hiccup doesn't.
						if (
							e instanceof BotError &&
							(e.code === "wrong_passcode" || e.code === "not_configured")
						)
							handleError(e);
						else {
							console.warn("judge failed", e);
							setNote(
								e instanceof BotError && e.code === "timeout"
									? "La revisión tardó mucho; seguimos sin puntaje esta vez."
									: "No pude revisar tu pronunciación esta vez.",
							);
						}
					}
				}
				// No judge (or it failed): use the live caption, without scores.
				if (!attempt && caption) attempt = { text: caption, lang: "en" };
				if (!attempt?.text.trim()) {
					setMode("idle");
					if (handsFreeRef.current) void listen();
					return;
				}
				void askAle(attempt, spokeAt);
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
		else void listen();
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

	// From the hard-words list: ask Ale to work on one word.
	const practice = (word: string) => {
		if (busy.current) return;
		voice.current ??= new Voice(Boolean(statusRef.current?.voice.ready));
		voice.current.unlock();
		mic.current?.pause();
		captions.current?.stop();
		void askAle({ text: `Quiero practicar "${word}".`, lang: "es" });
	};

	// Start over: drop the transcript and any reply still on its way.
	const newChat = () => {
		pause();
		convo.current += 1;
		busy.current = false;
		turnsRef.current = [];
		setTurns([]);
		setTiming({});
		timingRef.current = {};
		topicRef.current = "libre";
		setTopic("libre");
	};

	// A suggestion was tapped: remember the interest and start talking about it.
	const pickTopic = (t: Topic) => {
		saveInterests(notePicked(interests, t));
		track("ale_topic", { topic: t });
		topicRef.current = t;
		setTopic(t);
		void start();
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
				<p className="mx-5 mt-3 rounded-sm border-2 border-dashed border-line px-3 py-2 text-xs text-muted">
					{status?.mock ? "Modo de prueba (respuestas falsas). " : ""}
					{missing.length > 0 && `Sin configurar: ${missing.join(" · ")}`}
				</p>
			)}

			<div className="mt-4 flex items-center gap-4 px-5">
				<span
					className={`grid h-16 w-16 shrink-0 place-items-center rounded-md border-2 border-ink text-3xl ${mode === "listening" ? "animate-pulse" : ""}`}
					style={{ background: color }}
					aria-hidden
				>
					{face.emoji}
				</span>
				<div className="min-w-0">
					<p className="text-xl font-extrabold">
						Ale
						{turns.length > 0 && topic !== "libre" && (
							<span className="ml-2 text-sm font-bold text-muted">
								· {current.emoji} {current.label}
							</span>
						)}
					</p>
					<p className="truncate text-sm text-muted" aria-live="polite">
						{face.label}
					</p>
				</div>
				<button
					type="button"
					onClick={() => setPanel((p) => (p === "none" ? "menu" : "none"))}
					aria-label="Más opciones"
					aria-expanded={panel !== "none"}
					className="relative ml-auto grid h-12 w-12 shrink-0 place-items-center rounded-sm border-2 border-ink bg-card text-xl font-extrabold"
				>
					{panel === "none" ? "⋯" : "✕"}
					{hard.length > 0 && panel === "none" && (
						<span
							className="absolute -top-2 -right-2 grid h-5 min-w-5 place-items-center px-1 text-[11px] font-extrabold"
							style={{ background: color, color: onColor(color) }}
						>
							{hard.length}
						</span>
					)}
				</button>
			</div>

			<div className="relative mt-4 flex min-h-0 flex-1 flex-col border-t-2 border-line">
				<div className="ph-no-capture min-h-0 flex-1 space-y-3 overflow-y-auto px-5 py-4">
					{turns.length === 0 && (
						<div className="pt-2">
							<p className="text-2xl font-extrabold">¿De qué hablamos?</p>
							<div className="mt-3 flex flex-wrap gap-2">
								{suggestTopics(words, interests, hard.length).map((c) => (
									<button
										key={c.id}
										type="button"
										onClick={() => pickTopic(c.id)}
										className="h-11 rounded-sm border-2 px-3 font-bold"
										style={{ borderColor: c.color }}
									>
										{c.emoji} {c.label}
									</button>
								))}
							</div>
							<p className="mt-4 text-sm text-muted">
								O toca «Hablar» y di lo que quieras. Puedes preguntar en
								español: <i>«¿Cómo se dice mariposa?»</i>
							</p>
						</div>
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

				{panel !== "none" && (
					<button
						type="button"
						aria-label="Cerrar menú"
						className="absolute inset-0 bg-paper/60"
						onClick={() => setPanel("none")}
					/>
				)}

				{panel === "menu" && (
					<div
						role="menu"
						className="absolute top-2 right-4 w-64 overflow-hidden rounded-md border-2 border-ink bg-card"
					>
						<MenuItem
							onClick={() => setPanel("hard")}
							label="🎯 Palabras difíciles"
							count={hard.length}
						/>
						{learner && (
							<MenuItem
								onClick={() => {
									rememberName(null);
									setPanel("none");
								}}
								label={`👤 Olvidar «${learner.name}»`}
								sub="Ale te pregunta tu nombre otra vez"
							/>
						)}
						<MenuItem
							onClick={() => {
								newChat();
								setPanel("none");
							}}
							label="🔄 Nueva conversación"
						/>
						<MenuItem
							onClick={() => {
								forgetMe();
								setPanel("none");
								setNote(
									"Listo: Ale olvidó tu nombre, tus palabras difíciles y tus temas.",
								);
							}}
							label="🗑️ Borrar lo que Ale sabe de mí"
							sub="Nombre, palabras difíciles y temas"
						/>
					</div>
				)}

				{panel === "hard" && (
					<div className="absolute inset-x-0 bottom-0">
						<HardWords
							words={hard}
							color={color}
							onPractice={(w) => {
								setPanel("none");
								practice(w);
							}}
							onClear={() => {
								saveHard([]);
								setPanel("none");
							}}
							onClose={() => setPanel("none")}
						/>
					</div>
				)}
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
					className="h-14 w-full rounded-sm text-lg font-extrabold disabled:opacity-40"
					style={
						handsFree
							? { border: "2px solid var(--ink)" }
							: { background: color, color: onColor(color) }
					}
				>
					{handsFree ? "⏸ Pausar" : "🎙 Hablar"}
				</button>
				<form
					className="ph-no-capture mt-2 flex gap-2"
					onSubmit={(e) => {
						e.preventDefault();
						sendTyped();
					}}
				>
					<input
						value={typed}
						onChange={(e) => setTyped(e.target.value)}
						placeholder="…o escribe aquí"
						className="h-11 min-w-0 flex-1 rounded-sm border-2 border-ink bg-card px-3 outline-none placeholder:text-muted"
						maxLength={600}
					/>
					<button
						type="submit"
						className="h-11 rounded-sm border-2 border-ink px-4 font-bold"
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
							`juez ${timing.judge.model} ${fmt(timing.judge)}${timing.judge.thoughtTokens ? ` (pensó ${timing.judge.thoughtTokens})` : ""} · `}
						maestro {timing.teacher?.model} {fmt(timing.teacher)}
						{timing.voiceMs
							? ` · voz ${(timing.voiceMs / 1000).toFixed(1)}s`
							: ""}
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
		<div className="ml-auto max-w-[85%] rounded-sm border-2 border-ink bg-card px-3 py-2">
			<p className="text-lg leading-snug">
				{attempt.words?.length
					? attempt.words.map((w, i) =>
							w.lang === "es" ? (
								// Spanish in a mixed sentence: shown, not scored.
								// biome-ignore lint/suspicious/noArrayIndexKey: fixed list
								<span key={i} className="italic">
									{w.word}{" "}
								</span>
							) : (
								<span
									// biome-ignore lint/suspicious/noArrayIndexKey: fixed list
									key={i}
									className="underline decoration-4 underline-offset-4"
									style={{ textDecorationColor: scoreColor(w.accuracy) }}
									title={`${Math.round(w.accuracy)}`}
								>
									{w.word}{" "}
								</span>
							),
						)
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

/** Words she struggles with, hardest first; tap one to practice it with Ale. */
function HardWords({
	words,
	color,
	onPractice,
	onClear,
	onClose,
}: {
	words: HardWord[];
	color: string;
	onPractice: (word: string) => void;
	onClear: () => void;
	onClose: () => void;
}) {
	return (
		<div className="border-t-2 border-ink bg-card p-4">
			<div className="flex items-center justify-between">
				<p className="text-lg font-extrabold">🎯 Palabras difíciles</p>
				<button
					type="button"
					onClick={onClose}
					className="-mr-2 grid h-9 w-9 place-items-center text-xl"
					aria-label="Cerrar"
				>
					✕
				</button>
			</div>
			{words.length === 0 && (
				<p className="mt-1 text-sm text-muted">
					Todavía ninguna. Cuando una palabra te cueste al hablar, aparece aquí.
				</p>
			)}
			{words.length > 0 && (
				<p className="mt-0.5 text-xs text-muted">
					Ale vuelve a ellas. Salen de la lista al decirlas bien dos veces.
				</p>
			)}
			<ul className="mt-2 max-h-48 space-y-1.5 overflow-y-auto">
				{words.map((h) => (
					<li key={h.word} className="flex items-center gap-2">
						<span
							className="w-9 shrink-0 text-right text-sm font-bold tabular-nums"
							style={{ color: scoreColor(h.last) }}
						>
							{h.last}
						</span>
						<span className="min-w-0 flex-1">
							<span className="font-bold">{h.word}</span>
							{h.note && (
								<span className="block truncate text-xs text-muted">
									{h.note}
								</span>
							)}
						</span>
						<button
							type="button"
							onClick={() => onPractice(h.word)}
							className="h-8 shrink-0 rounded-sm px-2.5 text-xs font-bold"
							style={{ background: color, color: onColor(color) }}
						>
							Practicar
						</button>
					</li>
				))}
			</ul>
			{words.length > 0 && (
				<button
					type="button"
					onClick={onClear}
					className="mt-3 text-xs text-muted underline underline-offset-2"
				>
					Borrar lista
				</button>
			)}
		</div>
	);
}

function MenuItem({
	label,
	sub,
	count,
	onClick,
}: {
	label: string;
	sub?: string;
	count?: number;
	onClick: () => void;
}) {
	return (
		<button
			type="button"
			role="menuitem"
			onClick={onClick}
			className="flex w-full items-center justify-between gap-3 border-b-2 border-line px-3 py-3 text-left last:border-b-0"
		>
			<span className="min-w-0">
				<span className="block font-bold">{label}</span>
				{sub && <span className="block text-xs text-muted">{sub}</span>}
			</span>
			{count !== undefined && (
				<span className="shrink-0 text-sm font-bold tabular-nums text-muted">
					{count}
				</span>
			)}
		</button>
	);
}

/**
 * What Ale wants them to say comes in "quotes": bold and underlined.
 * Spanish comes in «guillemets»: italic, without the marks.
 */
function Practice({ text, color }: { text: string; color: string }) {
	const parts = text.split(/["“”]([^"“”]+)["“”]/);
	const spanish = (s: string, key: number) =>
		s.split(/«([^«»]*)»/).map((p, j) =>
			j % 2 === 1 ? (
				// biome-ignore lint/suspicious/noArrayIndexKey: fixed split of one string
				<em key={`${key}-${j}`} className="font-semibold">
					{p}
				</em>
			) : (
				p
			),
		);
	return parts.map((part, i) =>
		i % 2 === 1 ? (
			<strong
				// biome-ignore lint/suspicious/noArrayIndexKey: fixed split of one string
				key={i}
				className="font-extrabold underline decoration-4 underline-offset-4"
				style={{ textDecorationColor: color }}
			>
				{part}
			</strong>
		) : (
			spanish(part, i)
		),
	);
}

function TutorBubble({ reply, color }: { reply: TutorReply; color: string }) {
	return (
		<div className="max-w-[90%]">
			<p className="text-lg leading-snug font-semibold">
				<Practice text={reply.say} color={color} />
			</p>
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
							className="rounded-sm px-2 py-0.5 text-xs font-bold"
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
				className="h-12 rounded-sm border-2 border-ink bg-card px-3 outline-none"
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
				className="h-13 rounded-sm bg-ink font-extrabold text-paper"
				disabled={!code.trim() || checking}
			>
				{checking ? "Revisando…" : "Entrar"}
			</button>
		</form>
	);
}
