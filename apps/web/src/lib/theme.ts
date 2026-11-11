// Light / dark / system theme. Saved on the device; applied as
// <html data-theme="light|dark"> (no attribute = follow the system).

export type Theme = "system" | "light" | "dark";

const KEY = "iwm:theme";
const BAR = { light: "#f6f4ef", dark: "#141414" };

/** Runs inline in <head> before paint. Keep it tiny and dependency-free. */
export const THEME_SCRIPT = `try{var t=localStorage.getItem("${KEY}");if(t==="light"||t==="dark")document.documentElement.dataset.theme=t}catch(e){}`;

export function getTheme(): Theme {
	try {
		const t = localStorage.getItem(KEY);
		return t === "light" || t === "dark" ? t : "system";
	} catch {
		return "system";
	}
}

export function setTheme(t: Theme) {
	const root = document.documentElement;
	if (t === "system") delete root.dataset.theme;
	else root.dataset.theme = t;
	try {
		if (t === "system") localStorage.removeItem(KEY);
		else localStorage.setItem(KEY, t);
	} catch {
		// Storage blocked: the choice lasts until reload.
	}
	// Browser chrome color: forced themes override both media-specific tags.
	for (const m of document.querySelectorAll<HTMLMetaElement>(
		'meta[name="theme-color"]',
	)) {
		const media = m.media.includes("dark") ? "dark" : "light";
		m.content = t === "system" ? BAR[media] : BAR[t];
	}
}

export const NEXT: Record<Theme, Theme> = {
	system: "light",
	light: "dark",
	dark: "system",
};
