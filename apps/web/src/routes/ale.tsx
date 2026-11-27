import { createFileRoute, Link } from "@tanstack/react-router";
import { useEffect, useRef, useState } from "react";
import { onColor } from "#/components/Art";
import { track } from "#/lib/analytics";
import {
	BotError,
	checkSavedPasscode,
	fetchStatus,
	fetchTurn,
	getPasscode,
	setPasscode,
} from "#/lib/bot/api";
import { Captions, captionsAvailable } from "#/lib/bot/captions";
import { hasHeadphones, onDevicesChange } from "#/lib/bot/headphones";
import { getLearner, setLearner } from "#/lib/bot/learner";
import {
	afterTurn,
	automatic,
	effective,
	freshLevel,
	getLevel,
	LEVEL_NAME,
	type LevelState,
	nudge,
	saveLevel,
} from "#/lib/bot/level";
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

/** One step of the mic's life, for diagnosing "stuck" from PostHog. */
function micStep(step: string, props?: Record<string, unknown>) {
	track("mic_step", { step, page: document.visibilityState, ...props });
}

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

const TIP_KEY = "iwm:tip-headphones";

type TurnRequest =
	| { kind: "open" }
	| { kind: "typed"; text: string }
	| { kind: "spoken"; wav: string; caption: string };

/** Ale's voice arrives inside the turn's stream as base64. */
function base64Blob(b64: string, mime: string) {
	const bin = atob(b64);
	const bytes = new Uint8Array(bin.length);
	for (let i = 0; i < bin.length; i++) bytes[i] = bin.charCodeAt(i);
	return new Blob([bytes], { type: mime });
}
const KEEP_MIC_KEY = "iwm:keep-mic";
const IDLE_PAUSE_MS = 60_000;

// Said right after they stop talking, about half the time (clips cached on
// the phone, fast voice): Spanish for levels 1–2, English for 3–4.
const FILLERS = {
	es: [
		"A ver…",
		"Ajá.",
		"Mmm.",
		"Okay.",
		"Bueno…",
		"Mmm, a ver.",
		"Sí, sí.",
		"Ajá, a ver.",
		"Muy bien…",
		"Déjame ver.",
	],
	en: [
		"Mm-hm.",
		"Okay.",
		"Hmm.",
		"Uh-huh.",
		"Right.",
		"Let me see.",
		"Mmm, okay.",
		"Got it.",
		"Alright…",
		"I see.",
	],
};
const FILLER_CHANCE = 0.5;
const FILLER_DELAY_MS = 800;

// How long a silence ends their turn, by English level (ms).
const END_SILENCE_BY_LEVEL = {
	1: 2_000,
	2: 1_700,
	3: 1_400,
	4: 1_100,
} as const;
// A sentence ending like this isn't finished: wait a little longer.
const UNFINISHED =
	/\b(and|or|but|the|a|an|to|of|with|for|in|on|at|my|your|is|are|because|so|then|y|o|pero|el|la|los|las|un|una|de|con|en|mi|porque|que)$/i;

const scoreColor = (n: number) =>
	n >= 75 ? "#3BB273" : n >= 60 ? "#F3A712" : "#E4572E";

