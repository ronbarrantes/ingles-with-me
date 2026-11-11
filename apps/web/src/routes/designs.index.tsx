import { createFileRoute, Link } from "@tanstack/react-router";
import { DESIGNS } from "#/designs";

export const Route = createFileRoute("/designs/")({ component: Index });

function Index() {
	return (
		<div className="mx-auto min-h-dvh max-w-md px-5 py-10">
			<p className="text-sm tracking-widest text-muted uppercase">Secreto</p>
			<h1 className="font-display text-4xl">Diseños</h1>
			<p className="mt-2 text-muted">
				Cinco ideas distintas. Cada una tiene dos pantallas: elegir tema y
				estudiar. No guardan tu progreso.
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
								Elegir tema
							</Link>
							<Link
								to="/designs/$id"
								params={{ id: String(i + 1) }}
								search={{ s: "study" }}
								className="bg-ink px-3 py-2 text-paper"
							>
								Estudiar
							</Link>
						</div>
					</li>
				))}
			</ol>
		</div>
	);
}
