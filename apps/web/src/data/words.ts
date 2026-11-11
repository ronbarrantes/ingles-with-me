// The core list: ~300 words picked for how much they help explain other
// words, ordered roughly the way a child meets them (concrete things first).
// `pic` is an emoji stand-in; custom SVGs can replace it later (see Picture).

export type Pos =
	| "n"
	| "v"
	| "adj"
	| "adv"
	| "pron"
	| "prep"
	| "conj"
	| "det"
	| "num"
	| "int"
	| "phr";

export type CategoryId =
	| "personas"
	| "comida"
	| "mundo"
	| "cuerpo"
	| "casa"
	| "lugares"
	| "numeros"
	| "preguntar"
	| "acciones"
	| "describir"
	| "sentimientos"
	| "tiempo"
	| "base"
	| "trabajo"
	| "conectores"
	| "bonus";

export interface Word {
	id: string;
	en: string;
	es: string;
	pic: string;
	example: string;
	pos: Pos;
	category: CategoryId;
	/** The bigger group shown in the app; null for bonus cognates. */
	group: GroupId | null;
	cognate: boolean;
	/** Bonus cognates are browsable but don't count toward the core list. */
	bonus: boolean;
}

// [english, spanish, picture, example, part of speech, cognate?]
type Raw = [string, string, string, string, Pos, boolean?];

