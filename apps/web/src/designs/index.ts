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
		idea: "Desliza tarjetas: derecha la sé, izquierda otra vez.",
		Component: Pila,
	},
	{
		name: "Concurso",
		idea: "Juego de preguntas: elige la palabra correcta, gana puntos y rachas.",
		Component: Concurso,
	},
	{
		name: "Cuaderno",
		idea: "Cuaderno escolar: fotos pegadas, letra a mano, stickers por palabra.",
		Component: Cuaderno,
	},
	{
		name: "Metro",
		idea: "Señales de metro: cada tema es una línea, cada palabra una parada.",
		Component: Metro,
	},
	{
		name: "Chat",
		idea: "Conversación con Sam, tu profe: todo pasa dentro del chat.",
		Component: Chat,
	},
];
