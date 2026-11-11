import type { Word } from "#/data/words";

// Custom SVG pictures go here as they get made: { dog: "/pics/dog.svg" }.
// Until then each word uses its emoji, or a tiny scene (its example sentence).
const SVGS: Record<string, string> = {};

const escapeRe = (s: string) => s.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");

export function hasPicture(w: Word) {
	return Boolean(SVGS[w.id] || w.pic);
}

export function Picture({
	word,
	size = "lg",
}: {
	word: Word;
	size?: "lg" | "sm";
}) {
	const svg = SVGS[word.id];
	const cls =
		size === "lg" ? "text-[5rem] leading-none" : "text-3xl leading-none";
	if (svg) {
		return (
			<img
				src={svg}
				alt=""
				className={size === "lg" ? "h-36 w-36" : "h-9 w-9"}
			/>
		);
	}
	if (word.pic) {
		return (
			<span className={cls} role="img" aria-hidden>
				{word.pic}
			</span>
		);
	}
	return null;
}

/** The example sentence with the word highlighted, or blanked out. */
export function Sentence({
	word,
	blank = false,
}: {
	word: Word;
	blank?: boolean;
}) {
	const re = new RegExp(`\\b(${escapeRe(word.en)})\\b`, "i");
	const parts = word.example.split(re);
	return (
		<span>
			{parts.map((p, i) =>
				i % 2 === 1 ? (
					blank ? (
						<span
							// biome-ignore lint/suspicious/noArrayIndexKey: static split
							key={i}
							className="inline-block w-16 border-b-2 border-accent align-baseline"
						>
							&nbsp;
						</span>
					) : (
						// biome-ignore lint/suspicious/noArrayIndexKey: static split
						<mark key={i} className="bg-transparent text-accent font-bold">
							{p}
						</mark>
					)
				) : (
					p
				),
			)}
		</span>
	);
}