const raw: Record<CategoryId, Raw[]> = {
	personas: [
		["man", "hombre", "👨", "The man has a dog.", "n"],
		["woman", "mujer", "👩", "The woman is my mother.", "n"],
		["child", "niño, niña", "🧒", "The child is happy.", "n"],
		["baby", "bebé", "👶", "The baby is sleeping.", "n", true],
		["boy", "chico", "👦", "The boy can run fast.", "n"],
		["girl", "chica", "👧", "The girl has a cat.", "n"],
		["friend", "amigo, amiga", "🧑‍🤝‍🧑", "You are my friend.", "n"],
		["family", "familia", "👪", "I love my family.", "n", true],
		["mother", "madre", "👩‍👧", "My mother is a teacher.", "n"],
		["father", "padre", "👨‍👦", "My father works in a bank.", "n"],
		["brother", "hermano", "", "My brother is tall.", "n"],
		["sister", "hermana", "", "My sister lives in the city.", "n"],
		["son", "hijo", "", "Her son is five.", "n"],
		["daughter", "hija", "", "His daughter likes to read.", "n"],
		["doctor", "doctor, doctora", "🧑‍⚕️", "The doctor can help you.", "n", true],
		["teacher", "maestro, maestra", "🧑‍🏫", "The teacher says it again.", "n"],
	],
	comida: [
		["food", "comida", "🍽️", "The food is hot.", "n"],
		["water", "agua", "💧", "I want water, please.", "n"],
		["coffee", "café", "☕", "I drink coffee in the morning.", "n", true],
		["tea", "té", "🍵", "Do you want tea?", "n", true],
		["milk", "leche", "🥛", "The baby drinks milk.", "n"],
		["bread", "pan", "🍞", "I eat bread for breakfast.", "n"],
		["rice", "arroz", "🍚", "We have rice and chicken.", "n"],
		["egg", "huevo", "🥚", "I want one egg.", "n"],
		["meat", "carne", "🥩", "I don't eat meat.", "n"],
		["chicken", "pollo", "🍗", "The chicken is good.", "n"],
		["fish", "pescado, pez", "🐟", "The fish is in the water.", "n"],
		["fruit", "fruta", "🍇", "I like fruit.", "n", true],
		["banana", "plátano, banana", "🍌", "The banana is yellow.", "n", true],
		["vegetable", "verdura", "🥦", "Eat a vegetable every day.", "n", true],
		["breakfast", "desayuno", "🥞", "Breakfast is ready.", "n"],
		["lunch", "almuerzo", "🥪", "We eat lunch at one.", "n"],
		["dinner", "cena", "🍲", "Dinner is at seven.", "n"],
	],
	mundo: [
		["dog", "perro", "🐕", "The dog is big.", "n"],
		["cat", "gato", "🐈", "The cat is sleeping.", "n"],
		["bird", "pájaro", "🐦", "The bird is in the tree.", "n"],
		["animal", "animal", "🐾", "A dog is an animal.", "n", true],
		["tree", "árbol", "🌳", "The tree is very tall.", "n"],
		["flower", "flor", "🌸", "This flower is red.", "n"],
		["sun", "sol", "☀️", "The sun is hot.", "n"],
		["moon", "luna", "🌙", "I can see the moon.", "n"],
		["star", "estrella", "⭐", "The star is far.", "n"],
		["sky", "cielo", "", "The sky is blue.", "n"],
		["rain", "lluvia", "🌧️", "I don't like the rain.", "n"],
		["snow", "nieve", "❄️", "The snow is white.", "n"],
		["sea", "mar", "🌊", "The sea is big.", "n"],
		["mountain", "montaña", "⛰️", "The mountain is far.", "n", true],
		["fire", "fuego", "🔥", "The fire is hot.", "n"],
	],
	cuerpo: [
		["body", "cuerpo", "", "Water is good for the body.", "n"],
		["head", "cabeza", "👤", "My head hurts.", "n"],
		["eye", "ojo", "👁️", "Close one eye.", "n"],
		["ear", "oreja, oído", "👂", "I hear with my ear.", "n"],
		["nose", "nariz", "👃", "The dog has a cold nose.", "n"],
		["mouth", "boca", "👄", "Open your mouth.", "n"],
		["hair", "pelo", "💇", "Her hair is long.", "n"],
		["hand", "mano", "✋", "Give me your hand.", "n"],
		["arm", "brazo", "💪", "My arm is tired.", "n"],
		["leg", "pierna", "🦵", "My leg hurts.", "n"],
		["foot", "pie", "🦶", "My foot is cold.", "n"],
		["heart", "corazón", "❤️", "My heart is happy.", "n"],
		["pain", "dolor", "🤕", "I have pain here.", "n"],
	],
	casa: [
		["house", "casa", "🏠", "My house is small.", "n"],
		["room", "cuarto, habitación", "🛋️", "This room is cold.", "n"],
		["door", "puerta", "🚪", "Open the door, please.", "n"],
		["window", "ventana", "🪟", "Close the window.", "n"],
		["bed", "cama", "🛏️", "The bed is big.", "n"],
		["table", "mesa", "", "The food is on the table.", "n"],
		["chair", "silla", "🪑", "Sit on the chair.", "n"],
		["kitchen", "cocina", "🍳", "We cook in the kitchen.", "n"],
		["bathroom", "baño", "🚽", "Where is the bathroom?", "n"],
		["key", "llave", "🔑", "I can't find my key.", "n"],
		["phone", "teléfono", "📱", "Call me on the phone.", "n", true],
		["book", "libro", "📚", "I read a book every week.", "n"],
		["clothes", "ropa", "👕", "Wash the clothes.", "n"],
		["shoe", "zapato", "👟", "Where is my other shoe?", "n"],
		["bag", "bolsa", "👜", "The key is in my bag.", "n"],
	],
	lugares: [
		["city", "ciudad", "🏙️", "I live in a big city.", "n"],
		["street", "calle", "🛣️", "The store is on this street.", "n"],
		["store", "tienda", "🏪", "I go to the store.", "n"],
		["school", "escuela", "🏫", "The children go to school.", "n"],
		["hospital", "hospital", "🏥", "She works in a hospital.", "n", true],
		["park", "parque", "🏞️", "We walk in the park.", "n", true],
		[
			"restaurant",
			"restaurante",
			"🧑‍🍳",
			"This restaurant is good.",
			"n",
			true,
		],
		["bank", "banco", "🏦", "The bank is near.", "n", true],
		["country", "país", "🌎", "What country are you from?", "n"],
		["bus", "autobús", "🚌", "I take the bus to work.", "n", true],
		["car", "carro, coche", "🚗", "My car is old.", "n"],
		["train", "tren", "🚆", "The train is late.", "n", true],
		["left", "izquierda", "⬅️", "Go left here.", "n"],
		["right", "derecha", "➡️", "The bank is on the right.", "n"],
	],
	numeros: [
		["zero", "cero", "0️⃣", "I have zero money.", "num", true],
		["one", "uno", "1️⃣", "I have one brother.", "num"],
		["two", "dos", "2️⃣", "I have two cats.", "num"],
		["three", "tres", "3️⃣", "We have three children.", "num"],
		["four", "cuatro", "4️⃣", "The table has four legs.", "num"],
		["five", "cinco", "5️⃣", "A hand has five fingers.", "num"],
		["six", "seis", "6️⃣", "I wake up at six.", "num"],
		["seven", "siete", "7️⃣", "A week has seven days.", "num"],
		["eight", "ocho", "8️⃣", "I work eight hours.", "num"],
		["nine", "nueve", "9️⃣", "The store opens at nine.", "num"],
		["ten", "diez", "🔟", "I have ten dollars.", "num"],
		["color", "color", "🎨", "What color do you like?", "n", true],
		["red", "rojo", "🔴", "The apple is red.", "adj"],
		["blue", "azul", "🔵", "The sky is blue.", "adj"],
		["green", "verde", "🟢", "The tree is green.", "adj"],
		["yellow", "amarillo", "🟡", "The banana is yellow.", "adj"],
		["black", "negro", "⚫", "My cat is black.", "adj"],
		["white", "blanco", "⚪", "The snow is white.", "adj"],
	],
	preguntar: [
		["what", "qué", "❓", "What is this?", "pron"],
		["who", "quién", "", "Who is that man?", "pron"],
		["where", "dónde", "", "Where is the bathroom?", "adv"],
		["when", "cuándo", "", "When do you work?", "adv"],
		["why", "por qué", "", "Why are you sad?", "adv"],
		["how", "cómo", "", "How do you say this in English?", "adv"],
		["which", "cuál", "", "Which one do you want?", "pron"],
		["how much", "cuánto", "", "How much is this?", "phr"],
		["question", "pregunta", "🙋", "Can I ask a question?", "n"],
		["ask", "preguntar", "", "Ask the teacher.", "v"],
		["answer", "respuesta, responder", "💬", "What is the answer?", "n"],
		["mean", "significar", "", "What does this word mean?", "v"],
		["say", "decir", "", "How do you say it?", "v"],
		["word", "palabra", "🔤", "I know this word.", "n"],
		["again", "otra vez", "🔁", "Say it again, please.", "adv"],
		["slowly", "despacio", "", "Please say it slowly.", "adv"],
		["please", "por favor", "🙏", "Water, please.", "int"],
		["thank you", "gracias", "", "Thank you for the help.", "phr"],
		["sorry", "perdón, lo siento", "", "Sorry, I don't understand.", "int"],
		["yes", "sí", "✔️", "Yes, I want it.", "int"],
		["no", "no", "✖️", "No, thank you.", "int"],
		["understand", "entender", "", "I understand you.", "v"],
		["know", "saber, conocer", "", "I know this word.", "v"],
		["example", "ejemplo", "", "Can you give me an example?", "n", true],
		["same", "mismo, igual", "🟰", "We have the same name.", "adj"],
		["different", "diferente", "", "This one is different.", "adj", true],
		["help", "ayuda, ayudar", "🆘", "Can you help me?", "v"],
	],
	acciones: [
		["go", "ir", "🚶", "I go to work every day.", "v"],
		["come", "venir", "", "Come here, please.", "v"],
		["walk", "caminar", "👣", "We walk in the park.", "v"],
		["run", "correr", "🏃", "The dog can run fast.", "v"],
		["sit", "sentarse", "", "Please sit here.", "v"],
		["stand", "estar de pie", "🧍", "Stand up, please.", "v"],
		["sleep", "dormir", "😴", "The baby needs to sleep.", "v"],
		["wake up", "despertarse", "⏰", "I wake up at six.", "v"],
		["eat", "comer", "🍴", "Let's eat now.", "v"],
		["drink", "beber, tomar", "🥤", "Drink a lot of water.", "v"],
		["cook", "cocinar", "🧑‍🍳", "I cook dinner every day.", "v"],
		["talk", "hablar", "🗣️", "Can we talk?", "v"],
		["listen", "escuchar", "🎧", "Listen to the teacher.", "v"],
		["look", "mirar", "🔍", "Look at the sky.", "v"],
		["read", "leer", "📖", "I read before I sleep.", "v"],
		["write", "escribir", "✍️", "Write your name here.", "v"],
		["open", "abrir", "", "Open the window, please.", "v"],
		["close", "cerrar", "", "Close the door.", "v"],
		["give", "dar", "🎁", "Give me the key, please.", "v"],
		["take", "tomar, llevar", "", "Take the bus.", "v"],
		["buy", "comprar", "🛒", "I buy bread at the store.", "v"],
		["pay", "pagar", "💳", "Can I pay here?", "v"],
		["work", "trabajar", "🛠️", "I work in a restaurant.", "v"],
		["play", "jugar", "⚽", "The children play in the park.", "v"],
		["learn", "aprender", "", "I learn a new word every day.", "v"],
		["study", "estudiar", "📝", "I study English at night.", "v", true],
		["live", "vivir", "", "I live in a small house.", "v"],
		["wait", "esperar", "⏳", "Wait for me, please.", "v"],
		["call", "llamar", "📞", "Call me later.", "v"],
		["find", "encontrar", "", "I can't find my phone.", "v"],
		["put", "poner", "", "Put the book on the table.", "v"],
		["start", "empezar", "", "We start at nine.", "v"],
		["stop", "parar", "🛑", "Stop the car here.", "v"],
		["clean", "limpiar", "🧹", "I clean the house on Sunday.", "v"],
		["drive", "manejar", "🚘", "I drive to work.", "v"],
	],
	describir: [
		["good", "bueno", "👍", "This is good food.", "adj"],
		["bad", "malo", "👎", "The rain is bad today.", "adj"],
		["big", "grande", "🐋", "The house is big.", "adj"],
		["small", "pequeño", "🐜", "The cat is small.", "adj"],
		["hot", "caliente", "♨️", "The coffee is hot.", "adj"],
		["cold", "frío", "🥶", "The water is cold.", "adj"],
		["new", "nuevo", "✨", "I have a new phone.", "adj"],
		["old", "viejo", "👴", "My car is old.", "adj"],
		["young", "joven", "", "She is young.", "adj"],
		["long", "largo", "", "Her hair is long.", "adj"],
		["short", "corto, bajo", "", "The day is short.", "adj"],
		["fast", "rápido", "⚡", "The train is fast.", "adj"],
		["slow", "lento", "🐢", "The bus is slow.", "adj"],
		["easy", "fácil", "", "This word is easy.", "adj"],
		["hard", "difícil, duro", "", "English is not hard.", "adj"],
		["beautiful", "bonito, hermoso", "", "The flower is beautiful.", "adj"],
		["full", "lleno", "", "The bus is full.", "adj"],
		["empty", "vacío", "", "The room is empty.", "adj"],
		["correct", "correcto", "✅", "Your answer is correct.", "adj", true],
		["wrong", "incorrecto, mal", "❌", "This answer is wrong.", "adj"],
		["expensive", "caro", "💎", "This store is expensive.", "adj"],
	],
	sentimientos: [
		["happy", "feliz", "😊", "I am happy today.", "adj"],
		["sad", "triste", "😢", "Why are you sad?", "adj"],
		["angry", "enojado", "😠", "My boss is angry.", "adj"],
		["tired", "cansado", "😩", "I am tired after work.", "adj"],
		[
			"afraid",
			"asustado, tener miedo",
			"😨",
			"The child is afraid of the dog.",
			"adj",
		],
		["sick", "enfermo", "🤒", "I am sick today.", "adj"],
		["hungry", "tener hambre", "😋", "I am hungry. Let's eat.", "adj"],
		["worried", "preocupado", "😟", "She is worried about her son.", "adj"],
		["fine", "bien", "🙂", "I am fine, thank you.", "adj"],
		["love", "amor, amar", "🥰", "I love my family.", "v"],
		["feel", "sentir", "", "How do you feel?", "v"],
	],
	tiempo: [
		["day", "día", "📅", "Have a good day.", "n"],
		["night", "noche", "🌃", "I study at night.", "n"],
		["morning", "mañana (la)", "🌅", "I drink coffee in the morning.", "n"],
		["week", "semana", "🗓️", "I work five days a week.", "n"],
		["month", "mes", "", "My birthday is this month.", "n"],
		["year", "año", "", "This year is good.", "n"],
		["today", "hoy", "", "Today is a good day.", "adv"],
		["tomorrow", "mañana", "", "See you tomorrow.", "adv"],
		["yesterday", "ayer", "", "I was sick yesterday.", "adv"],
		["now", "ahora", "", "I need it now.", "adv"],
		["hour", "hora", "🕐", "Wait one hour.", "n"],
		["minute", "minuto", "⏱️", "Wait a minute, please.", "n", true],
		["always", "siempre", "", "I always drink coffee.", "adv"],
		["never", "nunca", "", "I never eat meat.", "adv"],
		["sometimes", "a veces", "", "Sometimes I walk to work.", "adv"],
		["late", "tarde", "", "The bus is late.", "adj"],
		["later", "luego, más tarde", "", "Call me later.", "adv"],
	],
	base: [
		["person", "persona", "🧑", "She is a good person.", "n", true],
		["people", "gente", "👥", "Many people live here.", "n"],
		["thing", "cosa", "📦", "What is this thing?", "n"],
		["place", "lugar", "📍", "This is a good place.", "n"],
		["time", "tiempo, hora", "🕰️", "What time is it?", "n"],
		["part", "parte", "🧩", "This is the best part.", "n", true],
		["kind", "tipo, clase", "", "What kind of food do you like?", "n"],
		["name", "nombre", "📛", "My name is Ana.", "n"],
		["be", "ser, estar", "", "I want to be a teacher.", "v"],
		["have", "tener", "", "I have a dog.", "v"],
		["do", "hacer", "", "What do you do?", "v"],
		["make", "hacer, preparar", "", "I make bread at home.", "v"],
		["use", "usar", "", "Can I use your phone?", "v", true],
		["can", "poder", "", "I can help you.", "v"],
		["want", "querer", "", "I want to learn English.", "v"],
		["need", "necesitar", "", "I need help.", "v", true],
		["like", "gustar", "", "I like coffee.", "v"],
		["think", "pensar, creer", "🤔", "I think it is good.", "v"],
		["see", "ver", "👀", "I can see the sea.", "v"],
		["hear", "oír", "", "Can you hear me?", "v"],
		["more", "más", "➕", "I want more water.", "adv"],
		["less", "menos", "➖", "Eat less meat.", "adv"],
		["all", "todo, todos", "", "All the children are here.", "det"],
		["some", "algo de, algunos", "", "I want some water.", "det"],
		["many", "muchos", "", "Many people are here.", "det"],
		["other", "otro", "", "Where is the other shoe?", "det"],
		["very", "muy", "", "It is very cold.", "adv"],
		["here", "aquí", "👇", "Come here.", "adv"],
		["there", "allí, allá", "👉", "The bank is there.", "adv"],
		["up", "arriba", "⬆️", "Look up at the sky.", "adv"],
		["down", "abajo", "⬇️", "Sit down, please.", "adv"],
		["inside", "dentro", "", "The cat is inside.", "adv"],
		["outside", "fuera, afuera", "", "The children play outside.", "adv"],
		["before", "antes", "", "Wash your hands before you eat.", "adv"],
		["after", "después", "", "I sleep after dinner.", "adv"],
		["near", "cerca", "", "The store is near.", "adv"],
		["far", "lejos", "", "The school is far.", "adv"],
		["true", "verdad, cierto", "", "Is it true?", "adj"],
		["maybe", "quizás, tal vez", "🤷", "Maybe tomorrow.", "adv"],
		["only", "solo", "", "I have only one brother.", "adv"],
		["also", "también", "", "I also like tea.", "adv"],
	],
	trabajo: [
		["job", "trabajo, empleo", "💼", "I have a new job.", "n"],
		["money", "dinero", "💵", "I need more money.", "n"],
		["price", "precio", "🏷️", "What is the price?", "n", true],
		["boss", "jefe, jefa", "", "My boss is very good.", "n"],
		["computer", "computadora", "💻", "I work on a computer.", "n", true],
		["paper", "papel", "📄", "Write it on this paper.", "n", true],
		["number", "número", "🔢", "What is your phone number?", "n", true],
		["problem", "problema", "⚠️", "No problem!", "n", true],
		["idea", "idea", "💡", "That is a good idea.", "n", true],
	],
	conectores: [
		["I", "yo", "", "I am happy.", "pron"],
		["you", "tú, usted", "", "You are my friend.", "pron"],
		["he", "él", "", "He is my brother.", "pron"],
		["she", "ella", "", "She is my sister.", "pron"],
		["it", "eso (cosa)", "", "It is cold.", "pron"],
		["we", "nosotros", "", "We live here.", "pron"],
		["they", "ellos, ellas", "", "They are my friends.", "pron"],
		["me", "me, mí", "", "Help me, please.", "pron"],
		["my", "mi", "", "This is my house.", "det"],
		["your", "tu, su (de usted)", "", "What is your name?", "det"],
		["his", "su (de él)", "", "This is his car.", "det"],
		["her", "su (de ella), la", "", "This is her book.", "det"],
		["this", "este, esto", "", "This is my dog.", "det"],
		["that", "ese, eso", "", "That is my house.", "det"],
		["the", "el, la, los, las", "", "The dog is big.", "det"],
		["a", "un, una", "", "I have a cat.", "det"],
		["and", "y", "", "I have a dog and a cat.", "conj"],
		["or", "o", "", "Tea or coffee?", "conj"],
		["but", "pero", "", "I am tired, but happy.", "conj"],
		["because", "porque", "", "I eat because I am hungry.", "conj"],
		["if", "si", "", "Call me if you need help.", "conj"],
		["to", "a, para", "", "I go to work.", "prep"],
		["for", "para, por", "", "This is for you.", "prep"],
		["with", "con", "", "Coffee with milk, please.", "prep"],
		["without", "sin", "", "Coffee without sugar.", "prep"],
		["in", "en, dentro de", "", "The cat is in the house.", "prep"],
		["on", "sobre, en", "", "The book is on the table.", "prep"],
		["at", "en (lugar u hora)", "", "I am at work.", "prep"],
		["from", "de, desde", "", "I am from Mexico.", "prep"],
		["of", "de", "", "A cup of coffee.", "prep"],
		["under", "debajo de", "", "The cat is under the bed.", "prep"],
	],
	// Spanish speakers already know these: they look and mean almost the same.
	bonus: [
		["chocolate", "chocolate", "🍫", "I love chocolate.", "n", true],
		["music", "música", "🎵", "I like this music.", "n", true],
		["radio", "radio", "📻", "Turn on the radio.", "n", true],
		["television", "televisión", "📺", "The television is on.", "n", true],
		["hotel", "hotel", "🏨", "The hotel is near.", "n", true],
		["taxi", "taxi", "🚕", "Call a taxi, please.", "n", true],
		["pizza", "pizza", "🍕", "Pizza for dinner?", "n", true],
		["piano", "piano", "🎹", "She plays the piano.", "n", true],
		["guitar", "guitarra", "🎸", "He plays the guitar.", "n", true],
		["tomato", "tomate", "🍅", "The tomato is red.", "n", true],
		["potato", "papa, patata", "🥔", "I like potato.", "n", true],
		["lemon", "limón", "🍋", "Tea with lemon.", "n", true],
		["rose", "rosa", "🌹", "A red rose.", "n", true],
		["elephant", "elefante", "🐘", "The elephant is big.", "n", true],
		["lion", "león", "🦁", "The lion is an animal.", "n", true],
		["tiger", "tigre", "🐯", "The tiger is fast.", "n", true],
		["giraffe", "jirafa", "🦒", "The giraffe is tall.", "n", true],
		["important", "importante", "", "This is important.", "adj", true],
		["possible", "posible", "", "Is it possible?", "adj", true],
		["normal", "normal", "", "It is normal.", "adj", true],
		["family", "familia", "👪", "My family is big.", "n", true],
		["moment", "momento", "", "One moment, please.", "n", true],
		["telephone", "teléfono", "☎️", "Where is the telephone?", "n", true],
		[
			"university",
			"universidad",
			"🎓",
			"She studies at the university.",
			"n",
			true,
		],
	],
};

