import { useEffect, useRef, useState } from "react";
import { getTheme, NEXT, setTheme, type Theme } from "#/lib/theme";

const LABEL: Record<Theme, string> = {
	system: "Sistema",
	light: "Claro",
	dark: "Oscuro",
};

/** Tiny icon that cycles Sistema → Claro → Oscuro. */
export function ThemeToggle() {
	const [theme, set] = useState<Theme>("system");
	const [flash, setFlash] = useState(false);
	const timer = useRef<ReturnType<typeof setTimeout>>(undefined);

	useEffect(() => set(getTheme()), []);

	const cycle = () => {
		const next = NEXT[theme];
		setTheme(next);
		set(next);
		setFlash(true);
		clearTimeout(timer.current);
		timer.current = setTimeout(() => setFlash(false), 1200);
	};

	return (
		<button
			type="button"
			onClick={cycle}
			aria-label={`Tema: ${LABEL[theme]}`}
			className="-mr-2 flex h-9 items-center gap-1.5 px-2 text-muted"
		>
			<span
				className={`text-xs font-semibold transition-opacity duration-300 ${flash ? "opacity-100" : "opacity-0"}`}
			>
				{LABEL[theme]}
			</span>
			<svg
				viewBox="0 0 24 24"
				className="h-5 w-5"
				fill="none"
				stroke="currentColor"
				strokeWidth={2}
				strokeLinecap="round"
				aria-hidden="true"
			>
				{theme === "system" && (
					<>
						<circle cx={12} cy={12} r={8} />
						<path d="M12 4a8 8 0 0 1 0 16Z" fill="currentColor" />
					</>
				)}
				{theme === "light" && (
					<>
						<circle cx={12} cy={12} r={4} />
						<path d="M12 2v2M12 20v2M4.9 4.9l1.4 1.4M17.7 17.7l1.4 1.4M2 12h2M20 12h2M4.9 19.1l1.4-1.4M17.7 6.3l1.4-1.4" />
					</>
				)}
				{theme === "dark" && (
					<path d="M20 14.5A8 8 0 1 1 9.5 4a6.5 6.5 0 0 0 10.5 10.5Z" />
				)}
			</svg>
		</button>
	);
}
