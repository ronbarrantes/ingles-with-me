import { createFileRoute, redirect } from "@tanstack/react-router";

// The teacher's page moved to /ale; keep old links working.
export const Route = createFileRoute("/bot")({
	beforeLoad: () => {
		throw redirect({ to: "/ale", replace: true });
	},
});
