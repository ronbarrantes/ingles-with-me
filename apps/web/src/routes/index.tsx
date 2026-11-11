import { createFileRoute, Link } from "@tanstack/react-router";
import { useEffect, useRef, useState } from "react";
import { onColor } from "#/components/Art";
import { ThemeToggle } from "#/components/ThemeToggle";
import { TOPIC_COLOR, TOPIC_EMOJI, TOPIC_IDS } from "#/data/topics";
import { CORE_WORDS } from "#/data/words";
import { fmt, t, topicName } from "#/i18n";
import { isLearned, useStore } from "#/lib/store";
import { useHydrated } from "#/lib/useHydrated";

export const Route = createFileRoute("/")({ component: Topics });

/** Aprender: a carousel of topics that fills the screen. Opens on the last one used. */
function Topics() {
	const state = useStore();
	const hydrated = useHydrated();
	const strip = useRef<HTMLDivElement>(null);
	const [active, setActive] = useState(0);
	const learned = CORE_WORDS.filter((w) => isLearned(state, w.id)).length;

	const cardAt = (i: number) =>
		strip.current?.children[i] as HTMLElement | undefined;

	// Which card is centered right now.
	const onScroll = () => {
		const el = strip.current;
		if (!el) return;
		const mid = el.scrollLeft + el.clientWidth / 2;
		let best = 0;
		let dist = Number.POSITIVE_INFINITY;
		for (let i = 0; i < el.children.length; i++) {
			const c = el.children[i] as HTMLElement;
			const d = Math.abs(c.offsetLeft + c.offsetWidth / 2 - mid);
			if (d < dist) [best, dist] = [i, d];
		}
		setActive(best);
	};

	// Open on the last topic once saved progress is loaded.
	useEffect(() => {
		if (!hydrated) return;
		const i = Math.max(
			0,
			TOPIC_IDS.indexOf(state.lastTopic as (typeof TOPIC_IDS)[number]),
		);
		(strip.current?.children[i] as HTMLElement | undefined)?.scrollIntoView({
			inline: "center",
			block: "nearest",
			behavior: "instant",
		});
		setActive(i);
	}, [hydrated, state.lastTopic]);

	return (
		<div className="flex h-[calc(100dvh-4rem-env(safe-area-inset-bottom))] flex-col pt-[calc(1.5rem+env(safe-area-inset-top))] pb-5">
			<header className="px-6">
				<div className="flex items-center justify-between">
					<p className="text-sm font-semibold tracking-widest uppercase opacity-50">
						{t.appName}
					</p>
					<ThemeToggle />
				</div>
				<h1 className="mt-1 text-[2.75rem] leading-[0.95] font-extrabold whitespace-pre-line">
					{t.learn.title}
				</h1>
				<p className="mt-3 text-sm text-muted">
					{fmt(t.progress, { n: learned, total: CORE_WORDS.length })}
				</p>
			</header>

			<div
				ref={strip}
				onScroll={onScroll}
				className="mt-5 flex min-h-0 flex-1 snap-x snap-mandatory gap-4 overflow-x-auto px-[16vw] [scrollbar-width:none] sm:px-24"
			>
				{TOPIC_IDS.map((id) => {
					const color = TOPIC_COLOR[id];
					const saved = hydrated ? state.decks[id] : undefined;
					return (
						<Link
							key={id}
							to="/aprender/$group"
							params={{ group: id }}
							className="flex h-full max-h-[34rem] w-[68vw] max-w-72 shrink-0 snap-center flex-col justify-between p-6 transition-transform active:scale-[0.97]"
							style={{ background: color, color: onColor(color) }}
						>
							<span className="text-7xl">{TOPIC_EMOJI[id]}</span>
							<span>
								<span className="block text-[2.1rem] leading-none font-extrabold">
									{topicName(id)}
								</span>
								<span className="mt-3 block text-sm font-semibold opacity-85">
									{saved
										? fmt(t.learn.resume, {
												n: saved.known + 1,
												total: saved.total,
											})
										: t.learn.start}
								</span>
							</span>
						</Link>
					);
				})}
			</div>

			<div className="mt-5 flex justify-center gap-2">
				{TOPIC_IDS.map((id, i) => (
					<button
						key={id}
						type="button"
						aria-label={topicName(id)}
						aria-current={i === active}
						onClick={() =>
							cardAt(i)?.scrollIntoView({
								inline: "center",
								block: "nearest",
								behavior: "smooth",
							})
						}
						className="grid h-6 place-items-center"
					>
						<span
							className="block h-2 transition-all duration-300"
							style={{
								width: i === active ? 22 : 8,
								background: i === active ? TOPIC_COLOR[id] : "var(--line)",
							}}
						/>
					</button>
				))}
			</div>
		</div>
	);
}
