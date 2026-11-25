import { expect, open, PASSCODE, test, unlockAle } from "./fixtures";

test.use({
	permissions: ["microphone"],
	launchOptions: {
		args: [
			"--use-fake-ui-for-media-stream",
			"--use-fake-device-for-media-stream",
		],
	},
});

test("passcode: wrong code is rejected on the spot", async ({ page }) => {
	await open(page, "/ale");
	await page.locator("input[type=password]").pressSequentially("nope");
	await page.getByRole("button", { name: "Entrar" }).click();
	await expect(page.getByText("Código incorrecto.")).toBeVisible();
	await expect(page.getByRole("button", { name: /Hablar/ })).toHaveCount(0);
});

test("passcode: caps and spaces don't matter, and it's remembered", async ({
	page,
}) => {
	await open(page, "/ale");
	await page
		.locator("input[type=password]")
		.pressSequentially(`  ${PASSCODE.toUpperCase()} `);
	await page.getByLabel("Mostrar código").check();
	await expect(page.locator("input[type=text]")).toHaveValue(
		`  ${PASSCODE.toUpperCase()} `,
	);
	await page.getByRole("button", { name: "Entrar" }).click();
	await expect(page.getByRole("button", { name: /Hablar/ })).toBeVisible();
	await page.reload();
	await expect(page.getByRole("button", { name: /Hablar/ })).toBeVisible();
});

test("mock mode is labelled", async ({ page }) => {
	await unlockAle(page);
	await expect(page.getByText(/Modo de prueba/)).toBeVisible();
});

test("typed conversation gets a reply and a new word", async ({ page }) => {
	await unlockAle(page);
	await page.getByPlaceholder("…o escribe aquí").fill("I see a butterfly");
	await page.getByRole("button", { name: "Enviar" }).click();
	await expect(page.getByText("I see a butterfly").first()).toBeVisible();
	await expect(page.getByText(/butterfly · mariposa/)).toBeVisible();
	// What she should say is shown in bold, without the quotes.
	await expect(
		page.locator("strong", { hasText: /^butterfly$/ }),
	).toBeVisible();
	// Spanish comes in italics, without the «» marks.
	await expect(page.locator("em", { hasText: /^mariposa$/ })).toBeVisible();
	await expect(page.locator("p", { hasText: "Nice!" })).not.toContainText("«");
	// The page is ready for the next turn.
	await expect(page.getByText("Toca «Hablar» para empezar")).toBeVisible({
		timeout: 15_000,
	});
	await page.getByPlaceholder("…o escribe aquí").fill("Thank you");
	await page.getByRole("button", { name: "Enviar" }).click();
	await expect(page.getByText("Thank you").first()).toBeVisible();
});

test("Ale learns her name, keeps it after reload, and can forget it", async ({
	page,
}) => {
	await unlockAle(page);
	await page.getByPlaceholder("…o escribe aquí").fill("My name is Ximena");
	await page.getByRole("button", { name: "Enviar" }).click();
	const menu = page.getByRole("button", { name: "Más opciones" });
	const forget = page.getByRole("menuitem", { name: /Olvidar «Ximena»/ });
	await expect(page.getByText("Nice to meet you, Ximena!")).toBeVisible();
	await page.reload();
	await menu.click();
	await expect(forget).toBeVisible();
	await forget.click();
	await menu.click();
	await expect(forget).toHaveCount(0);
});

test("topic suggestions: pick one, Ale gets its words, chips go away", async ({
	page,
}) => {
	await unlockAle(page);
	await expect(page.getByText("¿De qué hablamos?")).toBeVisible();
	await expect(
		page.getByRole("button", { name: /De lo que quieras/ }),
	).toBeVisible();
	// No sideways-scrolling topic row anymore.
	await expect(page.getByRole("button", { name: /Cocina|Jardín/ })).toHaveCount(
		0,
	);
	const sent = page.waitForRequest("**/api/bot/reply");
	const first = page
		.getByText("¿De qué hablamos?")
		.locator("..")
		.getByRole("button")
		.first();
	await first.click();
	const body = (await sent).postDataJSON();
	expect(body.topic).not.toBe("libre");
	expect(body.focus.length).toBeGreaterThan(0);
	await expect(page.getByText("¿De qué hablamos?")).toHaveCount(0);
	await page.getByRole("button", { name: /Pausar/ }).click();
	// The picked topic is remembered and comes first next time.
	await page.getByRole("button", { name: "Más opciones" }).click();
	await page.getByRole("menuitem", { name: /Nueva conversación/ }).click();
	await expect(page.getByText("¿De qué hablamos?")).toBeVisible();
});