function Bot() {
	const [status, setStatus] = useState<BotStatus | null>(null);
	const [locked, setLocked] = useState(true);
	const [topic, setTopic] = useState<Topic>("libre");
	const [turns, setTurns] = useState<Turn[]>([]);
	const [mode, setMode] = useState<Mode>("idle");
	const [handsFree, setHandsFree] = useState(false);
	const [voiceLevel, setVoiceLevel] = useState(0);
	// The mic stopped hearing and needs a tap to restart (iPhone).
	const [stalled, setStalled] = useState(false);
	// "Micrófono siempre abierto": no releasing between turns (no prompts or
	// stalls), but iPhones play Ale more quietly.
	const [keepMic, setKeepMic] = useState(false);
	const keepMicRef = useRef(false);
	// The learner's own choice ("on"/"off"), or null = automatic: keep the mic
	// open when headphones are connected, or after the mic got stuck twice.
	const [micChoice, setMicChoice] = useState<"on" | "off" | null>(null);
	const micChoiceRef = useRef<"on" | "off" | null>(null);
	const headphonesRef = useRef(false);
	const stallsRef = useRef(0);
	// Log the page being hidden/shown: iPhones change the mic when that happens.
	useEffect(() => {
		const onVis = () => micStep(`page_${document.visibilityState}`);
		document.addEventListener("visibilitychange", onVis);
		return () => document.removeEventListener("visibilitychange", onVis);
	}, []);
	/** Unusable clips in a row (the judge heard nothing). */
	const emptiesRef = useRef(0);
	/** Take the mic again before the next listen. */
	const freshMicRef = useRef(false);
	/** Ask for a tap before the next listen. */
	const stuckRef = useRef(false);
	const applyMicMode = () => {
		const c = micChoiceRef.current;
		const keep =
			c === "on" ||
			(c === null && (headphonesRef.current || stallsRef.current >= 2));
		keepMicRef.current = keep;
		setKeepMic(keep);
		if (voice.current) voice.current.switchSession = !keep;
	};
	const checkHeadphones = async () => {
		headphonesRef.current = await hasHeadphones();
		applyMicMode();
	};
	// Auto-pause after a minute with nobody talking (mic off, saves battery).
	const idleTimer = useRef<ReturnType<typeof setTimeout>>(undefined);
	// Their turn is being checked: show their bubble right away, text comes next.
	const [pending, setPending] = useState(false);
	const recentFillers = useRef<string[]>([]);
	const turnCount = useRef(0);
	// True from the moment Ale's reply starts playing until it ends.
	const replying = useRef(false);
	// The phone's live caption (hidden): used to notice "…rice and" pauses.
	const lastCaption = useRef("");
	const [tip, setTip] = useState<"first" | "noise" | null>(null);
	const noiseTipShown = useRef(false);
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
	const levelRef = useRef<LevelState | null>(null);
	const [levelState, setLevelState] = useState<LevelState | null>(null);
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

	const saveLevelState = (l: LevelState) => {
		levelRef.current = l;
		setLevelState(l);
		saveLevel(l);
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
		saveLevelState(freshLevel(wordsRef.current));
	};

	// The judge scored a turn: remember hard words, celebrate mastered ones.
	const noteScores = (a: Attempt) => {
		if (a.lang !== "en" || !a.words?.length) return;
		const { list, mastered } = recordScores(hardRef.current, a.words);
		saveHard(list);
		if (mastered.length) setNote(`🎯 ¡Ya dices bien: ${mastered.join(", ")}!`);
	};

	// biome-ignore lint/correctness/useExhaustiveDependencies: load once on mount
	useEffect(() => {
		learnerRef.current = getLearner();
		setLearnerState(learnerRef.current);
		hardRef.current = getHardWords();
		setHard(hardRef.current);
		setInterests(getInterests());
		try {
			const saved = localStorage.getItem(KEEP_MIC_KEY);
			micChoiceRef.current =
				saved === "1" ? "on" : saved === "0" ? "off" : null;
			setMicChoice(micChoiceRef.current);
			applyMicMode();
		} catch {
			// Private mode: default.
		}
		levelRef.current = getLevel(wordsRef.current);
		setLevelState(levelRef.current);
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
	}, [turns.length, mode]);

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
			track("turn_timeout");
			setError("Ale tardó demasiado en responder. Intenta otra vez.");
		} else if (e instanceof BotError && e.code === "not_configured") {
			setError(`Falta configurar: ${e.missing.join(", ")}`);
		} else setError(e instanceof Error ? e.message : String(e));
	};

	const addCost = (m: Meta) => setSpent((s) => s + (m.costUsd ?? 0));

	// Ask Ale for the next line (latest = null opens the conversation), then say it.
	/**
	 * One turn through /api/bot/turn: Ale opens, answers typed text, or hears
	 * a recording. The server streams back what they said (with scores),
	 * Ale's reply and Ale's voice; each shows up as soon as it arrives.
	 */
	async function askAle(input: TurnRequest, spokeAt?: number) {
		if (busy.current) return;
		busy.current = true;
		const sentAt = performance.now();
		setError("");
		const mine = convo.current;
		const stale = () => mine !== convo.current;
		let latest: Attempt | null = null;
		let pushedLearner = false;
		try {
			const history = turnsRef.current;
			// A new conversation: count it (the very first one starts in Spanish).
			let lvl = levelRef.current ?? getLevel(wordsRef.current);
			const first = lvl.chats === 0;
			if (history.length === 0) lvl = { ...lvl, chats: lvl.chats + 1 };
			saveLevelState(lvl);
			if (input.kind === "typed") {
				latest = { text: input.text };
				pushTurn({ role: "learner", attempt: latest });
				pushedLearner = true;
			}
			setMode(input.kind === "spoken" ? "hearing" : "thinking");

			let reply: TutorReply | null = null;
			let replyMeta: Meta | null = null;
			let audio: Blob | null | undefined;
			let voiceMs = 0;
			let empty = false;
			let failed: BotError | null = null;
			await fetchTurn(
				{
					topic: topicRef.current,
					history,
					learner: learnerRef.current,
					hard: hardRef.current.slice(0, 8),
					focus:
						topicRef.current === "libre" || topicRef.current === "hard"
							? []
							: focusWords(wordsRef.current, topicRef.current),
					level: {
						value: effective(lvl),
						first: first && history.length === 0,
					},
					...(input.kind === "spoken" && {
						audio: input.wav,
						caption: input.caption,
					}),
					...(input.kind === "typed" && { text: input.text }),
				},
				(e) => {
					if (stale()) return;
					if (e.type === "heard") {
						latest = e.attempt;
						noteScores(e.attempt);
						timingRef.current = { ...timingRef.current, judge: e.meta };
						setTiming((t) => ({ ...t, judge: e.meta }));
						addCost(e.meta);
						pushTurn({ role: "learner", attempt: e.attempt });
						pushedLearner = true;
						setPending(false);
						setMode("thinking");
						if (e.judgeFailed)
							setNote("No pude revisar tu pronunciación esta vez.");
					} else if (e.type === "empty") {
						empty = true;
					} else if (e.type === "reply") {
						reply = e.reply;
						replyMeta = e.meta;
					} else if (e.type === "voice") {
						audio = base64Blob(e.audio, e.mime);
						voiceMs = e.ms;
					} else if (e.type === "voice_unavailable") {
						audio = null;
					} else if (e.type === "error") {
						failed = new BotError(e.code, [], e.message);
					}
				},
			);
			if (stale()) return;
			if (empty) {
				setPending(false);
				track("ale_empty_turn", {
					judged: Boolean(statusRef.current?.judge.ready),
					...mic.current?.lastClip,
					engine: mic.current?.engineState,
				});
				// The clip was unusable (often garbled sound after the phone sat
				// idle): take the mic again fresh. Twice in a row: ask for a tap,
				// which lets the iPhone rebuild the whole listening engine.
				emptiesRef.current += 1;
				if (emptiesRef.current >= 2) {
					emptiesRef.current = 0;
					stallsRef.current += 1;
					applyMicMode();
					stuckRef.current = true;
				} else freshMicRef.current = true;
				return;
			}
			if (failed) throw failed;
			if (!reply || !replyMeta) throw new BotError("no_reply");
			emptiesRef.current = 0;
			const r = reply as TutorReply;
			const meta = replyMeta as Meta;
			// Adjust the English level from this turn and the teacher's read of it.
			if (latest) saveLevelState(afterTurn(lvl, latest, r.pace));
			// Don't repeat new-word chips already shown in this chat.
			const shown = new Set(
				turnsRef.current.flatMap((t) =>
					t.role === "tutor"
						? t.reply.new_words.map((w) => w.en.toLowerCase())
						: [],
				),
			);
			r.new_words = r.new_words.filter((w) => !shown.has(w.en.toLowerCase()));
			// They told Ale their name (or fixed its spelling): remember it on this phone.
			if (r.learner_name?.name) rememberName(r.learner_name);
			pushTurn({ role: "tutor", reply: r });
			setTiming((t) => ({ ...t, teacher: meta }));
			addCost(meta);
			// Let go of the mic while Ale talks: with a mic open, iPhones play
			// sound in "phone call" mode, very quietly. It reopens to listen.
			if (!keepMicRef.current) mic.current?.release();
			replying.current = true;
			setMode("speaking");
			const judgeMeta = timingRef.current.judge;
			await voice.current?.speak(
				r.say,
				() => {
					setTiming((t) => ({ ...t, voiceMs }));
					track("ale_turn", {
						via: "turn",
						topic: topicRef.current,
						typed: spokeAt === undefined,
						judge_ms: spokeAt !== undefined ? judgeMeta?.ms : undefined,
						judge_thoughts:
							spokeAt !== undefined ? judgeMeta?.thoughtTokens : undefined,
						teacher_ms: meta.ms,
						teacher_model: meta.model,
						level: levelRef.current ? effective(levelRef.current) : undefined,
						voice_ms: voiceMs,
						// From the end of their speech (or the send tap) to Ale's first sound.
						total_ms: Math.round(performance.now() - (spokeAt ?? sentAt)),
					});
				},
				audio,
			);
		} catch (e) {
			setPending(false);
			if (stale()) return;
			// Don't leave their message hanging without a reply; typed text goes back in the box.
			if (pushedLearner) {
				turnsRef.current = turnsRef.current.slice(0, -1);
				setTurns(turnsRef.current);
			}
			if (input.kind === "typed") setTyped(input.text);
			handleError(e);
		} finally {
			replying.current = false;
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
		micStep("listen", { fresh: freshMicRef.current, stuck: stuckRef.current });
		if (stuckRef.current) {
			stuckRef.current = false;
			setMode("idle");
			setStalled(true);
			return;
		}
		if (freshMicRef.current) {
			freshMicRef.current = false;
			mic.current.release();
		}
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
		// Is sound really coming in? (iPhones can leave the engine paused.)
		if (!(await mic.current.ensureRunning())) {
			track("mic_stall", { state: mic.current.engineState });
			stallsRef.current += 1;
			applyMicMode(); // after two stalls, keep the mic open for this visit
			setMode("idle");
			setStalled(true);
			return;
		}
		if (!handsFreeRef.current) return;
		setMode("listening");
		setVoiceLevel(0);
		// The phone's live caption only hears English (Spanish comes out garbled),
		// so it isn't shown; it's kept as the fallback text if the judge fails.
		lastCaption.current = "";
		captions.current?.start((t) => {
			lastCaption.current = t;
		});
		const lvl = levelRef.current ? effective(levelRef.current) : 1;
		clearTimeout(idleTimer.current);
		idleTimer.current = setTimeout(() => {
			if (handsFreeRef.current) {
				pause();
				setNote("Pausé porque no escuché nada. Toca «Hablar» para seguir.");
				track("ale_auto_pause");
			}
		}, IDLE_PAUSE_MS);
		mic.current.listen({
			onSpeechStart: () => clearTimeout(idleTimer.current),
			// Beginners pause more mid-sentence: give them more time.
			endSilenceMs: END_SILENCE_BY_LEVEL[lvl],
			soundsUnfinished: () => UNFINISHED.test(lastCaption.current.trim()),
			onLevel: (v) => {
				setVoiceLevel(v);
				// A loud room (boiling water, a fan): suggest headphones, once per visit.
				if (!noiseTipShown.current && (mic.current?.noiseLevel ?? 0) > 0.35) {
					noiseTipShown.current = true;
					setTip("noise");
				}
			},
			onTurn: async (wav, speechMs) => {
				const spokeAt = performance.now();
				const caption = captions.current?.stop() ?? "";
				// Right away: let go of the mic, say "Mm-hm", show their bubble.
				if (!keepMicRef.current) mic.current?.release();
				setPending(true);
				// A filler only after real speech (not a cough), and only if Ale
				// still needs a moment ~0.8s later: by then the iPhone has finished
				// switching audio modes (louder), and a quick reply needs no filler.
				const turn = ++turnCount.current;
				if (speechMs >= 1_200)
					setTimeout(() => {
						if (turnCount.current === turn && !replying.current) sayFiller();
					}, FILLER_DELAY_MS);
				void askAle({ kind: "spoken", wav, caption }, spokeAt);
			},
		});
	}

	function sayFiller() {
		const lvl = levelRef.current ? effective(levelRef.current) : 1;
		if (Math.random() > FILLER_CHANCE) return; // not every time: sounds more natural
		const options = FILLERS[lvl <= 2 ? "es" : "en"].filter(
			(f) => !recentFillers.current.includes(f),
		);
		const line = options[Math.floor(Math.random() * options.length)];
		recentFillers.current = [line, ...recentFillers.current].slice(0, 2);
		voice.current?.filler(line);
		// If the level changed language, fetch that set too (no-op when cached).
		void voice.current?.prefetch(fillerLines());
	}

	const fillerLines = () => {
		const lvl = levelRef.current ? effective(levelRef.current) : 1;
		const lang = lvl <= 2 ? "es" : "en";
		return FILLERS[lang].map((text) => ({ text, lang }) as const);
	};

	const start = async () => {
		setError("");
		// First time talking: suggest headphones once.
		try {
			if (!localStorage.getItem(TIP_KEY)) setTip("first");
		} catch {
			// Private mode: skip the tip.
		}
		voice.current ??= new Voice(Boolean(statusRef.current?.voice.ready));
		voice.current.switchSession = !keepMicRef.current;
		voice.current.unlock();
		captions.current ??= new Captions();
		try {
			// Every «Hablar» tap starts a fresh listening engine: after the page
			// sat idle, an iPhone can hand back an old one that garbles sound.
			mic.current?.close();
			if (!mic.current) {
				mic.current = new Mic();
				mic.current.onStep = micStep;
			}
			await mic.current.open();
			await checkHeadphones(); // device names are visible now
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
		if (turnsRef.current.length === 0) await askAle({ kind: "open" });
		else void listen();
		// After Ale's first line, so the clips never slow it down.
		void voice.current?.prefetch(fillerLines());
	};

	const pause = () => {
		clearTimeout(idleTimer.current);
		setPending(false);
		setStalled(false);
		handsFreeRef.current = false;
		setHandsFree(false);
		voice.current?.stop();
		mic.current?.pause();
		captions.current?.stop();
		setMode("idle");
		void wakeLock.current?.release();
		wakeLock.current = null;
	};

	const sendTyped = () => {
		const text = typed.trim();
		// While Ale is busy the text stays in the box (the button is disabled too).
		if (!text || busy.current) return;
		voice.current ??= new Voice(Boolean(statusRef.current?.voice.ready));
		voice.current.switchSession = !keepMicRef.current;
		voice.current.unlock();
		setTyped("");
		mic.current?.pause();
		captions.current?.stop();
		void askAle({ kind: "typed", text });
	};

	// From the hard-words list: ask Ale to work on one word.
	const practice = (word: string) => {
		if (busy.current) return;
		voice.current ??= new Voice(Boolean(statusRef.current?.voice.ready));
		voice.current.switchSession = !keepMicRef.current;
		voice.current.unlock();
		mic.current?.pause();
		captions.current?.stop();
		void askAle({ kind: "typed", text: `Quiero practicar "${word}".` });
	};

	// Start over: drop the transcript and any reply still on its way.
	const newChat = () => {
		pause();
		convo.current += 1;
		busy.current = false;
		turnsRef.current = [];
		setTurns([]);
		setPending(false);
		setTiming({});
		timingRef.current = {};
		topicRef.current = "libre";
		setTopic("libre");
	};

	// 🔁 Say Ale's last line again (e.g. a pot drowned it out).
	async function repeat() {
		const last = [...turnsRef.current]
			.reverse()
			.find((t) => t.role === "tutor");
		if (!last || last.role !== "tutor" || busy.current) return;
		busy.current = true;
		if (!keepMicRef.current) mic.current?.release();
		captions.current?.stop();
		voice.current ??= new Voice(Boolean(statusRef.current?.voice.ready));
		voice.current.switchSession = !keepMicRef.current;
		voice.current.unlock();
		setMode("speaking");
		try {
			await voice.current.speak(last.reply.say);
		} finally {
			busy.current = false;
			setMode("idle");
			if (handsFreeRef.current) void listen();
		}
	}

	// A suggestion was tapped: remember the interest and start talking about it.
	const pickTopic = (t: Topic) => {
		saveInterests(notePicked(interests, t));
		track("ale_topic", { topic: t });
		topicRef.current = t;
		setTopic(t);
		void start();
	};

	// biome-ignore lint/correctness/useExhaustiveDependencies: listen once
	useEffect(() => onDevicesChange(() => void checkHeadphones()), []);

	useEffect(
		() => () => {
			clearTimeout(idleTimer.current);
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
	const lastTutor = turns.map((t) => t.role).lastIndexOf("tutor");
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
					className={`motion-safe-anim grid h-16 w-16 shrink-0 place-items-center rounded-md border-2 border-ink text-3xl ${mode === "listening" ? "animate-pulse" : ""} ${mode === "thinking" || mode === "hearing" ? "animate-[nod_1.1s_ease-in-out_infinite]" : ""}`}
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
						{face.label.replace(/…$/, "")}
						{(mode === "thinking" || mode === "hearing") && <Dots />}
						{mode !== "thinking" &&
						mode !== "hearing" &&
						face.label.endsWith("…")
							? "…"
							: ""}
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

			{tip && (
				<div className="mx-5 mt-3 flex items-start gap-2 rounded-sm border-2 border-ink bg-card px-3 py-2 text-sm">
					<p className="flex-1">
						{tip === "first"
							? "🎧 Con audífonos (como AirPods) escuchas mejor a Ale y Ale te entiende mejor, sobre todo en la cocina."
							: "🎧 Hay mucho ruido. Con audífonos Ale te oye mejor."}
					</p>
					<button
						type="button"
						aria-label="Cerrar"
						className="-mr-1 grid h-6 w-6 place-items-center"
						onClick={() => {
							setTip(null);
							try {
								localStorage.setItem(TIP_KEY, "1");
							} catch {
								// Private mode.
							}
						}}
					>
						✕
					</button>
				</div>
			)}

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
							<TutorBubble
								// biome-ignore lint/suspicious/noArrayIndexKey: append-only transcript
								key={i}
								reply={t.reply}
								color={color}
								onRepeat={i === lastTutor ? repeat : undefined}
							/>
						),
					)}
					{mode === "listening" && <ListeningBubble level={voiceLevel} />}
					{pending && <PendingBubble />}
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
								const next = keepMicRef.current ? "off" : "on";
								micChoiceRef.current = next;
								setMicChoice(next);
								applyMicMode();
								try {
									localStorage.setItem(KEEP_MIC_KEY, next === "on" ? "1" : "0");
								} catch {
									// Private mode.
								}
							}}
							label={`🎙️ Micrófono siempre abierto: ${keepMic ? "sí" : "no"}${micChoice ? "" : " (automático)"}`}
							sub="Sí: sin avisos ni cortes, pero más bajo. Se activa solo con audífonos."
						/>
						{micChoice && (
							<MenuItem
								onClick={() => {
									micChoiceRef.current = null;
									setMicChoice(null);
									applyMicMode();
									try {
										localStorage.removeItem(KEEP_MIC_KEY);
									} catch {
										// Private mode.
									}
								}}
								label="↩︎ Micrófono en automático"
							/>
						)}
						<p className="px-3 py-2 text-xs text-muted">
							🔒 El micrófono solo escucha mientras hablas con Ale. No guardamos
							tu voz.
						</p>
						{levelState && (
							<LevelRow
								state={levelState}
								onChange={(l) => saveLevelState(l)}
							/>
						)}
						<MenuItem
							onClick={() => {
								forgetMe();
								setPanel("none");
								setNote(
									"Listo: Ale olvidó tu nombre, tus palabras difíciles y tus temas.",
								);
							}}
							label="🗑️ Borrar lo que Ale sabe de mí"
							sub="Nombre, palabras difíciles, temas y nivel"
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
				{mode === "listening" && (
					<button
						type="button"
						onClick={() => {
							if (!mic.current?.finish())
								setNote(
									"Todavía no te escuché. Habla y luego toca «Terminé de hablar».",
								);
						}}
						className="mb-2 h-12 w-full rounded-sm border-2 border-ink bg-card font-bold"
					>
						✓ Terminé de hablar
					</button>
				)}
				{stalled && (
					<button
						type="button"
						onClick={async () => {
							setStalled(false);
							// A tap lets iPhones restart the listening engine.
							mic.current?.close();
							if (await mic.current?.ensureRunning()) {
								handsFreeRef.current = true;
								setHandsFree(true);
								void listen();
							} else {
								setError("El micrófono no responde. Toca «Hablar» otra vez.");
								pause();
							}
						}}
						className="mb-2 h-14 w-full rounded-sm border-2 border-ink bg-card text-lg font-extrabold"
					>
						🎙 Toca para seguir escuchando
					</button>
				)}
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
		<div className="motion-safe-anim ml-auto max-w-[85%] animate-[pop_0.25s_ease-out] rounded-sm border-2 border-ink bg-card px-3 py-2">
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

