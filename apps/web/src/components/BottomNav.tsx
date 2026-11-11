import { Link } from "@tanstack/react-router";
import { t } from "#/i18n";
import { CardsIcon, ListIcon, RepeatIcon } from "./icons";

const items = [
	{ to: "/", label: t.nav.learn, Icon: CardsIcon },
	{ to: "/palabras", label: t.nav.words, Icon: ListIcon },
	{ to: "/repasar", label: t.nav.review, Icon: RepeatIcon },
] as const;

/** Bottom tab bar on phones; a top bar on wider screens. */
export function BottomNav() {
	return (
		<nav className="fixed inset-x-0 bottom-0 z-20 border-t border-line bg-paper pb-[env(safe-area-inset-bottom)] md:top-0 md:bottom-auto md:border-t-0 md:border-b md:pb-0">
			<div className="mx-auto flex max-w-2xl items-center md:h-16 md:px-4">
				<span className="hidden flex-1 font-display text-xl md:block">
					{t.appName}
				</span>
				<ul className="grid flex-1 grid-cols-3 md:flex md:flex-none md:gap-1">
					{items.map(({ to, label, Icon }) => (
						<li key={to}>
							<Link
								to={to}
								activeOptions={{ exact: true }}
								className="flex h-16 flex-col items-center justify-center gap-1 text-muted data-[status=active]:text-accent md:h-10 md:flex-row md:gap-2 md:px-3"
							>
								<Icon />
								<span className="text-xs font-bold md:text-sm">{label}</span>
							</Link>
						</li>
					))}
				</ul>
			</div>
		</nav>
	);
}