test("hands-free: Ale opens the conversation, then pause stops it", async ({
	page,
}) => {
	await unlockAle(page);
	await page.getByRole("button", { name: /Hablar/ }).click();
	await expect(page.getByText(/I'm Ale|What's your name/)).toBeVisible({
		timeout: 15_000,
	});
	await expect(page.getByRole("button", { name: /Pausar/ })).toBeVisible();
	await page.getByRole("button", { name: /Pausar/ }).click();
	await expect(page.getByRole("button", { name: /Hablar/ })).toBeVisible();
});

test("a rejected saved code locks the page and the field still works", async ({
	page,
}) => {
	await page.addInitScript(() => {
		if (!sessionStorage.getItem("seeded")) {
			localStorage.setItem("iwm:bot-passcode", "old code");
			sessionStorage.setItem("seeded", "1");
		}
	});
	await open(page, "/ale");
	await page.getByRole("button", { name: /Hablar/ }).click();
	await expect(page.getByText("Código incorrecto.")).toBeVisible();
	await page.locator("input[type=password]").pressSequentially(PASSCODE);
	await page.getByRole("button", { name: "Entrar" }).click();
	await expect(page.getByRole("button", { name: /Hablar/ })).toBeVisible();
});

test.describe("API guards", () => {
	test.use({ permissions: [] });

	test("status never leaks secrets", async ({ request }) => {
		const body = await (await request.get("/api/bot/status")).text();
		expect(body).not.toContain(PASSCODE);
		expect(body).toContain('"mock":true');
	});

	test("endpoints need the passcode", async ({ request }) => {
		for (const path of ["reply", "hear", "speak", "check"]) {
			const res = await request.post(`/api/bot/${path}`, { data: {} });
			expect(res.status(), path).toBe(401);
		}
	});

	test("bad input is rejected", async ({ request }) => {
		const headers = { "x-bot-passcode": encodeURIComponent(PASSCODE) };
		const reply = await request.post("/api/bot/reply", {
			headers,
			data: { topic: "nope", history: [], latest: null },
		});
		expect(reply.status()).toBe(400);
		const hear = await request.post("/api/bot/hear", {
			headers,
			data: { audio: "x".repeat(1_600_000), caption: "" },
		});
		expect(hear.status()).toBe(400);
		const speak = await request.post("/api/bot/speak", {
			headers,
			data: { text: "x".repeat(2000) },
		});
		expect([400, 503]).toContain(speak.status());
	});
});

test("hard words: Ale gets them, and the list can practice one", async ({
	page,
}) => {
	await page.addInitScript(() => {
		localStorage.setItem(
			"iwm:hard-words",
			JSON.stringify([
				{
					word: "three",
					misses: 3,
					last: 52,
					best: 61,
					streak: 0,
					note: "la th sonó como t",
					at: 1,
				},
				{
					word: "very",
					misses: 1,
					last: 70,
					best: 70,
					streak: 0,
					note: "",
					at: 2,
				},
			]),
		);
	});
	await unlockAle(page);
	const sent = page.waitForRequest("**/api/bot/reply");
	const menu = page.getByRole("button", { name: "Más opciones" });
	await expect(menu).toContainText("2"); // badge
	await menu.click();
	await page.getByRole("menuitem", { name: /Palabras difíciles/ }).click();
	await expect(page.getByText("la th sonó como t")).toBeVisible();
	await page.getByRole("button", { name: "Practicar" }).first().click();
	const body = (await sent).postDataJSON();
	expect(body.hard.map((h: { word: string }) => h.word)).toEqual([
		"three",
		"very",
	]);
	expect(body.latest.text).toBe('Quiero practicar "three".');
	await expect(page.getByText('Quiero practicar "three".')).toBeVisible();
});

test("menu: new conversation clears the chat", async ({ page }) => {
	await unlockAle(page);
	await page.getByPlaceholder("…o escribe aquí").fill("hello");
	await page.getByRole("button", { name: "Enviar" }).click();
	await expect(page.getByText("hello").first()).toBeVisible();
	await page.getByRole("button", { name: "Más opciones" }).click();
	await page.getByRole("menuitem", { name: /Nueva conversación/ }).click();
	await expect(page.getByText("¿De qué hablamos?")).toBeVisible();
});
