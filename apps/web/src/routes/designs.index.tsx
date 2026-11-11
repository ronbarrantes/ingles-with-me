import { createFileRoute, Link } from "@tanstack/react-router";
import { DESIGNS } from "#/designs";

export const Route = createFileRoute("/designs/")({ component: Index });

function Index() {
	return (
		<div className="mx-auto min-h-dvh max-w-md px-5 py-10">
			<p className="text-sm tracking-widest text-muted uppercase">Secret</p>
			<h1 className="font-display text-4xl">Designs</h1>
			<p className="mt-2 text-muted">
				Five different ideas, each with two screens: picking a topic and
				studying. The designs stay in Spanish; they don't touch saved progress.
			</p>
			<ol className="mt-8 divide-y divide-line border-y border-line">
				{DESIGNS.map((d, i) => (
					<li key={d.name} className="py-4">
						<p className="font-display text-2xl">
							{i + 1}. {d.name}
						</p>
						<p className="text-sm text-muted">{d.idea}</p>
						<div className="mt-3 flex gap-2 text-sm font-bold">
							<Link
								to="/designs/$id"
								params={{ id: String(i + 1) }}
								search={{ s: "picker" }}
								className="border border-ink px-3 py-2"
							>
								Pick topic
							</Link>
							<Link
								to="/designs/$id"
								params={{ id: String(i + 1) }}
								search={{ s: "study" }}
								className="bg-ink px-3 py-2 text-paper"
							>
								Study
							</Link>
						</div>
					</li>
				))}
			</ol>
			<Link
				to="/designs/pics"
				className="mt-6 inline-block font-bold underline underline-offset-4"
			>
				All drawings →
			</Link>
		</div>
	);
}