/** Three dots that take turns lighting up. */
function Dots() {
	return (
		<span className="ml-0.5 inline-flex gap-0.5" aria-hidden>
			{[0, 1, 2].map((i) => (
				<span
					key={i}
					className="motion-safe-anim inline-block animate-[dot_1.2s_ease-in-out_infinite]"
					style={{ animationDelay: `${i * 0.15}s` }}
				>
					.
				</span>
			))}
		</span>
	);
}

/** Their turn while the judge checks it: the bubble is there, the words come next. */
function PendingBubble() {
	return (
		<output
			className="ml-auto flex h-12 w-24 animate-[pop_0.2s_ease-out] items-center justify-center rounded-sm border-2 border-ink bg-card text-2xl font-extrabold"
			aria-label="Revisando lo que dijiste"
		>
			<Dots />
		</output>
	);
}

/** While listening: a bubble on their side with bars that move with their voice. */
function ListeningBubble({ level }: { level: number }) {
	const shape = [0.45, 0.75, 1, 0.75, 0.45];
	return (
		<output
			className="ml-auto flex h-12 w-24 items-center justify-center gap-1.5 rounded-sm border-2 border-ink bg-card"
			aria-label="Te escucho"
		>
			{shape.map((k, i) => (
				<span
					// biome-ignore lint/suspicious/noArrayIndexKey: fixed bars
					key={i}
					className="w-1.5 rounded-full bg-ink transition-[height] duration-100"
					style={{ height: `${Math.round(6 + level * 26 * k)}px` }}
				/>
			))}
		</output>
	);
}

