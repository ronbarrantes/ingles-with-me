import { Link, useRouterState } from "@tanstack/react-router";
import { t } from "#/i18n";
import { CardsIcon, ListIcon, RepeatIcon } from "./icons";

const tabs = [
	{
		to: "/",
		label: t.nav.learn,
		Icon: CardsIcon,
		match: (p: string) => p === "/" || p.startsWith("/aprender"),
	},
	{
		to: "/palabras",
		label: t.nav.words,
		Icon: ListIcon,
		match: (p: string) => p.startsWith("/palabras"),
	},
	{
		to: "/repasar",
		label: t.nav.review,
		Icon: RepeatIcon,
		match: (p: string) => p.startsWith("/repasar"),
	},
] as const;

/** Inside a deck it's just cards, so the bar hides there. */
export const isDeckPath = (p: string) =>
	p.startsWith("/aprender/") || /^\/repasar\/[^/]+/.test(p);

export function TabBar() {
	const path = useRouterState({ select: (s) => s.location.pathname });
	return (
		<nav className="fixed inset-x-0 bottom-0 z-20 border-t-2 border-ink bg-paper dark:border-t dark:border-line pb-[env(safe-area-inset-bottom)]">
			<ul className="mx-auto grid max-w-md grid-cols-3">
				{tabs.map(({ to, label, Icon, match }) => {
					const on = match(path);
					return (
						<li key={to}>
							<Link
								to={to}
								className={`flex h-16 flex-col items-center justify-center gap-0.5 ${on ? "" : "opacity-45"}`}
								aria-current={on ? "page" : undefined}
							>
								<Icon className="h-6 w-6" strokeWidth={on ? 2.4 : 1.8} />
								<span className="text-xs font-extrabold">{label}</span>
								<span
									className={`mt-0.5 h-1 w-6 ${on ? "bg-ink" : "bg-transparent"}`}
								/>
							</Link>
						</li>
					);
				})}
			</ul>
		</nav>
	);
}
