import { createFileRoute, Link } from "@tanstack/react-router";
import { useEffect, useRef, useState } from "react";
import { onColor } from "#/components/Art";
import { ThemeToggle } from "#/components/ThemeToggle";
import {
	TOPIC_COLOR,
	TOPIC_EMOJI,
	TOPIC_IDS,
	TOPIC_SAMPLES,
	type TopicId,
	wordsIn,
} from "#/data/topics";
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
	// The description under the cards: fades out while sliding, back in when it stops.
	const [shown, setShown] = useState(0);
	const [fading, setFading] = useState(false);
	const settle = useRef<ReturnType<typeof setTimeout>>(undefined);
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
		setFading(true);
		clearTimeout(settle.current);
		settle.current = setTimeout(() => {
			setShown(best);
			setFading(false);
		}, 160);
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
		setShown(i);
	}, [hydrated, state.lastTopic]);

	return (
		<div className="flex min-h-[calc(100dvh-6rem-env(safe-area-inset-bottom))] flex-col pt-[calc(1.5rem+env(safe-area-inset-top))] pb-0">
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

			<div className="mt-4 flex min-h-0 flex-1 flex-col justify-center">
				<div
					ref={strip}
					onScroll={onScroll}
					className="flex shrink-0 snap-x snap-mandatory gap-4 overflow-x-auto px-[calc((100vw-min(36dvh,20rem,82vw)/1.2)/2)] [scrollbar-width:none]"
				>
					{TOPIC_IDS.map((id) => {
						const color = TOPIC_COLOR[id];
						const saved = hydrated ? state.decks[id] : undefined;
						return (
							<Link
								key={id}
								to="/aprender/$group"
								params={{ group: id }}
								className="@container aspect-[1/1.2] h-[min(36dvh,20rem,82vw)] shrink-0 snap-center transition-transform active:scale-[0.97]"
								style={{ background: color, color: onColor(color) }}
							>
								{/* Sizes in cqw scale with the card, so small cards stay readable. */}
								<span className="flex h-full flex-col justify-between p-[9cqw]">
									<span className="text-[29cqw] leading-none">
										{TOPIC_EMOJI[id]}
									</span>
									<span>
										<span className="block text-[13.5cqw] leading-none font-extrabold">
											{topicName(id)}
										</span>
										<span className="mt-[4cqw] block text-[max(11px,5.6cqw)] font-semibold opacity-85">
											{saved
												? fmt(t.learn.resume, {
														n: saved.known + 1,
														total: saved.total,
													})
												: t.learn.start}
										</span>
										<TopicProgress id={id} />
									</span>
								</span>
							</Link>
						);
					})}
				</div>

				<TopicInfo id={TOPIC_IDS[shown]} hidden={fading} />
			</div>

			<div className="mt-4 flex shrink-0 justify-center gap-2">
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

/** Learned words in a topic, as a thin bar inside its card. */
function TopicProgress({ id }: { id: TopicId }) {
	const state = useStore();
	const words = wordsIn(id);
	const done = words.filter((w) => isLearned(state, w.id)).length;
	return (
		<span className="mt-[5cqw] flex items-center gap-[3cqw]">
			<span className="h-[max(3px,1.3cqw)] flex-1 bg-current/25">
				<span
					className="block h-full bg-current"
					style={{ width: `${(done / words.length) * 100}%` }}
				/>
			</span>
			<span className="text-[max(10px,4.4cqw)] font-semibold tabular-nums opacity-85">
				{done}/{words.length}
			</span>
		</span>
	);
}

/** What's inside a topic: a line about it and a few sample words. Fixed height, so nothing shifts. */
function TopicInfo({ id, hidden }: { id: TopicId; hidden: boolean }) {
	return (
		<div
			className={`mx-auto mt-5 w-[min(30dvh,17rem,68vw)] min-w-60 transition-opacity ${hidden ? "opacity-0 duration-100" : "opacity-100 duration-300"}`}
			aria-live="polite"
		>
			<p className="line-clamp-2 h-[2lh] text-lg leading-snug font-bold">
				{t.learn.hints[id]}
			</p>
			<p className="mt-1 h-[1lh] truncate text-muted [@media(max-height:620px)]:hidden">
				{TOPIC_SAMPLES[id].join(" · ")}
			</p>
		</div>
	);
}