export const CATEGORY_ORDER: CategoryId[] = [
	"personas",
	"comida",
	"mundo",
	"cuerpo",
	"casa",
	"lugares",
	"numeros",
	"preguntar",
	"acciones",
	"describir",
	"sentimientos",
	"tiempo",
	"base",
	"trabajo",
	"conectores",
	"bonus",
];

/** The six groups the app shows; each bundles a few categories. */
export type GroupId =
	| "personas"
	| "casa"
	| "mundo"
	| "acciones"
	| "describir"
	| "clave";

export const GROUPS: { id: GroupId; categories: CategoryId[] }[] = [
	{ id: "personas", categories: ["personas", "cuerpo", "sentimientos"] },
	{ id: "casa", categories: ["comida", "casa"] },
	{ id: "mundo", categories: ["lugares", "mundo", "trabajo"] },
	{ id: "acciones", categories: ["acciones"] },
	{ id: "describir", categories: ["describir", "numeros", "tiempo"] },
	{ id: "clave", categories: ["preguntar", "base", "conectores"] },
];

const groupOf = (c: CategoryId): GroupId | null =>
	GROUPS.find((g) => g.categories.includes(c))?.id ?? null;

const slug = (s: string) => s.toLowerCase().replace(/\s+/g, "-");

const all: Word[] = [];
const seen = new Set<string>();
for (const category of CATEGORY_ORDER) {
	const bonus = category === "bonus";
	for (const [en, es, pic, example, pos, cognate] of raw[category]) {
		// Bonus cognates that already appear in the core list are skipped.
		if (seen.has(slug(en))) continue;
		seen.add(slug(en));
		all.push({
			id: slug(en),
			en,
			es,
			pic,
			example,
			pos,
			category,
			group: groupOf(category),
			cognate: Boolean(cognate),
			bonus,
		});
	}
}

/** Every word, core first (in learning order), then bonus cognates. */
export const ALL_WORDS: readonly Word[] = all;
/** The core list that counts toward progress. */
export const CORE_WORDS: readonly Word[] = all.filter((w) => !w.bonus);
export const WORDS_BY_ID: ReadonlyMap<string, Word> = new Map(
	all.map((w) => [w.id, w]),
);
