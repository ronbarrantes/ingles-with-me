import {
	createRootRoute,
	HeadContent,
	Outlet,
	Scripts,
	useRouterState,
} from "@tanstack/react-router";
import { useEffect } from "react";
import { BottomNav } from "#/components/BottomNav";
import { t } from "#/i18n";
import { warmUpSpeech } from "#/lib/speech";
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
			{ name: "theme-color", content: "#f7f7f5" },
			{ name: "apple-mobile-web-app-capable", content: "yes" },
			{ name: "apple-mobile-web-app-title", content: t.appName },
		],
		links: [
			{ rel: "stylesheet", href: appCss },
			{ rel: "manifest", href: "/manifest.webmanifest" },
			{ rel: "icon", href: "/icon-192.png", type: "image/png" },
			{ rel: "apple-touch-icon", href: "/apple-touch-icon.png" },
			{ rel: "preconnect", href: "https://fonts.googleapis.com" },
			{
				rel: "preconnect",
				href: "https://fonts.gstatic.com",
				crossOrigin: "anonymous",
			},
			{
				rel: "stylesheet",
				href: "https://fonts.googleapis.com/css2?family=Lexend:wght@400;700&family=Young+Serif&display=swap",
			},
		],
	}),
	shellComponent: RootDocument,
	component: RootLayout,
});

function RootDocument({ children }: { children: React.ReactNode }) {
	return (
		<html lang="es">
			<head>
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

	// The /designs prototypes are full-screen and bring their own chrome.
	const path = useRouterState({ select: (s) => s.location.pathname });
	if (path.startsWith("/designs")) return <Outlet />;

	return (
		<>
			<main className="mx-auto max-w-md px-4 pt-[calc(1rem+env(safe-area-inset-top))] pb-24 md:max-w-xl md:pt-24 md:pb-12">
				<Outlet />
			</main>
			<BottomNav />
		</>
	);
}
