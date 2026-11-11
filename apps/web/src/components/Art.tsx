import { hasPic, Pic } from "#/data/pics";
import type { Word } from "#/data/words";

/** A word's picture: its emoji, or a drawn pictogram. */
export function Art({
	word,
	size = "lg",
}: {
	word: Word;
	size?: "lg" | "md" | "sm";
}) {
	const emoji = { lg: "text-[6.5rem]", md: "text-5xl", sm: "text-3xl" }[size];
	const svg = { lg: "h-32 w-32", md: "h-14 w-14", sm: "h-9 w-9" }[size];
	if (word.pic) {
		return (
			<span className={`${emoji} leading-none`} aria-hidden>
				{word.pic}
			</span>
		);
	}
	if (hasPic(word.id)) return <Pic id={word.id} className={svg} />;
	return null;
}

export const hasArt = (w: Word) => Boolean(w.pic || hasPic(w.id));

/** Black or white text, whichever reads better on `hex`. */
export function onColor(hex: string) {
	const n = Number.parseInt(hex.slice(1), 16);
	const [r, g, b] = [(n >> 16) & 255, (n >> 8) & 255, n & 255];
	return 0.299 * r + 0.587 * g + 0.114 * b > 160 ? "#111111" : "#FFFFFF";
}
