// Interface text lives here so other UI languages can be added later.
// Only the interface is translated; the words being learned stay in English.

import type { CategoryId, GroupId, Pos } from "#/data/words";

const es = {
	appName: "Inglés With Me",
	nav: { learn: "Aprender", words: "Palabras", review: "Repasar" },
	progress: "{n} de {total} aprendidas",
	learn: {
		title: "¿Qué vamos\na aprender?",
		start: "Toca para empezar →",
		resume: "Seguir · {n} de {total} →",
		swipeHint: "Desliza para ver más",
		all: "Todas",
	},
	deck: {
		back: "Volver",
		hint: "Toca para ver · desliza para responder",
		listen: "Escuchar",
		again: "Otra vez",
		know: "La sé",
		stampKnow: "LA SÉ",
		stampAgain: "OTRA VEZ",
		stampFav: "★ FAVORITA",
		spanish: "ES",
		cognate: "Se parece al español",
		favorite: "Favorita",
		mark: "Marcar para repasar",
		listenSentence: "Toca la frase para escucharla",
		done: "¡{n} de {total}!",
		another: "Otra ronda",
		changeTopic: "Cambiar tema",
		allSeen: "¡Ya viste todas!",
		allSeenHint: "Repasa para no olvidarlas.",
		reviewDue: "Repasar {n} pendientes",
	},
	review: {
		title: "Repasar",
		due: "Pendientes",
		marked: "Marcadas",
		favorites: "Favoritas",
		emptyDue: "Nada pendiente. ¡Vuelve mañana!",
		emptyMarked: "Toca 🔖 en una tarjeta para guardarla aquí.",
		emptyFavorites: "Toca ★ o mantén presionada una tarjeta.",
		done: "¡Repaso terminado!",
		again: "Repasar otra vez",
	},
	words: {
		title: "Palabras",
		search: "Buscar en inglés o español",
		all: "Todas",
		favorites: "★",
		bonus: "Ya las sabes",
		empty: "No hay palabras aquí.",
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
	groups: {
		personas: "Personas",
		casa: "Comida y casa",
		mundo: "El mundo",
		acciones: "Acciones",
		describir: "Describir",
		clave: "Palabras clave",
	} satisfies Record<GroupId, string>,
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

export const topicName = (id: GroupId | "todas") =>
	id === "todas" ? t.learn.all : t.groups[id];
