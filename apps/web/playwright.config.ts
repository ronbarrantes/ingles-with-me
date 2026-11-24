import { defineConfig, devices } from "@playwright/test";

// End-to-end tests against a production build, with fake AI (BOT_MOCK=1),
// so they cost nothing. Run: pnpm test:e2e
const PORT = 4173;

export default defineConfig({
	testDir: "e2e",
	fullyParallel: true,
	retries: 0,
	reporter: [["list"]],
	use: {
		baseURL: `http://localhost:${PORT}`,
		...devices["iPhone 13"],
		// Chromium stands in for Safari here; iPhone layout and touch still apply.
		browserName: "chromium",
		trace: "off",
	},
	webServer: {
		command: `pnpm build && node .output/server/index.mjs`,
		url: `http://localhost:${PORT}/api/bot/status`,
		reuseExistingServer: !process.env.CI,
		timeout: 180_000,
		env: {
			PORT: String(PORT),
			BOT_MOCK: "1",
			BOT_PASSCODE: "Mariposa 2026",
		},
	},
});
