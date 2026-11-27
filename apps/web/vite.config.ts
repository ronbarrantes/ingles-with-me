import tailwindcss from "@tailwindcss/vite";

import { tanstackStart } from "@tanstack/react-start/plugin/vite";

import viteReact from "@vitejs/plugin-react";
import { nitro } from "nitro/vite";
import { defineConfig } from "vite";

const config = defineConfig({
	resolve: { tsconfigPaths: true },
	plugins: [
		nitro({
			// Same harmless "use client" notice, in Nitro's server bundle.
			rolldownConfig: {
				onwarn(warning, warn) {
					if (warning.code === "MODULE_LEVEL_DIRECTIVE") return;
					warn(warning);
				},
			},
		}),
		tailwindcss(),
		tanstackStart(),
		viteReact(),
	],
	build: {
		rolldownOptions: {
			onwarn(warning, warn) {
				// TanStack Router marks files "use client" (a React Server Components
				// hint we don't use); harmless, just noisy.
				if (warning.code === "MODULE_LEVEL_DIRECTIVE") return;
				warn(warning);
			},
		},
	},
});

export default config;
