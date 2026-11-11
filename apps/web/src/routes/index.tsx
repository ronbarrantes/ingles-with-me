import { createFileRoute, Link } from "@tanstack/react-router";
import { useEffect, useRef } from "react";
import { onColor } from "#/components/Art";
import { TOPIC_COLOR, TOPIC_EMOJI, TOPIC_IDS } from "#/data/topics";
import { CORE_WORDS } from "#/data/words";
import { fmt, t, topicName } from "#/i18n";
import { isLearned, useStore } from "#/lib/store";
import { useHydrated } from "#/lib/useHydrated";

export const Route = createFileRoute("/")({ component: Topics });

/** Aprender: a carousel of topics. Opens on the last one you used. */
function Topics() {
	const state = useStore();
	const hydrated = useHydrated();
	const strip = useRef<HTMLDivElement>(null);
	const learned = CORE_WORDS.filter((w) => isLearned(state, w.id)).length;

	// Scroll to the last topic once saved progress is loaded.
	useEffect(() => {
		if (!hydrated) return;
		strip.current
			?.querySelector<HTMLElement>(`[data-topic="${state.lastTopic}"]`)
			?.scrollIntoView({
				inline: "center",
				block: "nearest",
				behavior: "instant",
			});
	}, [hydrated, state.lastTopic]);

	return (
		<div className="flex min-h-[calc(100dvh-5rem)] flex-col justify-center gap-6 py-8">
			<div className="px-6">
				<p className="text-sm font-semibold tracking-widest uppercase opacity-50">
					{t.appName}
				</p>
				<h1 className="mt-1 text-5xl leading-[0.95] font-extrabold whitespace-pre-line">
					{t.learn.title}
				</h1>
				<p className="mt-3 text-sm text-muted">
					{fmt(t.progress, { n: learned, total: CORE_WORDS.length })}
				</p>
			</div>

			<div
				ref={strip}
				className="flex snap-x snap-mandatory gap-4 overflow-x-auto px-6 pb-2 [scrollbar-width:none]"
			>
				{TOPIC_IDS.map((id) => {
					const color = TOPIC_COLOR[id];
					const saved = hydrated ? state.decks[id] : undefined;
					return (
						<Link
							key={id}
							to="/aprender/$group"
							params={{ group: id }}
							data-topic={id}
							className="flex h-[50dvh] max-h-[26rem] w-[72vw] max-w-72 shrink-0 snap-center flex-col justify-between p-6 transition-transform active:scale-[0.97]"
							style={{ background: color, color: onColor(color) }}
						>
							<span className="text-8xl">{TOPIC_EMOJI[id]}</span>
							<span>
								<span className="block text-4xl leading-none font-extrabold">
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
			<p className="px-6 text-sm opacity-50">{t.learn.swipeHint}</p>
		</div>
	);
}
