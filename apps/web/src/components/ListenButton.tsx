import { useEffect, useRef, useState } from "react";
import { t } from "#/i18n";
import { speakWord } from "#/lib/speech";

/** 🔊 says the word; tap again for slow (🐢). */
export function ListenButton({
	text,
	label = false,
	className = "",
}: {
	text: string;
	label?: boolean;
	className?: string;
}) {
	const [slow, setSlow] = useState(false);
	const timer = useRef<ReturnType<typeof setTimeout>>(undefined);
	useEffect(() => () => clearTimeout(timer.current), []);
	return (
		<button
			type="button"
			onClick={() => {
				const s = speakWord(text);
				setSlow(s);
				clearTimeout(timer.current);
				if (s) timer.current = setTimeout(() => setSlow(false), 2500);
			}}
			aria-label={slow ? t.deck.listenSlow : t.deck.listen}
			className={className}
		>
			<span aria-hidden>{slow ? "🐢" : "🔊"}</span>
			{label && <span> {slow ? t.deck.listenSlow : t.deck.listen}</span>}
		</button>
	);
}
