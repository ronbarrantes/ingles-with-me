// Convex, from our server only. CONVEX_URL is the deployment URL and
// CONVEX_APP_SECRET must match APP_SECRET in Convex (the Vercel build sets it).

import { ConvexHttpClient } from "convex/browser";
import { api } from "../../convex/_generated/api";

const url = () => process.env.CONVEX_URL || process.env.VITE_CONVEX_URL;
const secret = () => process.env.CONVEX_APP_SECRET ?? "";

export const dbReady = () => Boolean(url() && secret());

let client: ConvexHttpClient | undefined;
const db = () => {
	client ??= new ConvexHttpClient(url() as string);
	return client;
};

export const getProfile = (deviceId: string) =>
	db().query(api.profiles.get, { secret: secret(), deviceId });

export const saveProfile = (
	deviceId: string,
	patch: {
		learner?: { name: string } | null;
		hard?: unknown[];
		interests?: unknown;
	},
) => db().mutation(api.profiles.save, { secret: secret(), deviceId, ...patch });

export const deleteProfile = (deviceId: string) =>
	db().mutation(api.profiles.remove, { secret: secret(), deviceId });
