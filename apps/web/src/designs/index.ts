import Chat from "./Chat";
import Concurso from "./Concurso";
import Cuaderno from "./Cuaderno";
import Metro from "./Metro";
import Pila from "./Pila";
import type { Screen } from "./shared";

export const DESIGNS: {
	name: string;
	idea: string;
	Component: (p: { start: Screen }) => React.ReactNode;
}[] = [
	{
		name: "Pila",
		idea: "Swipe cards: right = I know it, left = again.",
		Component: Pila,
	},
	{
		name: "Concurso",
		idea: "Game show quiz: pick the right word, earn points and streaks.",
		Component: Concurso,
	},
	{
		name: "Cuaderno",
		idea: "School notebook: taped photos, handwriting, a sticker per word.",
		Component: Cuaderno,
	},
	{
		name: "Metro",
		idea: "Subway signage: each topic is a line, each word a stop.",
		Component: Metro,
	},
	{
		name: "Chat",
		idea: "A chat with Sam the tutor: everything happens in the conversation.",
		Component: Chat,
	},
];
