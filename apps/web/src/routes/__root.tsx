import {
	createRootRoute,
	HeadContent,
	Outlet,
	Scripts,
	useRouterState,
} from "@tanstack/react-router";
import { useEffect } from "react";
import { isDeckPath, TabBar } from "#/components/TabBar";
import { t } from "#/i18n";
import { warmUpSpeech } from "#/lib/speech";
import { THEME_SCRIPT } from "#/lib/theme";
import appCss from "../styles.css?url";

export const Route = createRootRoute({
	head: () => ({
		meta: [
			{ charSet: "utf-8" },
			{
				name: "viewport",
				content: "width=device-width, initial-scale=1, viewport-fit=cover",
			},
			{ title: t.appName },
			{
				name: "description",
				content: "Aprende inglés con dibujos, como un niño.",
			},
			{
				name: "theme-color",
				content: "#f6f4ef",
				media: "(prefers-color-scheme: light)",
			},
			{
				name: "theme-color",
				content: "#141414",
				media: "(prefers-color-scheme: dark)",
			},
			// Home-screen app: runs full screen with its own name; status bar keeps the default style.
			{ name: "apple-mobile-web-app-capable", content: "yes" },
			{ name: "mobile-web-app-capable", content: "yes" },
			{ name: "apple-mobile-web-app-title", content: "Inglés" },
			{ name: "apple-mobile-web-app-status-bar-style", content: "default" },
			{ name: "application-name", content: "Inglés" },
			{ name: "format-detection", content: "telephone=no" },
		],
		links: [
			{ rel: "stylesheet", href: appCss },
			{ rel: "manifest", href: "/manifest.webmanifest" },
			{
				rel: "icon",
				href: "/favicon-32.png",
				type: "image/png",
				sizes: "32x32",
			},
			{
				rel: "icon",
				href: "/icon-192.png",
				type: "image/png",
				sizes: "192x192",
			},
			{
				rel: "apple-touch-icon",
				href: "/apple-touch-icon.png",
				sizes: "180x180",
			},
			{ rel: "preconnect", href: "https://fonts.googleapis.com" },
			{
				rel: "preconnect",
				href: "https://fonts.gstatic.com",
				crossOrigin: "anonymous",
			},
			{
				rel: "stylesheet",
				href: "https://fonts.googleapis.com/css2?family=Bricolage+Grotesque:opsz,wght@12..96,400;12..96,600;12..96,800&display=swap",
			},
		],
	}),
	shellComponent: RootDocument,
	component: RootLayout,
});

function RootDocument({ children }: { children: React.ReactNode }) {
	return (
		<html lang="es" suppressHydrationWarning>
			<head>
				{/* Apply the saved theme before the first paint (no flash). */}
				<script
					// biome-ignore lint/security/noDangerouslySetInnerHtml: static inline script
					dangerouslySetInnerHTML={{ __html: THEME_SCRIPT }}
				/>
				<HeadContent />
			</head>
			<body>
				{children}
				<Scripts />
			</body>
		</html>
	);
}

function RootLayout() {
	useEffect(() => {
		window.addEventListener("pointerdown", warmUpSpeech, { once: true });
		return () => window.removeEventListener("pointerdown", warmUpSpeech);
	}, []);

	useEffect(() => {
		if (import.meta.env.PROD && "serviceWorker" in navigator) {
			navigator.serviceWorker.register("/sw.js").catch(() => {});
		}
	}, []);

	const path = useRouterState({ select: (s) => s.location.pathname });
	const deck = isDeckPath(path);

	return (
		<>
			<main className={`mx-auto max-w-md ${deck ? "" : "pb-24"}`}>
				<Outlet />
			</main>
			{!deck && <TabBar />}
		</>
	);
}
