import { createFileRoute, Link, notFound } from "@tanstack/react-router";
import { useState } from "react";
import { DESIGNS } from "#/designs";
import type { Screen } from "#/designs/shared";

export const Route = createFileRoute("/designs/$id")({
	validateSearch: (s: Record<string, unknown>): { s: Screen } => ({
		s: s.s === "study" ? "study" : "picker",
	}),
	beforeLoad: ({ params }) => {
		const n = Number(params.id);
		if (!(n >= 1 && n <= DESIGNS.length)) throw notFound();
	},
	component: View,
});

function View() {
	const { id } = Route.useParams();
	const { s } = Route.useSearch();
	const n = Number(id);
	const { Component } = DESIGNS[n - 1];
	const prev = ((n + DESIGNS.length - 2) % DESIGNS.length) + 1;
	const next = (n % DESIGNS.length) + 1;
	const [open, setOpen] = useState(false);

	return (
		<>
			<Component key={`${n}-${s}`} start={s} />
			{/* Prototype switcher, not part of any design: a tiny tab on the left edge */}
			<div className="fixed top-1/2 left-0 z-50 -translate-y-1/2 bg-black/80 text-xs font-bold text-white backdrop-blur">
				{open ? (
					<div className="flex flex-col items-stretch text-center">
						<Link to="/designs" className="px-3 py-2">
							≡
						</Link>
						<Link
							to="/designs/$id"
							params={{ id: String(prev) }}
							search={{ s }}
							className="px-3 py-2"
						>
							▲
						</Link>
						<span className="px-1 py-1 tabular-nums">{n}/5</span>
						<Link
							to="/designs/$id"
							params={{ id: String(next) }}
							search={{ s }}
							className="px-3 py-2"
						>
							▼
						</Link>
						<Link
							to="/designs/$id"
							params={{ id }}
							search={{ s: s === "study" ? "picker" : "study" }}
							className="border-t border-white/20 px-2 py-2"
						>
							{s === "study" ? "Topic" : "Study"}
						</Link>
						<button
							type="button"
							onClick={() => setOpen(false)}
							className="border-t border-white/20 px-3 py-2"
						>
							✕
						</button>
					</div>
				) : (
					<button
						type="button"
						onClick={() => setOpen(true)}
						className="px-1.5 py-4"
						aria-label="Designs"
					>
						{n}
					</button>
				)}
			</div>
		</>
	);
}
