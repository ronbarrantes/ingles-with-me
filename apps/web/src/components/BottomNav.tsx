import { Link } from "@tanstack/react-router";
import { t } from "#/i18n";
import { CardsIcon, ListIcon, RepeatIcon } from "./icons";

const items = [
	{ to: "/", label: t.nav.learn, Icon: CardsIcon },
	{ to: "/palabras", label: t.nav.words, Icon: ListIcon },
	{ to: "/repasar", label: t.nav.review, Icon: RepeatIcon },
] as const;

export function BottomNav() {
	return (
		<nav className="fixed inset-x-0 bottom-0 z-20 border-t border-line bg-paper pb-[env(safe-area-inset-bottom)]">
			<ul className="mx-auto grid max-w-md grid-cols-3">
				{items.map(({ to, label, Icon }) => (
					<li key={to}>
						<Link
							to={to}
							activeOptions={{ exact: true }}
							className="group flex h-16 flex-col items-center justify-center gap-1 text-muted data-[status=active]:text-accent"
						>
							<Icon />
							<span className="text-xs font-bold">{label}</span>
						</Link>
					</li>
				))}
			</ul>
		</nav>
	);
}
