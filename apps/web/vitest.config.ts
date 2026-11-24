import { defineConfig } from "vitest/config";

// Unit tests for plain logic (no browser). Run: pnpm test
export default defineConfig({
	resolve: { tsconfigPaths: true },
	test: { include: ["src/**/*.test.ts"], environment: "node" },
});
