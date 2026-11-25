// Ale marks Spanish inside an English line with «guillemets»: Juice is «jugo».
// The voice reads those parts with a Spanish voice; the chat shows them in italics.

export interface Segment {
	lang: "en" | "es";
	text: string;
}

export function splitLang(line: string): Segment[] {
	const out: Segment[] = [];
	const parts = line.split(/«([^«»]*)»/);
	parts.forEach((part, i) => {
		const text = part.trim();
		if (!text) return;
		const lang = i % 2 === 1 ? "es" : "en";
		const prev = out.at(-1);
		if (prev?.lang === lang) prev.text += ` ${text}`;
		else out.push({ lang, text });
	});
	return out;
}

/** The line without the markers, for anything that can't switch voices. */
export const plain = (line: string) => line.replace(/[«»]/g, "");
