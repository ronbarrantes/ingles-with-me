import { expect, open, test, unlockAle } from "./fixtures";

test.describe("small phone (320 wide)", () => {
	test.use({ viewport: { width: 320, height: 568 } });
	for (const path of ["/", "/palabras", "/repasar", "/aprender/todas"]) {
		test(`no sideways scroll on ${path}`, async ({ page }) => {
			await open(page, path);
			const overflow = await page.evaluate(
				() => document.documentElement.scrollWidth - window.innerWidth,
			);
			expect(overflow).toBeLessThanOrEqual(0);
		});
	}
	test("no sideways scroll on /ale", async ({ page }) => {
		await unlockAle(page);
		const overflow = await page.evaluate(
			() => document.documentElement.scrollWidth - window.innerWidth,
		);
		expect(overflow).toBeLessThanOrEqual(0);
	});
});

test("two quick typed messages are both kept", async ({ page }) => {
	await unlockAle(page);
	await page.route("**/api/bot/reply", async (route) => {
		await new Promise((r) => setTimeout(r, 800));
		await route.continue();
	});
	const box = page.getByPlaceholder("…o escribe aquí");
	await box.fill("first message");
	await page.getByRole("button", { name: "Enviar" }).click();
	await box.fill("second message");
	// Ale is still thinking: the button waits, and the text stays.
	await expect(page.getByRole("button", { name: "Enviar" })).toBeDisabled();
	await expect(page.getByRole("button", { name: "Enviar" })).toBeEnabled({
		timeout: 10_000,
	});
	await page.getByRole("button", { name: "Enviar" }).click();
	await expect(page.getByText("second message").first()).toBeVisible();
});

test("a late reply doesn't land in a new topic", async ({ page }) => {
	await unlockAle(page);
	await page.route("**/api/bot/reply", async (route) => {
		await new Promise((r) => setTimeout(r, 1000));
		await route.continue();
	});
	await page.getByPlaceholder("…o escribe aquí").fill("hello there");
	await page.getByRole("button", { name: "Enviar" }).click();
	await page.getByRole("button", { name: /Cocina/ }).click();
	await page.waitForTimeout(2000);
	await expect(page.getByText("¿Cómo se dice mariposa?")).toBeVisible();
	// And the new chat works right away.
	await page.getByPlaceholder("…o escribe aquí").fill("new topic");
	await page.getByRole("button", { name: "Enviar" }).click();
	await expect(page.getByText("new topic").first()).toBeVisible();
});
