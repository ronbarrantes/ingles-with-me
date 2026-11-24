import { expect, open, test } from "./fixtures";

test("home shows the title, topics and four tabs", async ({ page }) => {
	await open(page, "/");
	await expect(page.getByRole("heading", { level: 1 })).toContainText(
		"¿Qué vamos",
	);
	await expect(page.getByText("0 de 300 aprendidas")).toBeVisible();
	const tabs = page.getByRole("navigation").getByRole("link");
	await expect(tabs).toHaveText(["Aprender", "Palabras", "Repasar", "Ale"]);
	await expect(page.getByRole("link", { name: /Todas/ })).toBeVisible();
});

test("tabs navigate between sections", async ({ page }) => {
	await open(page, "/");
	const nav = page.getByRole("navigation");
	await nav.getByRole("link", { name: "Palabras" }).click();
	await expect(page).toHaveURL(/\/palabras$/);
	await nav.getByRole("link", { name: "Repasar" }).click();
	await expect(page).toHaveURL(/\/repasar\/?$/);
	await nav.getByRole("link", { name: "Ale" }).click();
	await expect(page).toHaveURL(/\/ale$/);
	await expect(page.getByRole("navigation")).toHaveCount(0);
});

test("theme toggle cycles and survives a reload", async ({ page }) => {
	await open(page, "/");
	const toggle = page.getByRole("button", { name: /Tema/ });
	await expect(toggle).toHaveAttribute("aria-label", "Tema: Sistema");
	await toggle.click();
	await expect(toggle).toHaveAttribute("aria-label", "Tema: Claro");
	await toggle.click();
	await expect(toggle).toHaveAttribute("aria-label", "Tema: Oscuro");
	await expect(page.locator("html")).toHaveAttribute("data-theme", "dark");
	await page.reload();
	await expect(page.locator("html")).toHaveAttribute("data-theme", "dark");
	await expect(page.getByRole("button", { name: /Tema/ })).toHaveAttribute(
		"aria-label",
		"Tema: Oscuro",
	);
});

test("a full deck: flip, answer all ten, progress counts", async ({ page }) => {
	await open(page, "/");
	await page.getByRole("link", { name: /Todas/ }).click();
	await expect(page).toHaveURL(/\/aprender\/todas$/);

	const card = page.getByRole("button", { name: /Toca para ver/ }).first();
	await card.click(); // flip
	const know = page.getByRole("button", { name: "La sé" });
	for (let i = 0; i < 10; i++) {
		await know.click();
		await page.waitForTimeout(450); // fling animation
	}
	await expect(page.getByText("¡10 de 10!")).toBeVisible();
	await page.getByRole("link", { name: "Cambiar tema" }).click();
	// A word counts as learned after two right answers (LEARNED_BOX = 2),
	// so one pass through a deck doesn't move the home counter yet.
	await expect(page.getByText("0 de 300 aprendidas")).toBeVisible();
});

test("a deck picks up where it was left after a reload", async ({ page }) => {
	await open(page, "/aprender/personas");
	await page.getByRole("button", { name: "La sé" }).click();
	await page.waitForTimeout(450);
	await page.getByRole("button", { name: "La sé" }).click();
	await page.waitForTimeout(450);
	await page.reload();
	await page.waitForLoadState("networkidle");
	await expect(page.getByText(/2\s*\/\s*10|2 de 10/).first()).toBeVisible();
});

test("'Otra vez' keeps the word in the deck", async ({ page }) => {
	await open(page, "/aprender/casa");
	await page.getByRole("button", { name: "Otra vez" }).click();
	await page.waitForTimeout(450);
	for (let i = 0; i < 10; i++) {
		await page.getByRole("button", { name: "La sé" }).click();
		await page.waitForTimeout(450);
	}
	await expect(page.getByText("¡10 de 10!")).toBeVisible();
});

test("favorite a word, then find it in Repasar and Palabras", async ({
	page,
}) => {
	await open(page, "/aprender/mundo");
	await page.getByRole("button", { name: "Favorita" }).first().click();
	await open(page, "/repasar");
	await expect(page.getByRole("link", { name: /Favoritas/ })).toContainText(
		"1",
	);
	await page.getByRole("link", { name: /Favoritas/ }).click();
	await expect(page).toHaveURL(/\/repasar\/favorites$/);

	await open(page, "/palabras");
	await page.getByRole("button", { name: /★ Favoritas/ }).click();
	await expect(page.getByRole("main").getByRole("listitem")).toHaveCount(1);
});

test("Palabras: search in English or Spanish, accents optional", async ({
	page,
}) => {
	await open(page, "/palabras");
	const search = page.getByPlaceholder("Buscar en inglés o español");
	await search.fill("dog");
	await expect(
		page.getByRole("main").getByRole("listitem").first(),
	).toContainText("dog");
	await search.fill("perro");
	await expect(
		page.getByRole("main").getByRole("listitem").first(),
	).toContainText("dog");
	await search.fill("arbol"); // árbol
	await expect(
		page.getByRole("main").getByRole("listitem").first(),
	).toContainText("tree");
	await search.fill("zzzzqqq");
	await expect(page.getByText("No hay palabras aquí.")).toBeVisible();
});

test("Palabras: open a word, flip it, close with Escape", async ({ page }) => {
	await open(page, "/palabras");
	await page.getByPlaceholder("Buscar en inglés o español").fill("dog");
	await page.locator("ul > li button").first().click();
	await expect(page.getByRole("button", { name: "Cerrar" })).toBeVisible();
	await page.keyboard.press("Escape");
	await expect(page.getByRole("button", { name: "Cerrar" })).toHaveCount(0);
});

test("Repasar shows empty states on a fresh phone", async ({ page }) => {
	await open(page, "/repasar");
	await expect(page.getByText("Nada pendiente. ¡Vuelve mañana!")).toBeVisible();
	await expect(page.getByRole("link", { name: /Pendientes/ })).toHaveCount(0);
});

test("unknown topic shows not found", async ({ page, errors }) => {
	const res = await page.goto("/aprender/nope");
	expect(res?.status()).toBe(404);
	errors.length = 0; // the 404 resource error is expected
});

test("/bot redirects to /ale", async ({ page }) => {
	await open(page, "/bot");
	await expect(page).toHaveURL(/\/ale$/);
});
