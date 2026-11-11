import { createFileRoute, Outlet } from "@tanstack/react-router";

// Hidden prototypes: not linked anywhere, not indexed. Delete once a design wins.
export const Route = createFileRoute("/designs")({
	head: () => ({
		meta: [{ name: "robots", content: "noindex, nofollow" }],
		links: [
			{
				rel: "stylesheet",
				href: "https://fonts.googleapis.com/css2?family=Archivo:wght@700;900&family=Bricolage+Grotesque:wght@400;600;800&family=Caveat:wght@500;700&family=Lilita+One&display=swap",
			},
		],
	}),
	component: Outlet,
});
