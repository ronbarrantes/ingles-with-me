import { test as base, expect, type Page } from "@playwright/test";

export const PASSCODE = "Mariposa 2026";

/** Every test fails on page errors, React warnings or hydration mismatches. */
export const test = base.extend<{ errors: string[] }>({
	errors: [
		async ({ page }, use) => {
			const errors: string[] = [];
			page.on("pageerror", (e) => errors.push(`pageerror: ${e.message}`));
			page.on("console", (m) => {
				if (m.type() === "error" && !/Failed to load resource/.test(m.text()))
					errors.push(`console: ${m.text()}`);
			});
			await use(errors);
			expect(errors, "no errors in the browser").toEqual([]);
		},
		{ auto: true },
	],
});

export { expect };

/** Load a page and wait until React has hydrated (buttons work). */
export async function open(page: Page, path: string) {
	await page.goto(path);
	await page.waitForLoadState("networkidle");
}

export async function unlockAle(page: Page) {
	await open(page, "/ale");
	await page.locator("input[type=password]").pressSequentially(PASSCODE);
	await page.getByRole("button", { name: "Entrar" }).click();
	await expect(page.getByRole("button", { name: /Hablar/ })).toBeVisible();
}