/** "Más español / Más inglés" in the menu, with the current level. */
function LevelRow({
	state,
	onChange,
}: {
	state: LevelState;
	onChange: (l: LevelState) => void;
}) {
	const lvl = effective(state);
	return (
		<div className="border-b-2 border-line px-3 py-3">
			<p className="font-bold">
				🎚️ {LEVEL_NAME[lvl]}{" "}
				<span className="text-xs font-normal text-muted">
					{state.manual ? "(elegido)" : "(automático)"}
				</span>
			</p>
			<div className="mt-2 flex gap-2">
				<button
					type="button"
					disabled={lvl === 1}
					onClick={() => onChange(nudge(state, -1))}
					className="h-9 flex-1 rounded-sm border-2 border-ink text-sm font-bold disabled:opacity-40"
				>
					Más español
				</button>
				<button
					type="button"
					disabled={lvl === 4}
					onClick={() => onChange(nudge(state, 1))}
					className="h-9 flex-1 rounded-sm border-2 border-ink text-sm font-bold disabled:opacity-40"
				>
					Más inglés
				</button>
			</div>
			{state.manual && (
				<button
					type="button"
					onClick={() => onChange(automatic(state))}
					className="mt-2 text-xs text-muted underline underline-offset-2"
				>
					Volver a automático
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

function TutorBubble({
	reply,
	color,
	onRepeat,
}: {
	reply: TutorReply;
	color: string;
	onRepeat?: () => void;
}) {
	return (
		<div className="max-w-[90%]">
			<p className="text-lg leading-snug font-semibold">
				<Practice text={reply.say} color={color} />
			</p>
			{onRepeat && (
				<button
					type="button"
					onClick={onRepeat}
					className="mt-1 h-8 rounded-sm border-2 border-ink px-2.5 text-xs font-bold"
				>
					🔁 Repetir
				</button>
			)}
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
