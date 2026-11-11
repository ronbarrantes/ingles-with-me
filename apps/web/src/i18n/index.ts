// Interface text lives here so other UI languages can be added later.
// Only the interface is translated; the words being learned stay in English.

import type { CategoryId, Pos } from "#/data/words";

const es = {
	appName: "Inglés With Me",
	nav: { learn: "Aprender", words: "Palabras", review: "Repasar" },
	progress: "{n} de {total} aprendidas",
	direction: { word: "Palabra → dibujo", picture: "Dibujo → palabra" },
	card: {
		flip: "Toca para voltear",
		listen: "Escuchar",
		listenExample: "Escuchar ejemplo",
		showSpanish: "Ver en español",
		missing: "¿Qué palabra falta?",
		cognate: "Se parece al español",
		favorite: "Favorita",
		mark: "Marcar para repasar",
	},
	grade: { again: "Otra vez", know: "La sé" },
	learn: {
		allDone: "¡Viste las {total} palabras!",
		allDoneHint: "Sigue repasando para no olvidarlas.",
		sessionDone: "¡Bien hecho!",
		sessionDoneHint: "Viste {n} palabras nuevas.",
		more: "Seguir con más palabras",
		reviewDue: "Repasar {n} pendientes",
	},
	review: {
		due: "Pendientes",
		marked: "Marcadas",
		favorites: "Favoritas",
		start: "Empezar",
		emptyDue: "No tienes palabras pendientes. ¡Vuelve mañana!",
		emptyMarked: "Marca palabras con el marcador para repasarlas aquí.",
		emptyFavorites: "Toca la estrella en una palabra para guardarla aquí.",
		done: "¡Repaso terminado!",
		back: "Volver",
	},
	words: {
		search: "Buscar en inglés o español",
		all: "Todas",
		favorites: "Favoritas",
		empty: "No hay palabras aquí.",
		learned: "Aprendida",
		close: "Cerrar",
	},
	categories: {
		personas: "Personas",
		comida: "Comida",
		mundo: "Naturaleza",
		cuerpo: "Cuerpo",
		casa: "Casa",
		lugares: "Lugares",
		numeros: "Números y colores",
		preguntar: "Para preguntar",
		acciones: "Acciones",
		describir: "Describir",
		sentimientos: "Sentimientos",
		tiempo: "Tiempo",
		base: "Ideas básicas",
		trabajo: "Trabajo y dinero",
		conectores: "Palabras pequeñas",
		bonus: "Ya las sabes",
	} satisfies Record<CategoryId, string>,
	pos: {
		n: "sustantivo",
		v: "verbo",
		adj: "adjetivo",
		adv: "adverbio",
		pron: "pronombre",
		prep: "preposición",
		conj: "conjunción",
		det: "determinante",
		num: "número",
		int: "expresión",
		phr: "expresión",
	} satisfies Record<Pos, string>,
};

export type Messages = typeof es;

const messages: Messages = es;

/** Fill `{name}` placeholders. */
export function fmt(s: string, vars: Record<string, string | number>) {
	return s.replace(/\{(\w+)\}/g, (_, k) => String(vars[k] ?? `{${k}}`));
}

export const t = messages;
